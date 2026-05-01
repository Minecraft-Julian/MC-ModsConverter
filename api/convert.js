/**
 * API: /api/convert
 * POST: Upload a .jar file and start AI-powered conversion.
 * Returns a conversion ID for status polling.
 */
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { runToolLoop, healthCheck } from '../lib/ollama-client.js';
import { PluginSystem, loadBuiltinPlugins } from '../lib/plugin-system.js';
import { registerScraperPlugin } from '../lib/scraper.js';
import { BedrockValidator, formatValidationReport } from '../lib/validator.js';
import { calculateSimilarity, analyzeJavaMod, analyzeBedrockOutput } from '../lib/similarity-scorer.js';

// In-memory store for conversion jobs (in production, use Redis/KV)
// Vercel serverless functions are stateless, so we process synchronously
// and return the result directly.

const SYSTEM_PROMPT = `You are an expert Minecraft mod converter. Your job is to convert a Java Edition mod (.jar) to a Bedrock Edition addon (.mcaddon).

You have access to tools that help you convert different parts of the mod:
- list_files: List files in the Java mod to understand its structure
- read_file: Read a file's contents from the Java mod  
- copy_textures: Bulk-copy textures from Java to Bedrock format
- convert_model: Convert a Java block/item model to Bedrock geometry
- convert_blockstate: Convert Java blockstates to Bedrock block definitions
- convert_recipe: Convert crafting/smelting recipes
- convert_sounds: Copy sounds and generate sound_definitions.json
- convert_lang: Convert language files
- convert_nbt: Convert NBT structure files
- generate_manifest: Create Bedrock manifest.json files
- generate_script: Write Bedrock Script API code for behavior logic
- write_file: Write any file directly to the Bedrock addon
- copy_file: Copy a binary file from Java to Bedrock
- scrape_curseforge: Search CurseForge for reference modpacks

CONVERSION PROCESS:
1. First, use list_files to understand the mod structure (check assets/ and data/ directories)
2. Use read_file to examine key config files (fabric.mod.json, etc.) for mod metadata
3. Generate manifests with generate_manifest
4. Copy all textures with copy_textures (type: "all")
5. Convert blockstates, models, recipes, sounds, and lang files
6. If there are .class files with game logic, use generate_script to create Script API equivalents
7. For anything the specialized tools can't handle, use write_file or copy_file directly
8. When done, respond with a summary of what was converted

IMPORTANT RULES:
- Always start with list_files to scan the mod
- Use the mod namespace (not "minecraft") for custom content
- Bedrock uses "textures/blocks/" not "textures/block/"
- Bedrock uses "textures/items/" not "textures/item/"
- Block identifiers need format "namespace:block_name"
- Always generate manifests before finishing
- Be thorough — convert everything you can find`;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const conversionId = uuidv4();
    const startTime = Date.now();

    try {
        // Check Ollama health first
        const health = await healthCheck();
        if (!health.ok) {
            return res.status(503).json({
                error: 'Ollama AI server is not reachable',
                detail: health.error,
                url: health.url,
                hint: 'Make sure Ollama is running and OLLAMA_URL environment variable is set correctly.'
            });
        }

        // Parse the uploaded file
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        if (buffer.length === 0) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Extract filename from Content-Disposition header or use default
        const contentDisposition = req.headers['content-disposition'] || '';
        const fileNameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
        const fileName = fileNameMatch ? fileNameMatch[1] : 'unknown.jar';
        const modNameBase = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

        // Load the Java mod ZIP
        const javaZip = new JSZip();
        await javaZip.loadAsync(buffer);

        // Analyze Java mod structure
        const javaAnalysis = analyzeJavaMod(javaZip);

        // Create Bedrock addon output ZIP
        const addonZip = new JSZip();
        const bpFolder = addonZip.folder(`${modNameBase}_BP`);
        const rpFolder = addonZip.folder(`${modNameBase}_RP`);

        // Initialize plugin system
        const pluginSystem = new PluginSystem();
        await loadBuiltinPlugins(pluginSystem);
        registerScraperPlugin(pluginSystem);

        // Conversion context shared across all tools
        const ctx = {
            javaZip,
            addonZip,
            bpFolder,
            rpFolder,
            modNameBase,
            fileName,
            javaAnalysis,
            blocks: new Set(),
            geometries: new Set(),
            soundDefinitions: {},
            hasScripts: false
        };

        // Build the user message with mod structure info
        const fileList = [];
        let fileCount = 0;
        for (const [path, entry] of Object.entries(javaZip.files)) {
            if (entry.dir) continue;
            fileCount++;
            if (fileCount <= 200) fileList.push(path);
        }

        const userMessage = `Convert this Java mod to Bedrock:

MOD: ${fileName}
NAMESPACES: ${javaAnalysis.namespaces.join(', ') || 'unknown'}
TOTAL FILES: ${fileCount}
TEXTURES: ${javaAnalysis.totalTextures}
MODELS: ${javaAnalysis.totalModels}
RECIPES: ${javaAnalysis.totalRecipes}
SOUNDS: ${javaAnalysis.totalSounds}
BLOCKSTATES: ${javaAnalysis.totalBlocks}
CLASS FILES: ${javaAnalysis.classFiles}

FILE LISTING (first 200):
${fileList.join('\n')}
${fileCount > 200 ? `\n... and ${fileCount - 200} more files` : ''}

Please convert this mod step by step. Start by listing the files, then convert everything.`;

        // Run the AI tool-calling loop
        const aiResult = await runToolLoop(SYSTEM_PROMPT, userMessage, pluginSystem, ctx, {
            maxIterations: 30,
            temperature: 0.1
        });

        // Validation loop (max 2 iterations)
        const validator = new BedrockValidator();
        let validationReport = await validator.validate(ctx);
        let validationAttempts = 0;

        while (!validationReport.passed && validationAttempts < 2) {
            validationAttempts++;
            const fixPrompt = `The Bedrock addon has validation errors. Please fix them:\n\n${formatValidationReport(validationReport)}\n\nUse the available tools to fix these issues.`;

            await runToolLoop(SYSTEM_PROMPT, fixPrompt, pluginSystem, ctx, {
                maxIterations: 10,
                temperature: 0.1
            });

            validationReport = await validator.validate(ctx);
        }

        // Calculate similarity score
        const bedrockAnalysis = analyzeBedrockOutput(rpFolder, bpFolder, ctx);
        const toolStats = pluginSystem.getStats();
        const similarity = calculateSimilarity(javaAnalysis, bedrockAnalysis, validationReport, toolStats);

        // Generate the .mcaddon file
        const mcaddonBlob = await addonZip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 5 }
        });

        // Encode as base64 for JSON response
        const mcaddonBase64 = mcaddonBlob.toString('base64');

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        return res.status(200).json({
            success: true,
            conversionId,
            fileName: `${modNameBase}.mcaddon`,
            fileSize: mcaddonBlob.length,
            fileBase64: mcaddonBase64,
            duration: `${duration}s`,
            similarity: {
                percentage: similarity.percentage,
                verdict: similarity.verdict,
                breakdown: similarity.breakdown
            },
            validation: {
                passed: validationReport.passed,
                errors: validationReport.errors.length,
                warnings: validationReport.warnings.length,
                attempts: validationAttempts + 1
            },
            ai: {
                iterations: aiResult.iterations,
                toolCalls: aiResult.toolResults.length,
                toolStats: toolStats,
                truncated: aiResult.truncated || false
            },
            javaAnalysis,
            modName: modNameBase
        });

    } catch (error) {
        console.error('Conversion error:', error);
        return res.status(500).json({
            error: 'Conversion failed',
            message: error.message,
            conversionId,
            duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
        });
    }
}
