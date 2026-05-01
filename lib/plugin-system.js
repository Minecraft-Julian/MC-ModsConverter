/**
 * Plugin System — Registry for conversion tools that the LLM can invoke.
 * Each plugin registers one or more "tools" with a name, description,
 * JSON schema for parameters, and an async handler function.
 */

export class PluginSystem {
    constructor() {
        /** @type {Map<string, PluginTool>} */
        this.tools = new Map();
        this.executionLog = [];
    }

    /**
     * Register a new tool.
     * @param {string} name        Unique tool name (e.g. 'copy_textures')
     * @param {string} description Human-readable description for the LLM
     * @param {object} parameters  JSON Schema describing accepted arguments
     * @param {Function} handler   async (args, context) => result
     */
    register(name, description, parameters, handler) {
        if (this.tools.has(name)) {
            console.warn(`[PluginSystem] Overwriting existing tool: ${name}`);
        }
        this.tools.set(name, { name, description, parameters, handler });
    }

    /**
     * Returns tool definitions in Ollama tool-calling format.
     */
    getToolDefinitions() {
        return Array.from(this.tools.values()).map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }
        }));
    }

    /**
     * Execute a registered tool by name.
     * @param {string} toolName
     * @param {object} args
     * @param {ConversionContext} context
     * @returns {Promise<any>}
     */
    async execute(toolName, args, context) {
        const tool = this.tools.get(toolName);
        if (!tool) {
            throw new Error(`Unknown tool: "${toolName}". Available: ${Array.from(this.tools.keys()).join(', ')}`);
        }

        const startTime = Date.now();
        try {
            const result = await tool.handler(args, context);
            this.executionLog.push({
                tool: toolName,
                args,
                success: true,
                duration: Date.now() - startTime,
                timestamp: startTime
            });
            return result;
        } catch (error) {
            this.executionLog.push({
                tool: toolName,
                args,
                success: false,
                error: error.message,
                duration: Date.now() - startTime,
                timestamp: startTime
            });
            throw error;
        }
    }

    /**
     * List all registered tool names.
     */
    listTools() {
        return Array.from(this.tools.keys());
    }

    /**
     * Get execution statistics.
     */
    getStats() {
        const total = this.executionLog.length;
        const successes = this.executionLog.filter(e => e.success).length;
        const failures = total - successes;
        const totalDuration = this.executionLog.reduce((sum, e) => sum + e.duration, 0);

        const toolUsage = {};
        for (const entry of this.executionLog) {
            if (!toolUsage[entry.tool]) {
                toolUsage[entry.tool] = { calls: 0, successes: 0, failures: 0 };
            }
            toolUsage[entry.tool].calls++;
            if (entry.success) toolUsage[entry.tool].successes++;
            else toolUsage[entry.tool].failures++;
        }

        return { total, successes, failures, totalDuration, toolUsage };
    }

    /**
     * Clear execution log (for new conversion).
     */
    resetLog() {
        this.executionLog = [];
    }
}

/**
 * Load all built-in plugins into a PluginSystem instance.
 */
export async function loadBuiltinPlugins(pluginSystem) {
    const plugins = [
        (await import('./plugins/texture-copier.js')).default,
        (await import('./plugins/model-converter.js')).default,
        (await import('./plugins/recipe-converter.js')).default,
        (await import('./plugins/sound-converter.js')).default,
        (await import('./plugins/manifest-generator.js')).default,
        (await import('./plugins/blockstate-mapper.js')).default,
        (await import('./plugins/lang-converter.js')).default,
        (await import('./plugins/nbt-converter.js')).default,
        (await import('./plugins/script-generator.js')).default,
        (await import('./plugins/file-tools.js')).default,
    ];

    for (const registerFn of plugins) {
        registerFn(pluginSystem);
    }

    return pluginSystem;
}
