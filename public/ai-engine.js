import * as webllm from "webllm";
import { PluginSystem, loadBuiltinPlugins } from "./plugin-system.js";
import { Validator } from "./validator.js";
import { SimilarityScorer } from "./similarity-scorer.js";

/**
 * AI Engine — Runs LLM directly in the browser via WebGPU/WebLLM.
 * Manages model loading, tool-calling loop, and conversion orchestration.
 */
export class AIEngine {
    constructor(onProgress) {
        this.engine = null;
        this.onProgress = onProgress;
        this.selectedModel = "Llama-3-8B-Instruct-v0.1-q4f32_1-MLC"; // Good balance for browser
        this.ps = new PluginSystem();
        this.validator = new Validator();
        this.scorer = new SimilarityScorer();
    }

    async init() {
        if (this.engine) return;

        this.engine = new webllm.MLCEngine();
        this.engine.setInitProgressCallback((report) => {
            console.log("Model loading:", report.text);
            if (this.onProgress) this.onProgress(report);
        });

        await this.engine.reload(this.selectedModel);
        await loadBuiltinPlugins(this.ps);
    }

    async convert(file, ctx) {
        await this.init();

        const javaAnalysis = await this.analyzeJavaMod(file, ctx);
        const systemPrompt = this.generateSystemPrompt(javaAnalysis);
        
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Start conversion for Java Mod: ${file.name}. Output results to ctx.rpFolder and ctx.bpFolder.` }
        ];

        let iterations = 0;
        const maxIterations = 20;

        while (iterations < maxIterations) {
            iterations++;
            
            const reply = await this.engine.chat.completions.create({
                messages,
                tools: this.ps.getToolDefinitions(),
                tool_choice: "auto"
            });

            const message = reply.choices[0].message;
            messages.push(message);

            if (message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                    const result = await this.ps.execute(toolCall.function.name, JSON.parse(toolCall.function.arguments), ctx);
                    messages.push({
                        role: "tool",
                        content: JSON.stringify(result),
                        tool_call_id: toolCall.id
                    });
                }
            } else {
                // No more tool calls, AI is done
                break;
            }
        }

        // Final Validation
        const validationResult = await this.validator.validate(ctx.rpFolder, ctx.bpFolder);
        const similarity = this.scorer.calculate(javaAnalysis, ctx);

        return {
            success: true,
            modName: file.name.replace('.jar', ''),
            javaAnalysis,
            validation: validationResult,
            similarity,
            iterations
        };
    }

    async analyzeJavaMod(file, ctx) {
        const zip = await JSZip.loadAsync(file);
        const files = Object.keys(zip.files);
        
        return {
            totalFiles: files.length,
            totalTextures: files.filter(f => f.endsWith('.png')).length,
            totalModels: files.filter(f => f.endsWith('.json') && f.includes('models/')).length,
            totalRecipes: files.filter(f => f.endsWith('.json') && f.includes('recipes/')).length,
            totalBlockstates: files.filter(f => f.endsWith('.json') && f.includes('blockstates/')).length,
            totalLang: files.filter(f => f.endsWith('.json') && f.includes('lang/')).length,
            totalScripts: files.filter(f => f.endsWith('.class')).length
        };
    }

    generateSystemPrompt(analysis) {
        return `You are an expert Minecraft Mod Converter.
Your task is to convert a Java Edition mod into a Bedrock Edition Addon.

MOD ANALYSIS:
- Total Files: ${analysis.totalFiles}
- Textures: ${analysis.totalTextures}
- Models: ${analysis.totalModels}
- Recipes: ${analysis.totalRecipes}
- Blockstates: ${analysis.totalBlockstates}
- Language: ${analysis.totalLang}
- Scripts (Java Class Files): ${analysis.totalScripts}

GUIDELINES:
1. Use the provided tools to transform assets.
2. Ensure manifest.json is generated first.
3. Convert textures using copy_texture.
4. Map blockstates to Bedrock permutations.
5. Create .mcstructure files from NBT if available.
6. Generate Script API code for complex logic.

The tool execution context (ctx) holds rpFolder and bpFolder which are JSZip instances for the Resource Pack and Behavior Pack.`;
    }
}
