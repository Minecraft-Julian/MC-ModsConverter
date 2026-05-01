/**
 * Library Analyzer — Scans reference modpacks and generates pattern files.
 * Run: npm run analyze-library
 */
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, extname, relative } from 'path';
import JSZip from 'jszip';

const LIBRARY_DIR = join(process.cwd(), 'library');
const OUTPUT_DIR = join(LIBRARY_DIR, 'analysis');

async function analyzeDirectory(dirPath, basePath = dirPath) {
    const structure = { files: [], dirs: [], fileTypes: {} };

    try {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dirPath, entry.name);
            const relPath = relative(basePath, fullPath);

            if (entry.isDirectory()) {
                structure.dirs.push(relPath);
                const subStructure = await analyzeDirectory(fullPath, basePath);
                structure.files.push(...subStructure.files);
                structure.dirs.push(...subStructure.dirs);
                for (const [ext, count] of Object.entries(subStructure.fileTypes)) {
                    structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + count;
                }
            } else {
                structure.files.push(relPath);
                const ext = extname(entry.name).toLowerCase();
                structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
            }
        }
    } catch (e) {
        console.warn(`Could not read directory: ${dirPath}`, e.message);
    }

    return structure;
}

async function analyzeZipFile(zipPath) {
    const structure = { files: [], fileTypes: {}, sampleFiles: {} };

    try {
        const buffer = await readFile(zipPath);
        const zip = new JSZip();
        await zip.loadAsync(buffer);

        for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue;
            structure.files.push(path);

            const ext = extname(path).toLowerCase();
            structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;

            // Read sample JSON files for pattern extraction
            if (ext === '.json' && !path.endsWith('.class') && Object.keys(structure.sampleFiles).length < 20) {
                try {
                    const content = await entry.async('string');
                    if (content.length < 5000) {
                        structure.sampleFiles[path] = JSON.parse(content);
                    }
                } catch { /* skip non-JSON or large files */ }
            }
        }
    } catch (e) {
        console.warn(`Could not read ZIP: ${zipPath}`, e.message);
    }

    return structure;
}

async function scanPlatformDir(platformDir, platformName) {
    const results = [];

    try {
        const entries = await readdir(platformDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(platformDir, entry.name);
            const entryStats = await stat(fullPath);

            if (entry.isDirectory()) {
                console.log(`  📁 Analyzing directory: ${entry.name}`);
                const structure = await analyzeDirectory(fullPath);
                results.push({
                    name: entry.name,
                    type: 'directory',
                    platform: platformName,
                    ...structure
                });
            } else if (entry.name.match(/\.(jar|zip|mcaddon|mcpack)$/i)) {
                console.log(`  📦 Analyzing archive: ${entry.name} (${(entryStats.size / 1024 / 1024).toFixed(1)} MB)`);
                const structure = await analyzeZipFile(fullPath);
                results.push({
                    name: entry.name,
                    type: 'archive',
                    platform: platformName,
                    size: entryStats.size,
                    ...structure
                });
            }
        }
    } catch (e) {
        console.warn(`No ${platformName} directory found at: ${platformDir}`);
    }

    return results;
}

async function main() {
    console.log('🔍 MC Mods Converter — Library Analyzer\n');

    // Analyze Bedrock modpacks
    console.log('📱 Scanning Bedrock modpacks...');
    const bedrockResults = await scanPlatformDir(join(LIBRARY_DIR, 'bedrock'), 'bedrock');

    // Analyze Java modpacks
    console.log('\n☕ Scanning Java modpacks...');
    const javaResults = await scanPlatformDir(join(LIBRARY_DIR, 'java'), 'java');

    // Generate pattern files
    const bedrockPatterns = {
        version: '1.0.0',
        generated: new Date().toISOString(),
        modpackCount: bedrockResults.length,
        modpacks: bedrockResults.map(r => ({
            name: r.name,
            type: r.type,
            fileCount: r.files.length,
            fileTypes: r.fileTypes,
            sampleStructure: r.files.slice(0, 50)
        })),
        patterns: extractPatterns(bedrockResults, 'bedrock')
    };

    const javaPatterns = {
        version: '1.0.0',
        generated: new Date().toISOString(),
        modpackCount: javaResults.length,
        modpacks: javaResults.map(r => ({
            name: r.name,
            type: r.type,
            fileCount: r.files.length,
            fileTypes: r.fileTypes,
            sampleStructure: r.files.slice(0, 50)
        })),
        patterns: extractPatterns(javaResults, 'java')
    };

    // Write output
    await writeFile(
        join(OUTPUT_DIR, 'bedrock-patterns.json'),
        JSON.stringify(bedrockPatterns, null, 2)
    );
    await writeFile(
        join(OUTPUT_DIR, 'java-patterns.json'),
        JSON.stringify(javaPatterns, null, 2)
    );

    console.log(`\n✅ Analysis complete!`);
    console.log(`   Bedrock modpacks: ${bedrockResults.length}`);
    console.log(`   Java modpacks: ${javaResults.length}`);
    console.log(`   Output: library/analysis/`);
}

function extractPatterns(results, platform) {
    const allDirs = new Set();
    const allFileTypes = {};
    const allSampleFiles = {};

    for (const result of results) {
        for (const file of result.files) {
            const parts = file.split('/');
            // Track directory patterns (first 3 levels)
            if (parts.length > 1) {
                allDirs.add(parts.slice(0, Math.min(3, parts.length - 1)).join('/') + '/');
            }
        }

        for (const [ext, count] of Object.entries(result.fileTypes)) {
            allFileTypes[ext] = (allFileTypes[ext] || 0) + count;
        }

        if (result.sampleFiles) {
            Object.assign(allSampleFiles, result.sampleFiles);
        }
    }

    return {
        commonDirectories: Array.from(allDirs).sort(),
        fileTypeDistribution: allFileTypes,
        sampleFiles: Object.fromEntries(
            Object.entries(allSampleFiles).slice(0, 10)
        )
    };
}

main().catch(console.error);
