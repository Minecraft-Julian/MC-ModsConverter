/**
 * Similarity Scorer
 * Calculates how similar the converted Bedrock addon is to the original Java mod.
 */

export function calculateSimilarity(javaAnalysis, bedrockAnalysis, validationReport, toolStats) {
    const scores = {};
    let totalWeight = 0;

    // 1. Textures (weight: 30)
    const texWeight = 30;
    if (javaAnalysis.totalTextures > 0) {
        scores.textures = {
            score: Math.min(100, (bedrockAnalysis.textureCount / javaAnalysis.totalTextures) * 100),
            weight: texWeight,
            detail: `${bedrockAnalysis.textureCount}/${javaAnalysis.totalTextures} textures copied`
        };
        totalWeight += texWeight;
    }

    // 2. Models/Geometry (weight: 20)
    const modelWeight = 20;
    if (javaAnalysis.totalModels > 0) {
        scores.models = {
            score: Math.min(100, (bedrockAnalysis.geometryCount / javaAnalysis.totalModels) * 100),
            weight: modelWeight,
            detail: `${bedrockAnalysis.geometryCount}/${javaAnalysis.totalModels} models converted`
        };
        totalWeight += modelWeight;
    }

    // 3. Recipes (weight: 15)
    const recipeWeight = 15;
    if (javaAnalysis.totalRecipes > 0) {
        scores.recipes = {
            score: Math.min(100, (bedrockAnalysis.recipeCount / javaAnalysis.totalRecipes) * 100),
            weight: recipeWeight,
            detail: `${bedrockAnalysis.recipeCount}/${javaAnalysis.totalRecipes} recipes converted`
        };
        totalWeight += recipeWeight;
    }

    // 4. Sounds (weight: 10)
    const soundWeight = 10;
    if (javaAnalysis.totalSounds > 0) {
        scores.sounds = {
            score: Math.min(100, (bedrockAnalysis.soundCount / javaAnalysis.totalSounds) * 100),
            weight: soundWeight,
            detail: `${bedrockAnalysis.soundCount}/${javaAnalysis.totalSounds} sounds copied`
        };
        totalWeight += soundWeight;
    }

    // 5. Block Definitions (weight: 15)
    const blockWeight = 15;
    if (javaAnalysis.totalBlocks > 0) {
        scores.blocks = {
            score: Math.min(100, (bedrockAnalysis.blockCount / javaAnalysis.totalBlocks) * 100),
            weight: blockWeight,
            detail: `${bedrockAnalysis.blockCount}/${javaAnalysis.totalBlocks} blocks defined`
        };
        totalWeight += blockWeight;
    }

    // 6. Logic/Scripts (weight: 10) — penalized heavily for .class files
    const logicWeight = 10;
    if (javaAnalysis.classFiles > 0) {
        // Class files can't be fully converted, but Script API stubs count
        const logicScore = bedrockAnalysis.hasScripts ? 25 : 5; // Best we can do without full decompilation
        scores.logic = {
            score: logicScore,
            weight: logicWeight,
            detail: `${javaAnalysis.classFiles} class files (Java logic) — partial Script API generation`
        };
        totalWeight += logicWeight;
    }

    // 7. Validation penalty
    if (validationReport) {
        const errorPenalty = validationReport.errors.length * 3;
        const warningPenalty = validationReport.warnings.length * 0.5;
        scores.validation = {
            penalty: errorPenalty + warningPenalty,
            detail: `${validationReport.errors.length} errors, ${validationReport.warnings.length} warnings`
        };
    }

    // 8. Tool success rate bonus
    if (toolStats) {
        const successRate = toolStats.total > 0
            ? (toolStats.successes / toolStats.total) * 100
            : 100;
        scores.toolSuccess = {
            score: successRate,
            detail: `${toolStats.successes}/${toolStats.total} tool executions succeeded`
        };
    }

    // Calculate weighted average
    let weightedSum = 0;
    for (const [key, data] of Object.entries(scores)) {
        if (key === 'validation' || key === 'toolSuccess') continue;
        if (data.score !== undefined && data.weight) {
            weightedSum += data.score * data.weight;
        }
    }

    let percentage = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Apply validation penalty
    if (scores.validation) {
        percentage = Math.max(0, percentage - scores.validation.penalty);
    }

    // Round to integer
    percentage = Math.round(Math.max(0, Math.min(100, percentage)));

    return {
        percentage,
        breakdown: scores,
        totalWeight,
        verdict: getVerdict(percentage)
    };
}

function getVerdict(pct) {
    if (pct >= 90) return { label: 'Excellent', emoji: '🟢', description: 'Very close to the Java original' };
    if (pct >= 70) return { label: 'Good', emoji: '🟡', description: 'Most features converted successfully' };
    if (pct >= 50) return { label: 'Partial', emoji: '🟠', description: 'Core content converted, some features missing' };
    if (pct >= 25) return { label: 'Basic', emoji: '🔴', description: 'Textures and basic structure only' };
    return { label: 'Minimal', emoji: '⚫', description: 'Very limited conversion possible' };
}

/**
 * Analyze the Java mod ZIP to count assets by type.
 */
export function analyzeJavaMod(javaZip) {
    const analysis = {
        totalTextures: 0,
        totalModels: 0,
        totalRecipes: 0,
        totalSounds: 0,
        totalBlocks: 0,
        classFiles: 0,
        namespaces: new Set(),
        totalFiles: 0
    };

    for (const [path, entry] of Object.entries(javaZip.files)) {
        if (entry.dir) continue;
        analysis.totalFiles++;

        if (path.endsWith('.class')) { analysis.classFiles++; continue; }

        const assetMatch = path.match(/^assets\/([^/]+)\//);
        if (assetMatch) analysis.namespaces.add(assetMatch[1]);

        if (path.match(/textures\/.*\.(png|jpg|jpeg|tga)$/i)) analysis.totalTextures++;
        if (path.match(/models\/.*\.json$/)) analysis.totalModels++;
        if (path.match(/blockstates\/.*\.json$/)) analysis.totalBlocks++;
        if (path.match(/data\/[^/]+\/recipes?\/.*\.json$/)) analysis.totalRecipes++;
        if (path.match(/sounds\/.*\.ogg$/)) analysis.totalSounds++;
    }

    analysis.namespaces = Array.from(analysis.namespaces).filter(
        ns => !['minecraft', 'forge', 'neoforge', 'fabric', 'quilt', 'c', 'realms'].includes(ns)
    );

    return analysis;
}

/**
 * Analyze the Bedrock output ZIP to count converted assets.
 */
export function analyzeBedrockOutput(rpFolder, bpFolder, ctx = {}) {
    const analysis = {
        textureCount: 0,
        geometryCount: 0,
        recipeCount: 0,
        soundCount: 0,
        blockCount: 0,
        hasScripts: false,
        hasManifest: false,
        totalFiles: 0
    };

    if (rpFolder) {
        rpFolder.forEach((path, file) => {
            if (file.dir) return;
            analysis.totalFiles++;
            if (path.match(/textures\/.*\.(png|jpg|tga)$/i)) analysis.textureCount++;
            if (path.match(/models\/.*\.geo\.json$/)) analysis.geometryCount++;
            if (path.match(/sounds\/.*\.ogg$/)) analysis.soundCount++;
            if (path === 'manifest.json') analysis.hasManifest = true;
        });
    }

    if (bpFolder) {
        bpFolder.forEach((path, file) => {
            if (file.dir) return;
            analysis.totalFiles++;
            if (path.match(/recipes\/.*\.json$/)) analysis.recipeCount++;
            if (path.match(/blocks\/.*\.json$/)) analysis.blockCount++;
            if (path.startsWith('scripts/')) analysis.hasScripts = true;
            if (path === 'manifest.json') analysis.hasManifest = true;
        });
    }

    return analysis;
}
