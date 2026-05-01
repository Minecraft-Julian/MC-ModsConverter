/**
 * Ollama Client — Wraps the Ollama HTTP API for tool-calling based mod conversion.
 * Connects to a remote (or local) Ollama instance via OLLAMA_URL env var.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b';

/**
 * Send a chat completion request with optional tool definitions.
 * Supports streaming for real-time status updates.
 */
export async function chat(messages, tools = [], options = {}) {
    const model = options.model || DEFAULT_MODEL;
    const body = {
        model,
        messages,
        stream: false,
        options: {
            temperature: options.temperature ?? 0.2,
            num_predict: options.maxTokens ?? 4096,
        }
    };

    if (tools.length > 0) {
        body.tools = tools;
    }

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options.signal
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    return await response.json();
}

/**
 * Stream a chat completion, yielding partial responses for real-time UI updates.
 * Yields objects like: { type: 'token', content: '...' } or { type: 'tool_call', ... }
 */
export async function* chatStream(messages, tools = [], options = {}) {
    const model = options.model || DEFAULT_MODEL;
    const body = {
        model,
        messages,
        stream: true,
        options: {
            temperature: options.temperature ?? 0.2,
            num_predict: options.maxTokens ?? 4096,
        }
    };

    if (tools.length > 0) {
        body.tools = tools;
    }

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options.signal
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);

                if (parsed.message?.tool_calls) {
                    for (const tc of parsed.message.tool_calls) {
                        yield {
                            type: 'tool_call',
                            name: tc.function?.name,
                            arguments: tc.function?.arguments
                        };
                    }
                }

                if (parsed.message?.content) {
                    yield {
                        type: 'token',
                        content: parsed.message.content
                    };
                }

                if (parsed.done) {
                    yield {
                        type: 'done',
                        totalDuration: parsed.total_duration,
                        evalCount: parsed.eval_count
                    };
                }
            } catch {
                // Skip malformed JSON lines
            }
        }
    }
}

/**
 * Run a full tool-calling loop: send messages → receive tool calls → execute → repeat.
 * Returns the final assistant message and all tool results.
 */
export async function runToolLoop(systemPrompt, userMessage, pluginSystem, context, options = {}) {
    const maxIterations = options.maxIterations || 20;
    const tools = pluginSystem.getToolDefinitions();

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];

    const toolResults = [];
    const statusUpdates = [];

    for (let i = 0; i < maxIterations; i++) {
        const response = await chat(messages, tools, options);
        const assistantMsg = response.message;

        if (!assistantMsg) {
            throw new Error('No message in Ollama response');
        }

        messages.push(assistantMsg);

        // Check for tool calls
        if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
            for (const toolCall of assistantMsg.tool_calls) {
                const toolName = toolCall.function?.name;
                const toolArgs = toolCall.function?.arguments || {};

                statusUpdates.push({
                    step: i + 1,
                    tool: toolName,
                    args: toolArgs,
                    timestamp: Date.now()
                });

                try {
                    const result = await pluginSystem.execute(toolName, toolArgs, context);
                    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

                    toolResults.push({
                        tool: toolName,
                        args: toolArgs,
                        result: resultStr,
                        success: true
                    });

                    messages.push({
                        role: 'tool',
                        content: resultStr
                    });
                } catch (error) {
                    const errorStr = `Error executing ${toolName}: ${error.message}`;

                    toolResults.push({
                        tool: toolName,
                        args: toolArgs,
                        result: errorStr,
                        success: false
                    });

                    messages.push({
                        role: 'tool',
                        content: errorStr
                    });
                }
            }
        } else {
            // No more tool calls — LLM is done
            return {
                finalMessage: assistantMsg.content,
                toolResults,
                statusUpdates,
                iterations: i + 1
            };
        }
    }

    return {
        finalMessage: messages[messages.length - 1]?.content || 'Max iterations reached',
        toolResults,
        statusUpdates,
        iterations: maxIterations,
        truncated: true
    };
}

/**
 * Check if Ollama is reachable and which models are available.
 */
export async function healthCheck() {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`, {
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
        const data = await response.json();
        return {
            ok: true,
            models: (data.models || []).map(m => m.name),
            url: OLLAMA_URL
        };
    } catch (error) {
        return { ok: false, error: error.message, url: OLLAMA_URL };
    }
}

export { OLLAMA_URL, DEFAULT_MODEL };
