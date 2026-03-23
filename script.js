// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const statusPanel = document.getElementById('statusPanel');
const spinner = document.getElementById('spinner');
const successIcon = document.getElementById('successIcon');
const statusTitle = document.getElementById('statusTitle');
const statusDesc = document.getElementById('statusDesc');
const downloadBtn = document.getElementById('downloadBtn');

// Setup Drag & Drop Listeners
dropzone.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
});

dropzone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', (e) => handleFiles(e.target.files), false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    
    if (!file.name.endsWith('.jar') && !file.name.endsWith('.zip')) {
        updateStatus('Error', 'Please upload a valid .jar file.', false);
        return;
    }

    processFile(file);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const generateManifest = (type, name, description) => {
    const headerUUID = generateUUID();
    const moduleUUID = generateUUID();
    
    return JSON.stringify({
        "format_version": 2,
        "header": {
            "name": name,
            "description": description,
            "uuid": headerUUID,
            "version": [1, 0, 0],
            "min_engine_version": [1, 16, 0]
        },
        "modules": [
            {
                "type": type === 'resources' ? 'resources' : 'data',
                "uuid": moduleUUID,
                "version": [1, 0, 0]
            }
        ]
    }, null, 4);
};

function updateStatus(title, desc, isLoading = true) {
    statusPanel.classList.remove('hidden');
    statusTitle.textContent = title;
    statusDesc.textContent = desc;
    
    if (isLoading) {
        spinner.classList.remove('hidden');
        successIcon.classList.add('hidden');
    } else {
        spinner.classList.add('hidden');
        successIcon.classList.remove('hidden');
    }
}

async function processFile(file) {
    const modNameBase = file.name.replace('.jar', '').replace('.zip', '');
    updateStatus('Processing...', `Reading ${file.name}`);
    downloadBtn.classList.add('hidden');

    try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);
        
        const addonZip = new JSZip();
        
        // Create Behaviors and Resources folders
        const bpFolder = addonZip.folder(`${modNameBase}_BP`);
        const rpFolder = addonZip.folder(`${modNameBase}_RP`);
        
        // Add Manifests
        updateStatus('Generating Assets...', 'Creating Bedrock manifests');
        bpFolder.file("manifest.json", generateManifest('data', `${modNameBase} Behaviors`, "Converted from Java Edition"));
        rpFolder.file("manifest.json", generateManifest('resources', `${modNameBase} Resources`, "Converted from Java Edition"));
        
        // Basic mapping logic - copy assets
        updateStatus('Extracting Assets...', 'Locating Java textures and sounds');
        
        let fileCount = 0;
        let javaSoundsJson = null;
        let flipbookTextures = [];
        
        // Find texture and sound files
        for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
            if (zipEntry.dir) continue;
            
            // Checks for specific asset types
            const textureMatch = relativePath.match(/^assets\/[^/]+\/textures\/(.*\.(png|tga|jpg|jpeg))$/);
            const mcmetaMatch = relativePath.match(/^assets\/[^/]+\/textures\/(.*\.png)\.mcmeta$/);
            const soundMatch = relativePath.match(/^assets\/([^/]+)\/sounds\/(.*\.(ogg|wav))$/);
            const soundsJsonMatch = relativePath.match(/^assets\/[^/]+\/sounds\.json$/);

            if (textureMatch) {
                const bedrockTexturePath = textureMatch[1];
                const fileContent = await zipEntry.async('arraybuffer');
                // Place into ResourcePack/textures/
                rpFolder.file(`textures/${bedrockTexturePath}`, fileContent);
                fileCount++;
            } else if (mcmetaMatch) {
                try {
                    const texturePathWithExt = mcmetaMatch[1]; // e.g. "block/fire.png"
                    const texturePath = texturePathWithExt.replace(/\.png$/, ''); // "block/fire"
                    const fileContent = await zipEntry.async('string');
                    const parsed = JSON.parse(fileContent);

                    if (parsed.animation) {
                        const flipbook = {
                            "flipbook_texture": `textures/${texturePath}`,
                            "atlas_tile": texturePath.split('/').pop(),
                            "ticks_per_frame": parsed.animation.frametime || 1
                        };
                        
                        if (parsed.animation.frames) {
                            // Extract just the index if frame is an object in Java (e.g. {"index": 0, "time": 2})
                            flipbook.frames = parsed.animation.frames.map(f => typeof f === 'object' ? f.index : f);
                        }
                        flipbookTextures.push(flipbook);
                    }
                } catch(e) {
                    console.warn(`Could not parse ${relativePath}`, e);
                }
            } else if (soundMatch) {
                const namespace = soundMatch[1];
                const soundPath = soundMatch[2];
                const fileContent = await zipEntry.async('arraybuffer');
                // Place into ResourcePack/sounds/namespace/...
                rpFolder.file(`sounds/${namespace}/${soundPath}`, fileContent);
                fileCount++;
            } else if (soundsJsonMatch) {
                try {
                    const fileContent = await zipEntry.async('string');
                    const parsed = JSON.parse(fileContent);
                    if (!javaSoundsJson) javaSoundsJson = {};
                    Object.assign(javaSoundsJson, parsed);
                } catch(e) {
                    console.warn("Could not parse sounds.json", e);
                }
            }
                
            // Keep UI updated occasionally
            if (fileCount % 10 === 0) {
                updateStatus('Copying Assets...', `Migrated ${fileCount} files`);
            }
        }
        
        // Convert animated textures
        if (flipbookTextures.length > 0) {
            updateStatus('Converting Animations...', 'Generating flipbook_textures.json');
            rpFolder.file("textures/flipbook_textures.json", JSON.stringify(flipbookTextures, null, 4));
        }
        
        // Convert sounds.json to sound_definitions.json for Bedrock
        if (javaSoundsJson) {
            updateStatus('Converting Sounds...', 'Generating sound_definitions.json');
            const bedrockSoundsData = {
                "format_version": "1.14.0",
                "sound_definitions": {}
            };

            for (const [eventName, eventData] of Object.entries(javaSoundsJson)) {
                if (!eventData.sounds) continue;

                const bedrockSoundsList = eventData.sounds.map(s => {
                    let soundName = typeof s === 'string' ? s : s.name;
                    let parts = soundName.split(':');
                    
                    // e.g., "modid:block/wood" -> "sounds/modid/block/wood"
                    let bedrockName = parts.length > 1 ? `sounds/${parts[0]}/${parts[1]}` : `sounds/minecraft/${soundName}`;
                    
                    // Maintain volume/pitch if represented as an object
                    if (typeof s === 'object') {
                        return {
                            ...s,
                            name: bedrockName
                        };
                    }
                    return bedrockName;
                });

                bedrockSoundsData.sound_definitions[eventName] = {
                    "category": eventData.category || "neutral",
                    "sounds": bedrockSoundsList
                };
            }

            rpFolder.file("sounds/sound_definitions.json", JSON.stringify(bedrockSoundsData, null, 4));
        }

        updateStatus('Packaging Addon...', 'Compressing file to .mcaddon format');
        
        // Generate the final mcaddon
        const content = await addonZip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: 5
            }
        });
        
        // Show success
        updateStatus('Addon Ready!', `Converted ${fileCount} assets successfully.`, false);
        
        // Setup download link
        const url = URL.createObjectURL(content);
        downloadBtn.href = url;
        downloadBtn.download = `${modNameBase}.mcaddon`;
        downloadBtn.classList.remove('hidden');
        
    } catch (error) {
        console.error(error);
        updateStatus('Conversion Failed', error.message || 'An error occurred during conversion.', false);
        spinner.classList.add('hidden');
    }
}
