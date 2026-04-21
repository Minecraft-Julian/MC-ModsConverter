// Comprehensive mod analysis for Replay, Litematica, and Create mods
const JSZip = require('jszip');
const fs = require('fs');

class ModAnalysis {
    constructor() {
        this.mods = [
            { name: 'Replay Mod', file: 'replaymod-26.1-2.6.26.jar' },
            { name: 'Litematica Mod', file: 'litematica-fabric-26.1.1-0.27.1.jar' },
            { name: 'Create Mod', file: 'create-1.21.1-6.0.9.jar' }
        ];
        this.results = {};
    }

    async analyzeAllMods() {
        console.log('🔬 Analyzing all three mods for Bedrock conversion potential...\n');

        for (const mod of this.mods) {
            console.log(`📦 Analyzing ${mod.name}...`);
            await this.analyzeMod(mod);
            console.log('');
        }

        this.printComparison();
        this.assessConversionPotential();
    }

    async analyzeMod(modInfo) {
        const result = {
            name: modInfo.name,
            totalFiles: 0,
            assets: { textures: 0, models: 0, sounds: 0, lang: 0, other: 0 },
            data: { recipes: 0, loot_tables: 0, advancements: 0, other: 0 },
            javaClasses: 0,
            specialFeatures: [],
            conversionChallenges: []
        };

        try {
            const jarBuffer = fs.readFileSync(modInfo.file);
            const zip = await JSZip.loadAsync(jarBuffer);

            result.totalFiles = Object.keys(zip.files).length;

            for (const [path, file] of Object.entries(zip.files)) {
                if (file.dir) continue;

                if (path.startsWith('assets/')) {
                    if (path.includes('/textures/')) result.assets.textures++;
                    else if (path.includes('/models/')) result.assets.models++;
                    else if (path.includes('/sounds/')) result.assets.sounds++;
                    else if (path.includes('/lang/')) result.assets.lang++;
                    else result.assets.other++;
                } else if (path.startsWith('data/')) {
                    if (path.includes('/recipes/')) result.data.recipes++;
                    else if (path.includes('/loot_tables/')) result.data.loot_tables++;
                    else if (path.includes('/advancements/')) result.data.advancements++;
                    else result.data.other++;
                } else if (path.endsWith('.class')) {
                    result.javaClasses++;
                }

                // Detect special features
                if (path.includes('replay') && modInfo.name.includes('Replay')) {
                    if (path.includes('recording') || path.includes('playback')) {
                        result.specialFeatures.push('Recording/Playback System');
                    }
                }
                if (path.includes('litematica') && modInfo.name.includes('Litematica')) {
                    if (path.includes('schematic') || path.includes('placement')) {
                        result.specialFeatures.push('Schematic System');
                    }
                }
                if (path.includes('create') && modInfo.name.includes('Create')) {
                    if (path.includes('kinetic') || path.includes('mechanical')) {
                        result.specialFeatures.push('Mechanical System');
                    }
                }
            }

            // Remove duplicates
            result.specialFeatures = [...new Set(result.specialFeatures)];

            // Assess conversion challenges
            if (result.javaClasses > 1000) {
                result.conversionChallenges.push('Massive Java codebase - complex logic conversion needed');
            }
            if (result.assets.textures > 500) {
                result.conversionChallenges.push('Many custom textures - extensive conversion required');
            }
            if (result.specialFeatures.includes('Recording/Playback System')) {
                result.conversionChallenges.push('Recording system requires video/audio handling - may not be 1:1 possible');
            }
            if (result.specialFeatures.includes('Schematic System')) {
                result.conversionChallenges.push('Schematic placement needs world editing - partially possible');
            }
            if (result.specialFeatures.includes('Mechanical System')) {
                result.conversionChallenges.push('Complex mechanical simulation - good candidate for JS simulation');
            }

        } catch (error) {
            console.error(`Error analyzing ${modInfo.name}:`, error.message);
        }

        this.results[modInfo.name] = result;
    }

    printComparison() {
        console.log('📊 MOD ANALYSIS COMPARISON\n');
        console.log('┌─────────────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐');
        console.log('│ Mod             │ Total   │ Assets  │ Textures│ Models  │ Sounds  │ Classes │');
        console.log('├─────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤');

        for (const [name, data] of Object.entries(this.results)) {
            const shortName = name.replace(' Mod', '');
            console.log(`│ ${shortName.padEnd(15)} │ ${data.totalFiles.toString().padStart(7)} │ ${Object.values(data.assets).reduce((a,b)=>a+b,0).toString().padStart(7)} │ ${data.assets.textures.toString().padStart(7)} │ ${data.assets.models.toString().padStart(7)} │ ${data.assets.sounds.toString().padStart(7)} │ ${data.javaClasses.toString().padStart(7)} │`);
        }
        console.log('└─────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘\n');
    }

    assessConversionPotential() {
        console.log('🎯 CONVERSION ASSESSMENT\n');

        for (const [name, data] of Object.entries(this.results)) {
            console.log(`🔍 ${name}:`);
            console.log(`   ✅ Convertable: Assets (${Object.values(data.assets).reduce((a,b)=>a+b,0)}), Data (${Object.values(data.data).reduce((a,b)=>a+b,0)})`);
            console.log(`   ⚠️  Challenges: ${data.conversionChallenges.join(', ')}`);
            console.log(`   🎮 Special Features: ${data.specialFeatures.join(', ')}\n`);
        }

        console.log('📋 OVERALL ASSESSMENT:');
        console.log('');
        console.log('🎮 REPLAY MOD:');
        console.log('   • Recording/Playback System ist sehr komplex');
        console.log('   • Video/Audio-Handling in Bedrock stark eingeschränkt');
        console.log('   • Wahrscheinlich nicht 1:1 möglich - nur grundlegende Features');
        console.log('');
        console.log('📐 LITEMATICA MOD:');
        console.log('   • Schematic-System ist machbar in Bedrock');
        console.log('   • World-Editing APIs vorhanden');
        console.log('   • Kann nahezu 1:1 konvertiert werden');
        console.log('');
        console.log('⚙️ CREATE MOD:');
        console.log('   • Mechanische Systeme perfekt für JS-Simulation');
        console.log('   • Komplexe Logik kann nachgebildet werden');
        console.log('   • Kann sehr nahe an 1:1 kommen');
        console.log('');
    }
}

const analysis = new ModAnalysis();
analysis.analyzeAllMods().catch(console.error);