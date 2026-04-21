// Test script to analyze Create mod conversion
const JSZip = require('jszip');
const fs = require('fs');

async function testCreateModConversion() {
    console.log('🧪 Testing Create Mod Conversion...\n');

    // Load the JAR file
    const jarBuffer = fs.readFileSync('create-1.21.1-6.0.9.jar');
    const zip = await JSZip.loadAsync(jarBuffer);

    console.log('📦 Mod loaded successfully');
    console.log(`📊 Total files: ${Object.keys(zip.files).length}\n`);

    // Analyze structure
    const assets = {};
    const data = {};
    let classFiles = 0;
    let textureFiles = 0;
    let soundFiles = 0;
    let modelFiles = 0;

    for (const [path, file] of Object.entries(zip.files)) {
        if (file.dir) continue;

        if (path.startsWith('assets/create/')) {
            const parts = path.split('/');
            const category = parts[2]; // models, textures, sounds, lang, etc.

            if (!assets[category]) assets[category] = [];
            assets[category].push(path);

            if (category === 'textures') textureFiles++;
            if (category === 'sounds') soundFiles++;
            if (category === 'models') modelFiles++;
        } else if (path.startsWith('data/create/')) {
            const parts = path.split('/');
            const category = parts[2];

            if (!data[category]) data[category] = [];
            data[category].push(path);
        } else if (path.endsWith('.class')) {
            classFiles++;
        }
    }

    console.log('📈 Analysis Results:');
    console.log(`   🖼️  Textures: ${textureFiles}`);
    console.log(`   🔊 Sounds: ${soundFiles}`);
    console.log(`   📐 Models: ${modelFiles}`);
    console.log(`   📝 Languages: ${assets.lang ? assets.lang.length : 0}`);
    console.log(`   ⚙️  Java Classes: ${classFiles}`);
    console.log(`   📋 Recipes/Other Data: ${Object.values(data).flat().length}\n`);

    // Simulate what the converter would generate
    console.log('🔄 Conversion Simulation:');
    console.log('   ✅ Would detect as Create mod');
    console.log('   ✅ Would generate specialized Create logic in main.js');
    console.log('   ✅ Would convert textures to Bedrock format');
    console.log('   ✅ Would create behavior pack with mechanical simulation');
    console.log('   ✅ Would create resource pack with models and sounds');
    console.log('   ✅ Would generate clean manifests\n');

    // Show sample of what main.js would contain
    console.log('📜 Sample Generated main.js for Create:');
    console.log(`
// --- CREATE MOD LOGIC SIMULATION ---
// Mechanical components, rotation, power transmission
const createComponents = new Map();

// Simulate mechanical power propagation
function propagatePower(location) {
    // Would simulate power transmission between Create components
}

// Would handle component placement and interactions
world.afterEvents.blockPlace.subscribe(ev => {
    if (block.typeId.includes("create:")) {
        // Add to component tracking
        console.log("Create component placed: " + block.typeId);
    }
});
    `);

    console.log('\n🎯 Conversion would create .mcaddon with:');
    console.log('   📁 behavior pack (scripts + logic)');
    console.log('   📁 resource pack (textures + models + sounds)');
    console.log('   📄 manifests (clean, no generated_with)');
    console.log('   🔧 simulated Create mechanics in JavaScript');
}

testCreateModConversion().catch(console.error);