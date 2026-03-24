importScripts("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");

function parseJSON(str) {
    try {
        let cleaned = str.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)|(,\s*(?=[\]}]))/g, (m, g1, g2) => {
            if (g1) return "";
            if (g2) return "";
            return m;
        });
        return JSON.parse(cleaned);
    } catch(e) {
        return JSON.parse(str);
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class Validator {
    constructor() {
        this.issues = [];
    }

    addIssue(path, message, severity = 'WARNING') {
        this.issues.push({ path, error: message, severity });
    }

    validateBlock(fullId, blockData) {
        if (!fullId.includes(':')) {
            this.addIssue(fullId, "Block identifier missing namespace.", "WARNING");
        }
        if (!blockData["minecraft:block"]?.components?.["minecraft:material_instances"]) {
            this.addIssue(fullId, "Block missing material instances (textures).", "ERROR");
        }
    }

    validateItem(fullId, itemData) {
        if (!fullId.includes(':')) {
            this.addIssue(fullId, "Item identifier missing namespace.", "WARNING");
        }
    }

    getResults() {
        return this.issues;
    }
}

self.onmessage = function (e) {
    if (e.data.type === 'start') {
        const converter = new ModConverter(e.data.file, e.data.options);
        converter.process();
    }
};

class ModConverter {
    constructor(file, options = {}) {
        this.file = file;
        this.options = options;
        this.modNameBase = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, '_');

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
        this.blockProperties = {};
        this.scriptsList = [];
        this.biomesClientData = { "biomes": {} };

        this.fileCount = 0;
        this.skippedClasses = 0;
        this.warnings = [];

        // Initialize manifests
        this.bpManifest = this.generateManifest('data', `${this.modNameBase} Behaviors`, "Converted Java Mod Behaviors");
        this.rpManifest = this.generateManifest('resources', `${this.modNameBase} Resources`, "Converted Java Mod Resources");
        this.languages = new Set();
    }

    generateManifest(type, name, description) {
        const headerUUID = generateUUID();
        const moduleUUID = generateUUID();

        return {
            "format_version": 2,
            "header": {
                "name": name,
                "description": description,
                "uuid": headerUUID,
                "version": [1, 0, 0],
                "min_engine_version": [1, 19, 0]
            },
            "modules": [
                {
                    "type": type === 'resources' ? 'resources' : 'data',
                    "uuid": moduleUUID,
                    "version": [1, 0, 0]
                }
            ]
        };
    }

    logWarning(path, error) {
        if (path.includes('/lang/') && error instanceof SyntaxError) return;
        console.warn(`[ModConverter] Error processing ${path}:`, error);
        this.warnings.push({ path, error: error.message || String(error) });
    }

    async process() {
        self.postMessage({ type: 'status', title: 'Processing...', desc: `Reading ${this.file.name}`, isLoading: true });

        try {
            const zip = new JSZip();
            this.loadedZip = await zip.loadAsync(this.file);
            this.addonZip = new JSZip();

            this.bpFolder = this.addonZip.folder(`${this.modNameBase}_BP`);
            this.rpFolder = this.addonZip.folder(`${this.modNameBase}_RP`);

            // Phase 1: SCAN
            self.postMessage({ type: 'status', title: 'Scanning...', desc: 'Analyzing Java Mod structure', isLoading: true, percent: 5 });
            const files = this.scan();
            this.totalFiles = files.length;
            this.validator = new Validator();

            // Phase 2: PARSE & TRANSFORM (Current hybrid loop)
            // We iterate through scanned files and process them
            self.postMessage({ type: 'status', title: 'Converting Assets...', desc: 'Transforming Java files to Bedrock', isLoading: true, percent: 10 });
            for (const file of files) {
                try {
                    await this.categorizeAndProcessFile(file.path, file.entry);
                } catch (e) {
                    this.logWarning(file.path, e);
                    this.incrementCounter();
                }
            }

            // Phase 3: VALIDATE & GENERATE REGISTRIES
            self.postMessage({ type: 'status', title: 'Building Registries...', desc: 'Generating Textures, Blocks & Sound Definitions', isLoading: true, percent: 85 });
            await this.generateBlocks();
            await this.generateTexturesRegistry();
            await this.generateFlipbooks();
            await this.generateSoundDefinitions();

            // Additional logic for manifests, languages, biomes
            this.finalizeAddon();

            self.postMessage({ type: 'status', title: 'Packaging Addon...', desc: 'Compressing file to .mcaddon format', isLoading: true, percent: 95 });

            const content = await this.addonZip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 5 },
                streamFiles: true
            }, function updateCallback(metadata) {
                self.postMessage({ type: 'status', title: 'Packaging Addon...', desc: `Compressing ${metadata.percent.toFixed(1)}%`, isLoading: true, percent: metadata.percent });
            });

            this.warnings.push(...this.validator.getResults());

            self.postMessage({
                type: 'success',
                blob: content,
                fileName: `${this.modNameBase}.mcaddon`,
                count: this.fileCount,
                warnings: this.warnings
            });

        } catch (error) {
            self.postMessage({ type: 'error', message: error.message || 'An error occurred during conversion.', warnings: this.warnings });
        }
    }

    scan() {
        const files = [];
        for (const [relativePath, zipEntry] of Object.entries(this.loadedZip.files)) {
            if (zipEntry.dir) continue;
            files.push({ path: relativePath, entry: zipEntry });
        }
        return files;
    }

    finalizeAddon() {
        if (this.languages.size > 0) {
            this.rpFolder.file("texts/languages.json", JSON.stringify(Array.from(this.languages), null, 4));
        }

        if (Object.keys(this.biomesClientData.biomes).length > 0) {
            this.rpFolder.file("biomes_client.json", JSON.stringify(this.biomesClientData, null, 4));
        }

        if (this.scriptsList.length > 0) {
            this.bpManifest.modules.push({
                "type": "script",
                "language": "javascript",
                "uuid": generateUUID(),
                "entry": "scripts/main.js",
                "version": [1, 0, 0]
            });
            this.bpManifest.dependencies = [
                { "module_name": "@minecraft/server", "version": "1.0.0" }
            ];
            let mainJs = "";
            for (let scr of this.scriptsList) {
                mainJs += `import "./${scr}";\n`;
            }
            this.bpFolder.file("scripts/main.js", mainJs);
        }

        this.rpFolder.file("manifest.json", JSON.stringify(this.rpManifest, null, 4));
        this.bpFolder.file("manifest.json", JSON.stringify(this.bpManifest, null, 4));
    }

    async loadModel(modelId) {
        if (!modelId) return null;
        let [namespace, path] = modelId.includes(':') ? modelId.split(':') : ['minecraft', modelId];
        let fullPath = `assets/${namespace}/models/${path}.json`;
        
        const zipEntry = this.loadedZip.file(fullPath);
        if (!zipEntry) return null;

        let content = await zipEntry.async('string');
        let parsed = parseJSON(content);

        if (parsed.parent) {
            let parentModel = await this.loadModel(parsed.parent);
            if (parentModel) {
                // Inheritance merge
                if (!parsed.elements && parentModel.elements) {
                    parsed.elements = JSON.parse(JSON.stringify(parentModel.elements));
                }
                parsed.textures = { ...parentModel.textures, ...parsed.textures };
            }
        }
        return parsed;
    }

    resolveTextureMapping(textureRef, textures) {
        if (!textureRef) return null;
        if (textureRef.startsWith('#')) {
            let key = textureRef.substring(1);
            if (textures && textures[key]) {
                return this.resolveTextureMapping(textures[key], textures);
            }
            return null;
        }
        return textureRef;
    }

    incrementCounter() {
        this.fileCount++;
        const percent = (this.fileCount / this.totalFiles) * 100;
        if (this.fileCount % 10 === 0 || this.fileCount === this.totalFiles) {
            self.postMessage({ type: 'status', title: 'Converting Assets...', desc: `Migrated ${this.fileCount} / ${this.totalFiles} files`, isLoading: true, percent });
        }
    }

    async categorizeAndProcessFile(relativePath, zipEntry) {
        if (relativePath.endsWith('.class')) {
            this.skippedClasses++;
            this.incrementCounter();
            return;
        }

        // JAVASCRIPT / SCRIPTS
        if (relativePath.endsWith('.js')) {
            try {
                const fileContent = await zipEntry.async('string');
                let scriptName = relativePath.split('/').pop();
                
                let finalName = scriptName;
                let counter = 1;
                while(this.scriptsList.includes(finalName)) {
                    finalName = scriptName.replace('.js', `_${counter}.js`);
                    counter++;
                }
                this.scriptsList.push(finalName);
                
                this.bpFolder.file(`scripts/${finalName}`, fileContent);
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

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
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // TEXTURES
        const textureMatch = relativePath.match(/^assets\/([^/]+)\/textures\/(.*\.(png|tga|jpg|jpeg))$/);
        if (textureMatch) {
            try {
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
            } catch (e) {
                this.logWarning(relativePath, e);
            }
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
                const parsed = parseJSON(fileContent);

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
                    this.incrementCounter();
                }
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // SOUNDS
        const soundMatch = relativePath.match(/^assets\/([^/]+)\/sounds\/(.*\.(ogg|wav))$/);
        if (soundMatch) {
            try {
                const namespace = soundMatch[1];
                const soundPath = soundMatch[2];
                const fileContent = await zipEntry.async('arraybuffer');
                this.rpFolder.file(`sounds/${namespace}/${soundPath}`, fileContent);
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // SOUNDS.JSON
        const soundsJsonMatch = relativePath.match(/^assets\/([^/]+)\/sounds\.json$/);
        if (soundsJsonMatch) {
            try {
                const fileContent = await zipEntry.async('string');
                const parsed = parseJSON(fileContent);
                if (!this.javaSoundsJson) this.javaSoundsJson = {};
                Object.assign(this.javaSoundsJson, parsed);
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // LANGUAGES
        const langMatch = relativePath.match(/^assets\/([^/]+)\/lang\/(.*)\.json$/);
        if (langMatch) {
            try {
                const namespace = langMatch[1];
                let langCode = langMatch[2].toLowerCase();

                const langParts = langCode.split('_');
                if (langParts.length === 2) {
                    langCode = `${langParts[0]}_${langParts[1].toUpperCase()}`;
                } else if (langCode === 'en_us') {
                    langCode = 'en_US';
                }

                this.languages.add(langCode);

                const fileContent = await zipEntry.async('string');
                const parsed = parseJSON(fileContent);
                let langLines = [];

                for (const [key, value] of Object.entries(parsed)) {
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
                    } else {
                        langLines.push(`${key}=${value}`);
                    }
                }

                if (langLines.length > 0) {
                    const textContent = langLines.join('\n');
                    this.rpFolder.file(`texts/${langCode}.lang`, textContent);
                    this.incrementCounter();
                }
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // RECIPES
        const recipeMatch = relativePath.match(/^data\/([^/]+)\/(?:recipes|recipe)\/(.*)\.json$/);
        if (recipeMatch) {
            try {
                const namespace = recipeMatch[1];
                const recipeId = recipeMatch[2];
                const fileContent = await zipEntry.async('string');
                const parsed = parseJSON(fileContent);

                let bedrockRecipe = {
                    "format_version": "1.12.0"
                };

                const formatId = (id) => {
                    if (!id || typeof id !== 'string') return "minecraft:air";
                    return id.includes(':') ? id : `minecraft:${id}`;
                };

                if (parsed.type === 'minecraft:crafting_shaped') {
                    bedrockRecipe["minecraft:recipe_shaped"] = {
                        "description": { "identifier": `${namespace}:${recipeId}` },
                        "tags": ["crafting_table"],
                        "pattern": parsed.pattern || ["###", "###", "###"],
                        "key": {},
                        "result": typeof parsed.result === 'string' ? { "item": formatId(parsed.result) } : { "item": formatId(parsed.result?.item), "count": parsed.result?.count || 1 }
                    };

                    for (const [k, v] of Object.entries(parsed.key || {})) {
                        bedrockRecipe["minecraft:recipe_shaped"].key[k] = { "item": formatId(v?.item || v?.tag || "minecraft:air") };
                    }
                    this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                    this.incrementCounter();

                } else if (parsed.type === 'minecraft:crafting_shapeless') {
                    bedrockRecipe["minecraft:recipe_shapeless"] = {
                        "description": { "identifier": `${namespace}:${recipeId}` },
                        "tags": ["crafting_table"],
                        "ingredients": (parsed.ingredients || []).map(i => ({ "item": formatId(i?.item || i?.tag || "minecraft:air") })),
                        "result": typeof parsed.result === 'string' ? { "item": formatId(parsed.result) } : { "item": formatId(parsed.result?.item), "count": parsed.result?.count || 1 }
                    };
                    this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                    this.incrementCounter();

                } else if (parsed.type === 'minecraft:smelting' || parsed.type === 'minecraft:blasting' || parsed.type === 'minecraft:campfire_cooking') {
                    bedrockRecipe["minecraft:recipe_furnace"] = {
                        "description": { "identifier": `${namespace}:${recipeId}` },
                        "tags": [parsed.type === 'minecraft:smelting' ? "furnace" : (parsed.type === 'minecraft:blasting' ? "blast_furnace" : "campfire")],
                        "input": formatId(parsed.ingredient?.item || parsed.ingredient?.tag),
                        "output": formatId(typeof parsed.result === 'string' ? parsed.result : parsed.result?.item)
                    };
                    this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                    this.incrementCounter();
                } else if (parsed.type === 'minecraft:stonecutting') {
                    bedrockRecipe["minecraft:recipe_shapeless"] = {
                        "description": { "identifier": `${namespace}:${recipeId}` },
                        "tags": ["stonecutter"],
                        "ingredients": [{ "item": formatId(parsed.ingredient?.item || parsed.ingredient?.tag) }],
                        "result": typeof parsed.result === 'string' ? { "item": formatId(parsed.result) } : { "item": formatId(parsed.result?.item), "count": parsed.result?.count || 1 }
                    };
                    this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                    this.incrementCounter();
                } else if (parsed.type === 'minecraft:smithing') {
                    bedrockRecipe["minecraft:recipe_smithing_transform"] = {
                        "description": { "identifier": `${namespace}:${recipeId}` },
                        "tags": ["smithing_table"],
                        "template": typeof parsed.template === 'object' ? formatId(parsed.template?.item || parsed.template?.tag) : formatId(parsed.template),
                        "base": formatId(parsed.base?.item || parsed.base?.tag),
                        "addition": formatId(parsed.addition?.item || parsed.addition?.tag),
                        "result": formatId(typeof parsed.result === 'string' ? parsed.result : parsed.result?.item)
                    };
                    this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                    this.incrementCounter();
                } else {
                    bedrockRecipe["minecraft:recipe_shapeless"] = {
                        "description": { "identifier": `${namespace}:${recipeId}` },
                        "tags": [parsed.type ? parsed.type.replace(':', '_') : "custom_machine"],
                        "ingredients": [],
                        "result": { "item": formatId("minecraft:air") }
                    };
                    if (parsed.ingredients) {
                        bedrockRecipe["minecraft:recipe_shapeless"].ingredients = parsed.ingredients.map(i => ({ "item": formatId(i.item || i.tag || "minecraft:air") }));
                    } else if (parsed.ingredient) {
                        bedrockRecipe["minecraft:recipe_shapeless"].ingredients = [{ "item": formatId(parsed.ingredient.item || parsed.ingredient.tag || "minecraft:air") }];
                    }
                    if (parsed.result) {
                        bedrockRecipe["minecraft:recipe_shapeless"].result = typeof parsed.result === 'string' ? { "item": formatId(parsed.result) } : { "item": formatId(parsed.result.item || "minecraft:air"), "count": parsed.result.count || 1 };
                    }
                    this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                    this.incrementCounter();
                }
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // LOOT TABLES
        const lootMatch = relativePath.match(/^data\/([^/]+)\/(?:loot_tables|loot_table)\/(.*)\.json$/);
        if (lootMatch) {
            try {
                const namespace = lootMatch[1];
                const lootPath = lootMatch[2];
                const fileContent = await zipEntry.async('string');
                const parsed = parseJSON(fileContent);

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
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // BIOMES
        const biomeMatch = relativePath.match(/^data\/([^/]+)\/worldgen\/biome\/(.*)\.json$/);
        if (biomeMatch) {
            try {
                const namespace = biomeMatch[1];
                const biomeId = biomeMatch[2];
                const fileContent = await zipEntry.async('string');
                const parsed = parseJSON(fileContent);

                const hexColor = (colorInt) => {
                    if (typeof colorInt === 'number') {
                        return '#' + colorInt.toString(16).padStart(6, '0');
                    }
                    if (typeof colorInt === 'string' && colorInt.startsWith('#')) return colorInt;
                    return "#FFFFFF";
                };

                const bpBiome = {
                    "format_version": "1.21.0",
                    "minecraft:biome": {
                        "description": {
                            "identifier": `${namespace}:${biomeId}`
                        },
                        "components": {}
                    }
                };

                const climate = {};
                if (parsed.temperature !== undefined) climate.temperature = parsed.temperature;
                if (parsed.downfall !== undefined) climate.downfall = parsed.downfall;

                if (Object.keys(climate).length > 0) {
                    bpBiome["minecraft:biome"].components["minecraft:climate"] = climate;
                }

                this.rpFolder.file(`biomes/${biomeId}.client_biomes.json`, JSON.stringify(bpBiome, null, 4));

                let effects = parsed.effects || {};
                const clientBiomeObj = {};
                
                if (effects.water_color !== undefined) {
                    clientBiomeObj.water_surface_color = hexColor(effects.water_color);
                }
                clientBiomeObj.fog_identifier = "minecraft:fog_default"; // fallback
                
                if (effects.water_fog_color !== undefined) {
                    clientBiomeObj.water_surface_transparency = 0.65;
                }

                if (Object.keys(clientBiomeObj).length > 0) {
                    this.biomesClientData.biomes[biomeId] = clientBiomeObj;
                }
                
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // TAGS
        const tagMatch = relativePath.match(/^data\/([^/]+)\/tags\/blocks\/(.*)\.json$/);
        if (tagMatch) {
            try {
                const tagId = tagMatch[2];
                const fileContent = await zipEntry.async('string');
                const parsed = parseJSON(fileContent);
                if (parsed.values) {
                    for (const v of parsed.values) {
                        const blockId = v.replace('minecraft:', '').replace(tagMatch[1] + ':', '');
                        if (!this.blockTags[blockId]) this.blockTags[blockId] = [];
                        this.blockTags[blockId].push(tagId);
                    }
                    this.incrementCounter();
                }
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // PARTICLES
        const particleMatch = relativePath.match(/^assets\/([^/]+)\/particles\/(.*)\.json$/);
        if (particleMatch) {
            try {
                const fileContent = await zipEntry.async('string');
                this.rpFolder.file(`particles/${particleMatch[2]}.json`, fileContent);
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // BLOCK MODELS -> BEDROCK GEOMETRY
        const blockModelMatch = relativePath.match(/^assets\/([^/]+)\/models\/block\/(.*)\.json$/);
        if (blockModelMatch && this.options.convertModels !== false) {
            try {
                const namespace = blockModelMatch[1];
                const modelName = blockModelMatch[2];
                const modelId = `${namespace}:block/${modelName}`;
                
                let parsed = await this.loadModel(modelId);
                if (!parsed) return;

                if (parsed.elements) {
                    const cubes = parsed.elements.map(el => {
                        let size = [el.to[0] - el.from[0], el.to[1] - el.from[1], el.to[2] - el.from[2]];
                        
                        // Resolve UV from faces
                        let uv = [0, 0];
                        if (el.faces) {
                            let face = el.faces.up || el.faces.north || el.faces.all || Object.values(el.faces)[0];
                            if (face && face.uv) uv = [face.uv[0], face.uv[1]];
                        }

                        let cube = { "origin": el.from, "size": size, "uv": uv };
                        
                        if (el.rotation) {
                            cube.pivot = el.rotation.origin || [8, 8, 8];
                            let rot = [0, 0, 0];
                            if (el.rotation.axis === 'x') rot[0] = el.rotation.angle;
                            if (el.rotation.axis === 'y') rot[1] = el.rotation.angle;
                            if (el.rotation.axis === 'z') rot[2] = el.rotation.angle;
                            cube.rotation = rot;
                        }
                        return cube;
                    });

                    const geoId = modelName.replace(/\//g, '.');
                    const geo = {
                        "format_version": "1.12.0",
                        "minecraft:geometry": [{
                            "description": {
                                "identifier": `geometry.${geoId}`,
                                "texture_width": 16, "texture_height": 16,
                                "visible_bounds_width": 2, "visible_bounds_height": 2
                            },
                            "bones": [{ "name": "bone", "pivot": [8, 8, 8], "cubes": cubes }]
                        }]
                    };
                    this.rpFolder.file(`models/blocks/${geoId}.geo.json`, JSON.stringify(geo, null, 4));
                    this.geometries.add(geoId);
                    
                    // Register textures if found in model
                    if (parsed.textures) {
                        for (let [texKey, texPath] of Object.entries(parsed.textures)) {
                            let resolvedPath = this.resolveTextureMapping(texPath, parsed.textures);
                            if (resolvedPath && !resolvedPath.startsWith('#')) {
                                let texName = resolvedPath.split('/').pop();
                                this.blockTexturesRegistry[texName] = `textures/blocks/${texName}`;
                            }
                        }
                    }

                    this.incrementCounter();
                }
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // ANIMATIONS & CONTROLLERS (GeckoLib or Bedrock defaults)
        const animMatch = relativePath.match(/^(?:assets|data)\/([^/]+)\/(animations|animation_controllers)\/(.*)\.json$/);
        if (animMatch) {
            try {
                const folderName = animMatch[2];
                const fileName = animMatch[3];
                const fileContent = await zipEntry.async('string');

                // Inspect for GeckoLib complexities and ensure Bedrock JSON formatting
                const parsed = parseJSON(fileContent);
                if (parsed.format_version || parsed.geckolib_format_version) {
                    if (parsed.geckolib_format_version) {
                        parsed.format_version = parsed.geckolib_format_version;
                        delete parsed.geckolib_format_version;
                    }
                    const serialized = JSON.stringify(parsed, null, 4);
                    this.rpFolder.file(`${folderName}/${fileName}.json`, serialized);
                    this.bpFolder.file(`${folderName}/${fileName}.json`, serialized);
                } else {
                    this.rpFolder.file(`${folderName}/${fileName}.json`, fileContent);
                    this.bpFolder.file(`${folderName}/${fileName}.json`, fileContent);
                }
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
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
                this.validator.validateItem(`${namespace}:${itemId}`, bedrockItem);
                this.bpFolder.file(`items/${itemId}.json`, JSON.stringify(bedrockItem, null, 4));
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // BLOCKSTATES -> BP BLOCKS
        const blockstateMatch = relativePath.match(/^assets\/([^/]+)\/blockstates\/(.*)\.json$/);
        if (blockstateMatch) {
            try {
                const namespace = blockstateMatch[1];
                const blockId = blockstateMatch[2];
                this.blocks.add(`${namespace}:${blockId}`);

                const fileContent = await zipEntry.async('string');
                const parsed = JSON.parse(fileContent);

                let properties = {};
                if (parsed.variants) {
                    for (const key of Object.keys(parsed.variants)) {
                        if (key === "") continue;
                        const props = key.split(',');
                        for (const p of props) {
                            const [k, v] = p.split('=');
                            if (k && v) {
                                if (!properties[k]) properties[k] = new Set();
                                properties[k].add(v);
                            }
                        }
                    }
                }

                const finalProps = {};
                for (const [k, v] of Object.entries(properties)) {
                    finalProps[k] = Array.from(v);
                }

                this.blockProperties[`${namespace}:${blockId}`] = {
                    properties: finalProps,
                    hasLogic: Object.keys(finalProps).length > 0
                };
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }
    }

    async generateBlocks() {
        try {
            for (const fullId of this.blocks) {
                const parts = fullId.split(':');
                const namespace = parts[0];
                const blockId = parts[1];

                let destroyTime = 1.0;
                let explosionRes = 1.0;

                const isWood = blockId.includes("wood") || blockId.includes("log") || blockId.includes("plank") || blockId.includes("door") || blockId.includes("fence") || blockId.includes("chest");
                const isMetal = blockId.includes("iron") || blockId.includes("gold") || blockId.includes("copper") || blockId.includes("brass") || blockId.includes("steel") || blockId.includes("netherite") || blockId.includes("machine") || blockId.includes("block");
                const isGlass = blockId.includes("glass");
                const isStone = blockId.includes("stone") || blockId.includes("cobble") || blockId.includes("brick") || blockId.includes("obsidian") || blockId.includes("ore") || blockId.includes("furnace");
                const isDirt = blockId.includes("dirt") || blockId.includes("sand") || blockId.includes("gravel") || blockId.includes("clay") || blockId.includes("mud");
                const isLeaves = blockId.includes("leave") || blockId.includes("foliage") || blockId.includes("plant") || blockId.includes("flower") || blockId.includes("grass");

                if (blockId.includes("obsidian")) { destroyTime = 50.0; explosionRes = 1200.0; }
                else if (isMetal) { destroyTime = 5.0; explosionRes = 6.0; }
                else if (isStone) { destroyTime = 1.5; explosionRes = 6.0; }
                else if (isWood) { destroyTime = 2.0; explosionRes = 3.0; }
                else if (isDirt) { destroyTime = 0.5; explosionRes = 0.5; }
                else if (isGlass) { destroyTime = 0.3; explosionRes = 0.3; }
                else if (isLeaves) { destroyTime = 0.2; explosionRes = 0.2; }

                const bedrockBlock = { "format_version": "1.16.100", "minecraft:block": { "description": { "identifier": fullId, "is_experimental": false, "register_to_creative_menu": true }, "components": { "minecraft:material_instances": { "*": { "texture": blockId, "render_method": "alpha_test" } }, "minecraft:destroy_time": destroyTime, "minecraft:explosion_resistance": explosionRes } } };

                const bProps = this.blockProperties[fullId];
                if (bProps && bProps.hasLogic) {
                    bedrockBlock["minecraft:block"].description.properties = {};
                    bedrockBlock["minecraft:block"].permutations = [];

                    bedrockBlock["minecraft:block"].components["minecraft:ticking"] = {
                        "looping": true,
                        "range": [1, 1],
                        "on_tick": { "event": "on_tick_event" }
                    };
                    bedrockBlock["minecraft:block"].events = {
                        "on_tick_event": {}
                    };

                    for (const [k, v] of Object.entries(bProps.properties)) {
                        let propName = `${namespace}:${k}`;
                        let values = v.map(val => {
                            if (val === 'true') return true;
                            if (val === 'false') return false;
                            if (!isNaN(val)) return parseInt(val);
                            return val;
                        });
                        bedrockBlock["minecraft:block"].description.properties[propName] = values;

                        for (const val of values) {
                            bedrockBlock["minecraft:block"].permutations.push({
                                "condition": `query.block_property('${propName}') == ${(typeof val === 'string') ? "'" + val + "'" : val}`,
                                "components": {}
                            });
                        }
                    }
                }

                if (this.geometries.has(blockId)) {
                    bedrockBlock["minecraft:block"].components["minecraft:geometry"] = `geometry.${blockId}`;
                }
                if (this.blockTags[blockId]) {
                    for (const tag of this.blockTags[blockId]) {
                        const tagKey = `tag:${tag.replace('/', '_')}`;
                        bedrockBlock["minecraft:block"].components[tagKey] = {};
                    }
                }

                let isRedstoneOrMachine = blockId.includes('redstone') || blockId.includes('machine') || blockId.includes('generator') || blockId.includes('cable') || blockId.includes('wire') || blockId.includes('furnace') || blockId.includes('smelter');
                if (isRedstoneOrMachine) {
                    bedrockBlock["minecraft:block"].components["minecraft:redstone_conductivity"] = {
                        "redstone_conductor": true
                    };
                    bedrockBlock["minecraft:block"].components["minecraft:on_interact"] = {
                        "condition": "query.is_sneaking",
                        "event": "on_interact_event"
                    };
                    if (!bedrockBlock["minecraft:block"].events) bedrockBlock["minecraft:block"].events = {};
                    if (!bedrockBlock["minecraft:block"].events["on_interact_event"]) bedrockBlock["minecraft:block"].events["on_interact_event"] = {};
                }

                this.validator.validateBlock(fullId, bedrockBlock);
                this.bpFolder.file(`blocks/${blockId}.json`, JSON.stringify(bedrockBlock, null, 4));
            }
        } catch (e) {
            this.logWarning("generateBlocks() loop", e);
        }
    }

    async generateTexturesRegistry() {
        try {
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

            const itemData = {
                "resource_pack_name": "converted",
                "texture_name": "atlas.items",
                "texture_data": {}
            };
            for (const [name, path] of Object.entries(this.itemTexturesRegistry)) {
                itemData.texture_data[name] = { "textures": path };
            }
            this.rpFolder.file("textures/item_texture.json", JSON.stringify(itemData, null, 4));
        } catch (e) {
            this.logWarning("generateTexturesRegistry() loop", e);
        }
    }

    async generateFlipbooks() {
        if (this.flipbookTextures.length > 0) {
            try {
                this.rpFolder.file("textures/flipbook_textures.json", JSON.stringify(this.flipbookTextures, null, 4));
            } catch (e) {
                this.logWarning("textures/flipbook_textures.json", e);
            }
        }
    }

    async generateSoundDefinitions() {
        try {
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

                        let namespace = parts.length > 1 ? parts[0] : 'minecraft';
                        let path = parts.length > 1 ? parts[1] : soundName;
                        let bedrockName = `sounds/${namespace}/${path}`;

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

            if (this.blocks.size > 0) {
                const rpSoundsJson = {
                    "block_sounds": {},
                    "entity_sounds": { "entities": {} },
                    "individual_event_sounds": { "events": {} }
                };

                for (const fullId of this.blocks) {
                    const isWood = fullId.includes("wood") || fullId.includes("log") || fullId.includes("plank") || fullId.includes("door") || fullId.includes("fence");
                    const isMetal = fullId.includes("iron") || fullId.includes("gold") || fullId.includes("copper") || fullId.includes("brass") || fullId.includes("steel");
                    const isGlass = fullId.includes("glass");

                    let soundType = "stone";
                    if (isWood) soundType = "wood";
                    else if (isMetal) soundType = "metal";
                    else if (isGlass) soundType = "glass";

                    rpSoundsJson.block_sounds[fullId] = {
                        "events": {
                            "place": { "sound": `use.${soundType}`, "volume": 1.0, "pitch": 1.0 },
                            "break": { "sound": `dig.${soundType}`, "volume": 1.0, "pitch": 1.0 },
                            "hit": { "sound": `dig.${soundType}`, "volume": 0.5, "pitch": 1.0 },
                            "step": { "sound": `step.${soundType}`, "volume": 0.5, "pitch": 1.0 },
                            "fall": { "sound": `step.${soundType}`, "volume": 0.8, "pitch": 1.0 }
                        }
                    };
                }
                this.rpFolder.file("sounds.json", JSON.stringify(rpSoundsJson, null, 4));
            }
        } catch (e) {
            this.logWarning("generateSoundDefinitions() loop", e);
        }
    }
}


