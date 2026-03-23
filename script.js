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

    const converter = new ModConverter(file);
    converter.process();
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

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

class ModConverter {
    constructor(file) {
        this.file = file;
        this.modNameBase = file.name.replace('.jar', '').replace('.zip', '');
        
        // Registries
        this.namespaces = new Set();
        this.blocks = new Set();
        this.items = new Set();
        this.geometries = new Set();
        this.blockTags = {};
        
        this.blockTexturesRegistry = {};
        this.itemTexturesRegistry = {};
        this.flipbookTextures = [];
        this.javaSoundsJson = null;
        
        this.fileCount = 0;
    }

    generateManifest(type, name, description) {
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
    }

    async process() {
        updateStatus('Processing...', `Reading ${this.file.name}`);
        downloadBtn.classList.add('hidden');

        try {
            const zip = new JSZip();
            this.loadedZip = await zip.loadAsync(this.file);
            this.addonZip = new JSZip();
            
            this.bpFolder = this.addonZip.folder(`${this.modNameBase}_BP`);
            this.rpFolder = this.addonZip.folder(`${this.modNameBase}_RP`);
            
            updateStatus('Generating Assets...', 'Creating Bedrock manifests');
            this.bpFolder.file("manifest.json", this.generateManifest('data', `${this.modNameBase} Behaviors`, "1:1 Conversion Attempt from Java Edition"));
            this.rpFolder.file("manifest.json", this.generateManifest('resources', `${this.modNameBase} Resources`, "1:1 Conversion Attempt from Java Edition"));
            
            updateStatus('Extracting Assets...', 'Scanning Java Mod Structure');
            
            // Phase 1: Categorize and parse all files sequentially to save memory
            for (const [relativePath, zipEntry] of Object.entries(this.loadedZip.files)) {
                if (zipEntry.dir) continue;
                await this.categorizeAndProcessFile(relativePath, zipEntry);
            }
            
            // Phase 2: Generate cross-dependent Bedrock registries
            updateStatus('Building Registries...', 'Generating Textures, Blocks & Sound Definitions');
            await this.generateBlocks();
            await this.generateTexturesRegistry();
            await this.generateFlipbooks();
            await this.generateSoundDefinitions();
            
            updateStatus('Packaging Addon...', 'Compressing file to .mcaddon format');
            
            const content = await this.addonZip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 5 }
            });
            
            updateStatus('Addon Ready!', `Converted ${this.fileCount} assets successfully!`, false);
            
            const url = URL.createObjectURL(content);
            downloadBtn.href = url;
            downloadBtn.download = `${this.modNameBase}.mcaddon`;
            downloadBtn.classList.remove('hidden');
            
        } catch (error) {
            console.error(error);
            updateStatus('Conversion Failed', error.message || 'An error occurred during conversion.', false);
        }
    }
    
    incrementCounter() {
        this.fileCount++;
        if (this.fileCount % 50 === 0) {
            updateStatus('Converting Assets...', `Migrated ${this.fileCount} files`);
        }
    }

    async categorizeAndProcessFile(relativePath, zipEntry) {
        // Namespace extraction
        const namespaceMatch = relativePath.match(/^(?:assets|data)\/([^/]+)\//);
        if (namespaceMatch) {
            this.namespaces.add(namespaceMatch[1]);
        }

        // PACK ICON
        if (relativePath.toLowerCase() === 'pack.png' || relativePath.toLowerCase() === 'icon.png' || relativePath.toLowerCase() === 'logo.png') {
            try {
                const fileContent = await zipEntry.async('arraybuffer');
                this.bpFolder.file("pack_icon.png", fileContent);
                this.rpFolder.file("pack_icon.png", fileContent);
                this.incrementCounter();
            } catch(e) {}
            return;
        }

        // TEXTURES
        const textureMatch = relativePath.match(/^assets\/([^/]+)\/textures\/(.*\.(png|tga|jpg|jpeg))$/);
        if (textureMatch) {
            const namespace = textureMatch[1];
            const texturePath = textureMatch[2]; // e.g. "block/stone.png"
            const parsedPath = texturePath.split('/');
            const type = parsedPath[0]; // "block", "item", etc.
            const name = parsedPath[parsedPath.length - 1].split('.')[0];
            
            const fileContent = await zipEntry.async('arraybuffer');
            
            if (type === 'block') {
                this.rpFolder.file(`textures/blocks/${name}.png`, fileContent);
                this.blockTexturesRegistry[name] = `textures/blocks/${name}`;
            } else if (type === 'item') {
                this.rpFolder.file(`textures/items/${name}.png`, fileContent);
                this.itemTexturesRegistry[name] = `textures/items/${name}`;
            } else {
                this.rpFolder.file(`textures/${texturePath}`, fileContent);
            }
            
            this.incrementCounter();
            return;
        }

        // MCMETA (ANIMATIONS)
        const mcmetaMatch = relativePath.match(/^assets\/([^/]+)\/textures\/(.*\.png)\.mcmeta$/);
        if (mcmetaMatch) {
            try {
                const texturePathWithExt = mcmetaMatch[2];
                const texturePath = texturePathWithExt.replace(/\.png$/, '');
                const type = texturePath.split('/')[0];
                const name = texturePath.split('/').pop();
                
                const fileContent = await zipEntry.async('string');
                const parsed = JSON.parse(fileContent);

                if (parsed.animation) {
                    let bedrockTexPath = `textures/${texturePath}`;
                    if (type === 'block') bedrockTexPath = `textures/blocks/${name}`;
                    if (type === 'item') bedrockTexPath = `textures/items/${name}`;
                    
                    const flipbook = {
                        "flipbook_texture": bedrockTexPath,
                        "atlas_tile": name,
                        "ticks_per_frame": parsed.animation.frametime || 2
                    };
                    
                    if (parsed.animation.frames) {
                        flipbook.frames = parsed.animation.frames.map(f => typeof f === 'object' ? f.index : f);
                    }
                    this.flipbookTextures.push(flipbook);
                }
            } catch(e) {}
            return;
        }

        // SOUNDS
        const soundMatch = relativePath.match(/^assets\/([^/]+)\/sounds\/(.*\.(ogg|wav))$/);
        if (soundMatch) {
            const namespace = soundMatch[1];
            const soundPath = soundMatch[2];
            const fileContent = await zipEntry.async('arraybuffer');
            this.rpFolder.file(`sounds/${namespace}/${soundPath}`, fileContent);
            this.incrementCounter();
            return;
        }

        // SOUNDS.JSON
        const soundsJsonMatch = relativePath.match(/^assets\/([^/]+)\/sounds\.json$/);
        if (soundsJsonMatch) {
            try {
                const fileContent = await zipEntry.async('string');
                const parsed = JSON.parse(fileContent);
                if (!this.javaSoundsJson) this.javaSoundsJson = {};
                Object.assign(this.javaSoundsJson, parsed);
            } catch(e) {}
            return;
        }

        // LANGUAGES
        const langMatch = relativePath.match(/^assets\/([^/]+)\/lang\/(.*)\.json$/);
        if (langMatch) {
            try {
                const namespace = langMatch[1];
                let langCode = langMatch[2].toLowerCase();
                // map java lang codes to bedrock
                if (langCode === 'en_us') langCode = 'en_US';
                if (langCode === 'de_de') langCode = 'de_DE';
                // ... more mappings could be done, but keeping it simple
                
                const fileContent = await zipEntry.async('string');
                const parsed = JSON.parse(fileContent);
                let langLines = [];
                
                for (const [key, value] of Object.entries(parsed)) {
                    // Java: item.modid.item_name -> Bedrock: item.modid:item_name.name
                    // Java: block.modid.block_name -> Bedrock: tile.modid:block_name.name
                    if (key.startsWith('item.')) {
                        const parts = key.split('.');
                        if (parts.length >= 3) {
                            const ns = parts[1];
                            const id = parts.slice(2).join('_');
                            langLines.push(`item.${ns}:${id}.name=${value}`);
                        }
                    } else if (key.startsWith('block.')) {
                        const parts = key.split('.');
                        if (parts.length >= 3) {
                            const ns = parts[1];
                            const id = parts.slice(2).join('_');
                            langLines.push(`tile.${ns}:${id}.name=${value}`);
                        }
                    } else if (key.startsWith('entity.') || key.startsWith('itemGroup.')) {
                         // Generically translate everything else
                         langLines.push(`${key}=${value}`);
                    } else {
                         langLines.push(`${key}=${value}`);
                    }
                }
                
                if (langLines.length > 0) {
                    const textContent = langLines.join('\n');
                    this.rpFolder.file(`texts/${langCode}.lang`, textContent);
                    // Add default lang indicator
                    if (langCode === 'en_US') {
                        this.rpFolder.file(`texts/languages.json`, JSON.stringify(["en_US"], null, 4));
                    }
                    this.incrementCounter();
                }
            } catch(e) {}
            return;
        }

        // RECIPES
        const recipeMatch = relativePath.match(/^data\/([^/]+)\/(?:recipes|recipe)\/(.*)\.json$/);
        if (recipeMatch) {
            try {
                const namespace = recipeMatch[1];
                const recipeId = recipeMatch[2];
                const fileContent = await zipEntry.async('string');
                const parsed = JSON.parse(fileContent);
                
                let bedrockRecipe = {
                    "format_version": "1.12.0"
                };
                
                // Helper to format item ids
                const formatId = (id) => id.includes(':') ? id : `minecraft:${id}`;

                if (parsed.type === 'minecraft:crafting_shaped') {
                    bedrockRecipe["minecraft:recipe_shaped"] = {
                        "description": { "identifier": `${namespace}:${recipeId}` },
                        "tags": ["crafting_table"],
                        "pattern": parsed.pattern,
                        "key": {},
                        "result": typeof parsed.result === 'string' ? {"item": formatId(parsed.result)} : {"item": formatId(parsed.result.item), "count": parsed.result.count || 1}
                    };
                    
                    for (const [k, v] of Object.entries(parsed.key)) {
                        bedrockRecipe["minecraft:recipe_shaped"].key[k] = {"item": formatId(v.item || v.tag || "minecraft:air")};
                    }
                    this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                    this.incrementCounter();
                    
                } else if (parsed.type === 'minecraft:crafting_shapeless') {
                    bedrockRecipe["minecraft:recipe_shapeless"] = {
                        "description": { "identifier": `${namespace}:${recipeId}` },
                        "tags": ["crafting_table"],
                        "ingredients": parsed.ingredients.map(i => ({"item": formatId(i.item || i.tag || "minecraft:air")})),
                        "result": typeof parsed.result === 'string' ? {"item": formatId(parsed.result)} : {"item": formatId(parsed.result.item), "count": parsed.result.count || 1}
                    };
                    this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                    this.incrementCounter();
                    
                } else if (parsed.type === 'minecraft:smelting') {
                    bedrockRecipe["minecraft:recipe_furnace"] = {
                        "description": { "identifier": `${namespace}:${recipeId}` },
                        "tags": ["furnace"],
                        "input": formatId(parsed.ingredient.item || parsed.ingredient.tag),
                        "output": formatId(typeof parsed.result === 'string' ? parsed.result : parsed.result.item)
                    };
                    this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                    this.incrementCounter();
                }
            } catch(e) {}
            return;
        }

        // LOOT TABLES
        const lootMatch = relativePath.match(/^data\/([^/]+)\/(?:loot_tables|loot_table)\/(.*)\.json$/);
        if (lootMatch) {
            try {
                const namespace = lootMatch[1];
                const lootPath = lootMatch[2];
                const fileContent = await zipEntry.async('string');
                const parsed = JSON.parse(fileContent);
                
                const bedrockLoot = {
                    "pools": []
                };
                
                if (parsed.pools) {
                    for (const pool of parsed.pools) {
                        const bedrockPool = {
                            "rolls": typeof pool.rolls === 'number' ? pool.rolls : (pool.rolls?.min || 1),
                            "entries": []
                        };
                        if (pool.entries) {
                            for (const entry of pool.entries) {
                                if (entry.type === "minecraft:item" && entry.name) {
                                    bedrockPool.entries.push({
                                        "type": "item",
                                        "name": entry.name,
                                        "weight": entry.weight || 1
                                    });
                                }
                            }
                        }
                        bedrockLoot.pools.push(bedrockPool);
                    }
                    this.bpFolder.file(`loot_tables/${lootPath}.json`, JSON.stringify(bedrockLoot, null, 4));
                    this.incrementCounter();
                }
            } catch(e) {}
            return;
        }

        // TAGS
        const tagMatch = relativePath.match(/^data\/([^/]+)\/tags\/blocks\/(.*)\.json$/);
        if (tagMatch) {
            try {
                const tagId = tagMatch[2];
                const fileContent = await zipEntry.async('string');
                const parsed = JSON.parse(fileContent);
                if (parsed.values) {
                    for (const v of parsed.values) {
                        const blockId = v.replace('minecraft:', '').replace(tagMatch[1]+':', '');
                        if (!this.blockTags[blockId]) this.blockTags[blockId] = [];
                        this.blockTags[blockId].push(tagId);
                    }
                }
            } catch(e) {}
            return;
        }

        // PARTICLES
        const particleMatch = relativePath.match(/^assets\/([^/]+)\/particles\/(.*)\.json$/);
        if (particleMatch) {
            try {
                const fileContent = await zipEntry.async('string');
                this.rpFolder.file(`particles/${particleMatch[2]}.json`, fileContent);
                this.incrementCounter();
            } catch(e) {}
            return;
        }

        // BLOCK MODELS -> BEDROCK GEOMETRY
        const blockModelMatch = relativePath.match(/^assets\/([^/]+)\/models\/block\/(.*)\.json$/);
        if (blockModelMatch) {
            try {
                const modelId = blockModelMatch[2];
                const fileContent = await zipEntry.async('string');
                const parsed = JSON.parse(fileContent);
                if (parsed.elements) {
                    const cubes = parsed.elements.map(el => {
                        let cube = { "origin": el.from, "size": [el.to[0]-el.from[0], el.to[1]-el.from[1], el.to[2]-el.from[2]], "uv": [0,0] };
                        if (el.rotation) {
                            cube.pivot = el.rotation.origin || [8,8,8];
                            let rot = [0,0,0];
                            if (el.rotation.axis === 'x') rot[0] = el.rotation.angle;
                            if (el.rotation.axis === 'y') rot[1] = el.rotation.angle;
                            if (el.rotation.axis === 'z') rot[2] = el.rotation.angle;
                            cube.rotation = rot;
                        }
                        return cube;
                    });
                    const geo = {
                        "format_version": "1.12.0",
                        "minecraft:geometry": [{
                            "description": {
                                "identifier": `geometry.${modelId}`,
                                "texture_width": 16, "texture_height": 16,
                                "visible_bounds_width": 2, "visible_bounds_height": 2
                            },
                            "bones": [{ "name": "bone", "pivot": [8,8,8], "cubes": cubes }]
                        }]
                    };
                    this.rpFolder.file(`models/blocks/${modelId}.geo.json`, JSON.stringify(geo, null, 4));
                    this.geometries.add(modelId);
                }
            } catch(e) {}
            return;
        }

        // ITEM MODELS -> BP ITEMS
        const itemModelMatch = relativePath.match(/^assets\/([^/]+)\/models\/item\/(.*)\.json$/);
        if (itemModelMatch) {
            try {
                const namespace = itemModelMatch[1];
                const itemId = itemModelMatch[2];
                this.items.add(`${namespace}:${itemId}`);
                
                const bedrockItem = {
                    "format_version": "1.16.100",
                    "minecraft:item": {
                        "description": {
                            "identifier": `${namespace}:${itemId}`,
                            "category": "nature"
                        },
                        "components": {
                            "minecraft:icon": {
                                "texture": itemId
                            }
                        }
                    }
                };
                this.bpFolder.file(`items/${itemId}.json`, JSON.stringify(bedrockItem, null, 4));
                this.incrementCounter();
            } catch(e) {}
            return;
        }

        // BLOCKSTATES -> BP BLOCKS
        const blockstateMatch = relativePath.match(/^assets\/([^/]+)\/blockstates\/(.*)\.json$/);
        if (blockstateMatch) {
            const namespace = blockstateMatch[1];
            const blockId = blockstateMatch[2];
            this.blocks.add(`${namespace}:${blockId}`);
            return;
        }
    }

    async generateBlocks() {
        for (const fullId of this.blocks) {
            const parts = fullId.split(':');
            const namespace = parts[0];
            const blockId = parts[1];
            const bedrockBlock = { "format_version": "1.16.100", "minecraft:block": { "description": { "identifier": fullId, "is_experimental": false, "register_to_creative_menu": true }, "components": { "minecraft:material_instances": { "*": { "texture": blockId, "render_method": "alpha_test" } }, "minecraft:destroy_time": 1.0, "minecraft:explosion_resistance": 1.0 } } };
            if (this.geometries.has(blockId)) {
                bedrockBlock["minecraft:block"].components["minecraft:geometry"] = `geometry.${blockId}`;
            }
            if (this.blockTags[blockId]) {
                 for (const tag of this.blockTags[blockId]) {
                      const tagKey = `tag:${tag.replace('/', '_')}`;
                      bedrockBlock["minecraft:block"].components[tagKey] = {};
                 }
            }
            this.bpFolder.file(`blocks/${blockId}.json`, JSON.stringify(bedrockBlock, null, 4));
        }
    }

    async generateTexturesRegistry() {
        // terrain_texture.json
        const terrainData = {
            "resource_pack_name": "converted",
            "texture_name": "atlas.terrain",
            "padding": 8,
            "num_mip_levels": 4,
            "texture_data": {}
        };
        for (const [name, path] of Object.entries(this.blockTexturesRegistry)) {
            terrainData.texture_data[name] = { "textures": path };
        }
        this.rpFolder.file("textures/terrain_texture.json", JSON.stringify(terrainData, null, 4));
        
        // item_texture.json
        const itemData = {
            "resource_pack_name": "converted",
            "texture_name": "atlas.items",
            "texture_data": {}
        };
        for (const [name, path] of Object.entries(this.itemTexturesRegistry)) {
            itemData.texture_data[name] = { "textures": path };
        }
        this.rpFolder.file("textures/item_texture.json", JSON.stringify(itemData, null, 4));
    }

    async generateFlipbooks() {
        if (this.flipbookTextures.length > 0) {
            this.rpFolder.file("textures/flipbook_textures.json", JSON.stringify(this.flipbookTextures, null, 4));
        }
    }

    async generateSoundDefinitions() {
        if (this.javaSoundsJson) {
            const bedrockSoundsData = {
                "format_version": "1.14.0",
                "sound_definitions": {}
            };

            for (const [eventName, eventData] of Object.entries(this.javaSoundsJson)) {
                if (!eventData.sounds) continue;

                const bedrockSoundsList = eventData.sounds.map(s => {
                    let soundName = typeof s === 'string' ? s : s.name;
                    let parts = soundName.split(':');
                    
                    let bedrockName = parts.length > 1 ? `sounds/${parts[0]}/${parts[1]}` : `sounds/minecraft/${soundName}`;
                    
                    if (typeof s === 'object') {
                        return { ...s, name: bedrockName };
                    }
                    return bedrockName;
                });

                bedrockSoundsData.sound_definitions[eventName] = {
                    "category": eventData.category || "neutral",
                    "sounds": bedrockSoundsList
                };
            }

            this.rpFolder.file("sounds/sound_definitions.json", JSON.stringify(bedrockSoundsData, null, 4));
        }
    }
}
