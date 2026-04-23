importScripts("vendor/pako.min.js");
importScripts("vendor/nbt.js");
importScripts("simple-zip.js");

function parseJSON(str) {
    try {
        let cleaned = str.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)|(,\s*(?=[\]}]))/g, (m, g1, g2) => {
            if (g1) return "";
            if (g2) return "";
            return m;
        });
        return JSON.parse(cleaned);
    } catch (e) {
        return JSON.parse(str);
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function unwrapNbtValue(tag) {
    if (tag == null) return tag;

    if (tag.type && Object.prototype.hasOwnProperty.call(tag, 'value')) {
        switch (tag.type) {
            case 'compound':
                return unwrapNbtValue(tag.value);
            case 'list':
                return Array.isArray(tag.value?.value) ? tag.value.value.map(unwrapNbtValue) : [];
            default:
                return tag.value;
        }
    }

    if (Array.isArray(tag)) {
        return tag.map(unwrapNbtValue);
    }

    if (typeof tag === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(tag)) {
            result[key] = unwrapNbtValue(value);
        }
        return result;
    }

    return tag;
}

function toNbtTag(value, emptyListType = 'compound') {
    if (Array.isArray(value)) {
        const listType = value.length > 0
            ? toNbtTag(value[0], emptyListType).type
            : emptyListType;
        return {
            type: 'list',
            value: {
                type: listType,
                value: value.map(item => toNbtTag(item, listType).value)
            }
        };
    }

    if (value && typeof value === 'object') {
        const compound = {};
        for (const [key, child] of Object.entries(value)) {
            compound[key] = toNbtTag(child);
        }
        return { type: 'compound', value: compound };
    }

    if (typeof value === 'string') {
        return { type: 'string', value };
    }

    if (typeof value === 'boolean') {
        return { type: 'byte', value: value ? 1 : 0 };
    }

    return { type: 'int', value: Number.isFinite(value) ? Math.trunc(value) : 0 };
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
        self.postMessage({ type: 'status', title: 'Starting conversion...', desc: 'Initializing worker', isLoading: true });
        const converter = new ModConverter(e.data.file, e.data.options);
        converter.process();
    }
};

class ModConverter {
    constructor(file, options = {}) {
        this.file = file;
        this.options = options;
        this.modNameBase = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, '_');

        // Mod Identification (populated during identifyMod phase)
        this.modMeta = {
            id: null,
            name: null,
            version: null,
            description: null,
            authors: [],
            loader: null // 'fabric', 'quilt', 'forge', 'neoforge', or null
        };

        // Registries
        this.namespaces = new Set();
        this.blocks = new Set();
        this.items = new Set();
        this.geometries = new Set();
        this.blockTags = {};
        this.itemTags = {};
        this.entityTypeTags = {};

        this.blockTexturesRegistry = {};
        this.itemTexturesRegistry = {};
        this.flipbookTextures = [];
        this.soundsRegistry = [];
        this.javaSoundsJson = null;
        this.blockProperties = {};
        this.scriptsList = [];
        this.biomesClientData = { "biomes": {} };

        // Model-to-texture mapping: tracks which models reference which textures
        this.modelTextureMap = {}; // modelId -> { textures: { key: resolvedPath } }

        // Conversion statistics
        this.conversionStats = {
            texturesConverted: 0,
            modelsConverted: 0,
            recipesConverted: 0,
            blocksGenerated: 0,
            itemsGenerated: 0,
            soundsConverted: 0,
            animationsConverted: 0,
            skippedFiles: 0
        };

        // Structure analysis
        this.structureSummary = {
            assets: {},      // namespace -> { textures: { block: [], item: [], entity: [], gui: [], particle: [], other: [] }, models: [], blockstates: [], sounds: [], lang: [] }
            data: {},        // namespace -> { recipes: [], loot_tables: [], tags: [], advancements: [], worldgen: [] }
            totalAssets: 0,
            totalData: 0,
            classFiles: 0,
            unknownFiles: []
        };

        this.fileCount = 0;
        this.skippedClasses = 0;
        this.skippedAdvancements = 0;
        this.warnings = [];

        // Manifests initialized after mod identification
        this.bpModuleUUID = generateUUID();
        this.rpModuleUUID = generateUUID();
        this.manifestVersion = [1, new Date().getMonth() + 1, new Date().getDate()];
        this.bpManifest = null;
        this.rpManifest = null;
        this.languages = new Set();
    }

    generateManifest(type, name, description, selfUUID, dependencyUUID, version) {
        return {
            "format_version": 2,
            "header": {
                "name": name,
                "description": description,
                "uuid": generateUUID(),
                "version": version,
                "min_engine_version": [1, 20, 0]
            },
            "modules": [
                {
                    "type": type === 'resources' ? 'resources' : 'data',
                    "uuid": selfUUID,
                    "version": version
                }
            ],
            "dependencies": [
                {
                    "uuid": dependencyUUID,
                    "version": version
                }
            ],
            "metadata": {
                "authors": ["MC-ModsConverter"],
                "url": "https://minecraft-julian.github.io/MC-ModsConverter/"
            }
        };
    }

    logWarning(path, error) {
        console.warn(`[ModConverter] Error processing ${path}:`, error);
        this.warnings.push({ path, error: error.message || String(error) });
    }

    async process() {
        self.postMessage({ type: 'status', title: 'Processing...', desc: `Reading ${this.file.name}`, isLoading: true });

        try {
            const zip = new JSZip();
            this.loadedZip = await zip.loadAsync(this.file);
            this.addonZip = new JSZip();

            // Phase 0: MOD IDENTIFICATION
            self.postMessage({ type: 'status', title: 'Identifying Mod...', desc: 'Reading mod metadata', isLoading: true, percent: 2 });
            await this.identifyMod();
            self.postMessage({ type: 'status', title: 'Mod identified', desc: `Found ${this.modMeta.loader || 'unknown'} mod: ${this.modMeta.name || this.modNameBase}`, isLoading: true, percent: 3 });

            // Use mod metadata for naming
            const displayName = this.modMeta.name || this.modNameBase;
            const description = this.modMeta.description || "Converted Java Mod";
            const authors = this.modMeta.authors.length > 0
                ? this.modMeta.authors
                : ["MC-ModsConverter"];

            // Initialize manifests with real mod metadata
            this.bpManifest = this.generateManifest('data', `${displayName} Behaviors`, `${description} - Behaviors`, this.bpModuleUUID, this.rpModuleUUID, this.manifestVersion);
            this.rpManifest = this.generateManifest('resources', `${displayName} Resources`, `${description} - Resources`, this.rpModuleUUID, this.bpModuleUUID, this.manifestVersion);
            this.bpManifest.metadata.authors = authors;
            this.rpManifest.metadata.authors = authors;

            this.bpFolder = this.addonZip.folder(`${this.modNameBase}_BP`);
            this.rpFolder = this.addonZip.folder(`${this.modNameBase}_RP`);

            // Phase 1: SCAN & STRUCTURE ANALYSIS
            self.postMessage({ type: 'status', title: 'Scanning...', desc: 'Analyzing Minecraft mod structure', isLoading: true, percent: 5 });
            const files = this.scan();
            self.postMessage({ type: 'status', title: 'Files scanned', desc: `Found ${files.length} files to process`, isLoading: true, percent: 6 });

            this.totalFiles = files.length;
            this.validator = new Validator();
            this.analyzeStructure(files);
            self.postMessage({ type: 'status', title: 'Structure analyzed', desc: `Blocks: ${this.blocks.size}, Items: ${this.items.size}`, isLoading: true, percent: 7 });

            // Phase 2: PARSE & TRANSFORM
            self.postMessage({ type: 'status', title: 'Converting Assets...', desc: 'Transforming Java files to Bedrock', isLoading: true, percent: 10 });
            for (const file of files) {
                try {
                    await this.categorizeAndProcessFile(file.path, file.entry);
                } catch (e) {
                    this.logWarning(file.path, e);
                    this.incrementCounter();
                }
            }
            self.postMessage({ type: 'status', title: 'Assets converted', desc: 'All files processed', isLoading: true, percent: 80 });

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

            // Add consolidated advancement warning if any were skipped
            if (this.skippedAdvancements > 0) {
                this.warnings.push({
                    path: '[multiple advancement files]',
                    error: `${this.skippedAdvancements} advancement(s) detected but skipped: Bedrock uses a different achievement system that cannot be auto-converted.`
                });
            }

            // Accuracy estimation system
            let scorableFiles = this.structureSummary.totalAssets + this.structureSummary.totalData;
            let javaCodeWeight = this.structureSummary.classFiles;
            let baseAccuracy = 100;
            if (scorableFiles + javaCodeWeight > 0) {
                baseAccuracy = (scorableFiles / (scorableFiles + javaCodeWeight * 0.4)) * 100;
            }
            let accuracy = Math.max(0, Math.min(100, Math.round(baseAccuracy - (this.warnings.length * 0.2))));

            self.postMessage({
                type: 'success',
                blob: content,
                fileName: `${this.modNameBase}.mcaddon`,
                count: this.fileCount,
                warnings: this.warnings,
                modMeta: this.modMeta,
                structureSummary: this.structureSummary,
                conversionStats: this.conversionStats,
                namespaces: Array.from(this.namespaces),
                accuracy: accuracy
            });

        } catch (error) {
            console.error('Worker error:', error);
            self.postMessage({ type: 'error', message: `Fatal error: ${error.message}\nStack: ${error.stack}`, warnings: this.warnings });
        }
    }

    /**
     * Phase 0: Mod Identification
     * Reads fabric.mod.json, quilt.mod.json, META-INF/mods.toml, META-INF/neoforge.mods.toml, or mcmod.info to identify the mod.
     */
    async identifyMod() {
        // Try Fabric: fabric.mod.json
        const fabricModJson = this.loadedZip.file('fabric.mod.json');
        if (fabricModJson) {
            try {
                const content = await fabricModJson.async('string');
                const parsed = parseJSON(content);
                this.modMeta.loader = 'fabric';
                this.modMeta.id = parsed.id || null;
                this.modMeta.name = parsed.name || parsed.id || null;
                this.modMeta.version = parsed.version || null;
                this.modMeta.description = parsed.description || null;
                if (Array.isArray(parsed.authors)) {
                    this.modMeta.authors = parsed.authors.map(a => typeof a === 'string' ? a : (a.name || String(a)));
                }
                if (this.modMeta.id) {
                    this.namespaces.add(this.modMeta.id);
                }
                return;
            } catch (e) {
                this.logWarning('fabric.mod.json', e);
            }
        }

        // Try Quilt: quilt.mod.json
        const quiltModJson = this.loadedZip.file('quilt.mod.json');
        if (quiltModJson) {
            try {
                const content = await quiltModJson.async('string');
                const parsed = parseJSON(content);
                this.modMeta.loader = 'quilt';
                const loader = parsed.quilt_loader || {};
                this.modMeta.id = loader.id || null;
                this.modMeta.name = (parsed.metadata && parsed.metadata.name) || loader.id || null;
                this.modMeta.version = loader.version || null;
                this.modMeta.description = (parsed.metadata && parsed.metadata.description) || null;
                if (parsed.metadata && parsed.metadata.contributors && typeof parsed.metadata.contributors === 'object' && !Array.isArray(parsed.metadata.contributors)) {
                    this.modMeta.authors = Object.keys(parsed.metadata.contributors);
                } else if (parsed.metadata && Array.isArray(parsed.metadata.contributors)) {
                    this.modMeta.authors = parsed.metadata.contributors.map(a => typeof a === 'string' ? a : (a.name || String(a)));
                }
                if (this.modMeta.id) {
                    this.namespaces.add(this.modMeta.id);
                }
                return;
            } catch (e) {
                this.logWarning('quilt.mod.json', e);
            }
        }

        // Try Forge / NeoForge descriptor TOML
        for (const descriptor of [
            { path: 'META-INF/mods.toml', loader: 'forge' },
            { path: 'META-INF/neoforge.mods.toml', loader: 'neoforge' }
        ]) {
            const modsToml = this.loadedZip.file(descriptor.path);
            if (!modsToml) continue;

            try {
                const content = await modsToml.async('string');
                this.modMeta.loader = descriptor.loader;
                // Simple TOML parsing for key fields
                const modIdMatch = content.match(/modId\s*=\s*"([^"]+)"/);
                const nameMatch = content.match(/displayName\s*=\s*"([^"]+)"/);
                const versionMatch = content.match(/version\s*=\s*"([^"]+)"/);
                const descMatch = content.match(/description\s*=\s*'''([\s\S]*?)'''/);
                const authorsMatch = content.match(/authors\s*=\s*"([^"]+)"/);

                this.modMeta.id = modIdMatch ? modIdMatch[1] : null;
                this.modMeta.name = nameMatch ? nameMatch[1] : (modIdMatch ? modIdMatch[1] : null);
                this.modMeta.version = versionMatch ? versionMatch[1] : null;
                this.modMeta.description = descMatch ? descMatch[1].trim() : null;
                if (authorsMatch) {
                    this.modMeta.authors = authorsMatch[1].split(',').map(a => a.trim());
                }
                if (this.modMeta.id) {
                    this.namespaces.add(this.modMeta.id);
                }
                return;
            } catch (e) {
                this.logWarning(descriptor.path, e);
            }
        }

        // Try Legacy Forge: mcmod.info
        const mcmodInfo = this.loadedZip.file('mcmod.info');
        if (mcmodInfo) {
            try {
                const content = await mcmodInfo.async('string');
                const parsed = parseJSON(content);
                const info = Array.isArray(parsed) ? parsed[0] : parsed;
                this.modMeta.loader = 'forge';
                this.modMeta.id = info.modid || null;
                this.modMeta.name = info.name || info.modid || null;
                this.modMeta.version = info.version || null;
                this.modMeta.description = info.description || null;
                if (Array.isArray(info.authorList)) {
                    this.modMeta.authors = info.authorList;
                } else if (Array.isArray(info.authors)) {
                    this.modMeta.authors = info.authors;
                }
                if (this.modMeta.id) {
                    this.namespaces.add(this.modMeta.id);
                }
                return;
            } catch (e) {
                this.logWarning('mcmod.info', e);
            }
        }

        // No mod descriptor found - try inferring from assets/ directory structure
        const inferredNamespaces = new Set();
        for (const [relativePath] of Object.entries(this.loadedZip.files)) {
            const nsMatch = relativePath.match(/^assets\/([^/]+)\//);
            if (nsMatch) {
                const ns = nsMatch[1];
                // Filter out minecraft and common library namespaces
                if (ns !== 'minecraft' && ns !== 'forge' && ns !== 'neoforge' &&
                    ns !== 'fabric' && ns !== 'quilt' && ns !== 'c' && ns !== 'realms') {
                    inferredNamespaces.add(ns);
                }
            }
        }

        if (inferredNamespaces.size > 0) {
            // Pick the namespace with most files as the primary mod ID
            let bestNs = null;
            let bestCount = 0;
            for (const ns of inferredNamespaces) {
                const prefix = `assets/${ns}/`;
                let count = 0;
                for (const [relativePath] of Object.entries(this.loadedZip.files)) {
                    if (relativePath.startsWith(prefix)) count++;
                }
                if (count > bestCount) {
                    bestCount = count;
                    bestNs = ns;
                }
            }
            if (bestNs) {
                this.modMeta.id = bestNs;
                this.modMeta.name = bestNs.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                this.namespaces.add(bestNs);
                // Also add other discovered namespaces
                for (const ns of inferredNamespaces) {
                    this.namespaces.add(ns);
                }
            }
        }

        this.warnings.push({
            path: 'mod identification',
            error: `No mod descriptor found (fabric.mod.json, quilt.mod.json, META-INF/mods.toml, META-INF/neoforge.mods.toml, or mcmod.info). ${
                this.modMeta.id
                    ? `Inferred mod ID "${this.modMeta.id}" from assets/ folder structure.`
                    : 'Mod name and namespace will be inferred from file structure.'
            }`
        });
    }

    /**
     * Minecraft-aware structure analysis.
     * Categorizes all files by their Minecraft role before processing.
     */
    analyzeStructure(files) {
        for (const file of files) {
            const path = file.path;

            // Track .class files
            if (path.endsWith('.class')) {
                this.structureSummary.classFiles++;
                continue;
            }

            // assets/<namespace>/...
            const assetsMatch = path.match(/^assets\/([^/]+)\/(.+)$/);
            if (assetsMatch) {
                const ns = assetsMatch[1];
                const subPath = assetsMatch[2];
                this.namespaces.add(ns);

                if (!this.structureSummary.assets[ns]) {
                    this.structureSummary.assets[ns] = {
                        textures: { block: [], item: [], entity: [], gui: [], environment: [], painting: [], particle: [], other: [] },
                        models: { block: [], item: [] },
                        blockstates: [],
                        sounds: [],
                        lang: [],
                        particles: [],
                        animations: [],
                        other: []
                    };
                }

                if (subPath.startsWith('textures/')) {
                    // Classify texture sub-type from path
                    const texSubPath = subPath.substring('textures/'.length);
                    if (texSubPath.startsWith('block/') || texSubPath.startsWith('blocks/')) {
                        this.structureSummary.assets[ns].textures.block.push(subPath);
                    } else if (texSubPath.startsWith('item/') || texSubPath.startsWith('items/')) {
                        this.structureSummary.assets[ns].textures.item.push(subPath);
                    } else if (texSubPath.startsWith('entity/') || texSubPath.startsWith('entities/')) {
                        this.structureSummary.assets[ns].textures.entity.push(subPath);
                    } else if (texSubPath.startsWith('gui/')) {
                        this.structureSummary.assets[ns].textures.gui.push(subPath);
                    } else if (texSubPath.startsWith('environment/') || texSubPath.startsWith('misc/')) {
                        this.structureSummary.assets[ns].textures.environment.push(subPath);
                    } else if (texSubPath.startsWith('painting/')) {
                        this.structureSummary.assets[ns].textures.painting.push(subPath);
                    } else if (texSubPath.startsWith('particle/')) {
                        this.structureSummary.assets[ns].textures.particle.push(subPath);
                    } else {
                        this.structureSummary.assets[ns].textures.other.push(subPath);
                    }
                } else if (subPath.startsWith('models/')) {
                    // Classify model sub-type
                    if (subPath.startsWith('models/block/')) {
                        this.structureSummary.assets[ns].models.block.push(subPath);
                    } else if (subPath.startsWith('models/item/')) {
                        this.structureSummary.assets[ns].models.item.push(subPath);
                    }
                } else if (subPath.startsWith('blockstates/')) {
                    this.structureSummary.assets[ns].blockstates.push(subPath);
                } else if (subPath.startsWith('sounds/') || subPath === 'sounds.json') {
                    this.structureSummary.assets[ns].sounds.push(subPath);
                } else if (subPath.startsWith('lang/')) {
                    this.structureSummary.assets[ns].lang.push(subPath);
                } else if (subPath.startsWith('particles/')) {
                    this.structureSummary.assets[ns].particles.push(subPath);
                } else if (subPath.startsWith('animations/') || subPath.startsWith('animation_controllers/')) {
                    this.structureSummary.assets[ns].animations.push(subPath);
                } else {
                    this.structureSummary.assets[ns].other.push(subPath);
                }
                this.structureSummary.totalAssets++;
                continue;
            }

            // data/<namespace>/...
            const dataMatch = path.match(/^data\/([^/]+)\/(.+)$/);
            if (dataMatch) {
                const ns = dataMatch[1];
                const subPath = dataMatch[2];
                this.namespaces.add(ns);

                if (!this.structureSummary.data[ns]) {
                    this.structureSummary.data[ns] = { recipes: [], loot_tables: [], tags: [], advancements: [], worldgen: [], other: [] };
                }

                if (subPath.startsWith('recipes/') || subPath.startsWith('recipe/')) {
                    this.structureSummary.data[ns].recipes.push(subPath);
                } else if (subPath.startsWith('loot_tables/') || subPath.startsWith('loot_table/')) {
                    this.structureSummary.data[ns].loot_tables.push(subPath);
                } else if (subPath.startsWith('tags/')) {
                    this.structureSummary.data[ns].tags.push(subPath);
                } else if (subPath.startsWith('advancements/') || subPath.startsWith('advancement/')) {
                    this.structureSummary.data[ns].advancements.push(subPath);
                    // Skip totalData increment since advancements cannot be converted to Bedrock
                    continue;
                } else if (subPath.startsWith('worldgen/')) {
                    this.structureSummary.data[ns].worldgen.push(subPath);
                } else {
                    this.structureSummary.data[ns].other.push(subPath);
                }
                this.structureSummary.totalData++;
                continue;
            }

            // Files outside assets/ and data/ that aren't mod descriptors or pack icons
            if (!path.endsWith('.class') &&
                path !== 'fabric.mod.json' && path !== 'quilt.mod.json' &&
                path !== 'META-INF/mods.toml' && path !== 'META-INF/neoforge.mods.toml' && path !== 'mcmod.info' &&
                path !== 'pack.mcmeta' && path.toLowerCase() !== 'pack.png') {
                this.structureSummary.unknownFiles.push(path);
            }
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

        // MINI-LOGIC ENGINE (Bedrock Script API)
        if (this.scriptsList.length > 0 || this.blocks.size > 0) {
            this.bpManifest.modules.push({
                "type": "script",
                "language": "javascript",
                "uuid": generateUUID(),
                "entry": "scripts/main.js",
                "version": [1, 0, 0]
            });
            if (!this.bpManifest.dependencies) this.bpManifest.dependencies = [];
            this.bpManifest.dependencies.push({
                "module_name": "@minecraft/server",
                "version": "1.1.0"
            });

            let mainJs = `import { world, system } from "@minecraft/server";\n\n`;
            mainJs += `// --- MCBE-KI LOGIC ENGINE ---\n`;
            mainJs += `console.warn("[MCBE-KI] Logic Engine Initialized");\n\n`;
            
            // Universal mod logic generation - analyzes mod content and generates appropriate behavior
            mainJs += this.generateUniversalModLogic();

            for (let scr of this.scriptsList) {
                mainJs += `import "./${scr}";\n`;
            }
            this.bpFolder.file("scripts/main.js", mainJs);
        }

        this.rpFolder.file("manifest.json", JSON.stringify(this.rpManifest, null, 4));
        this.bpFolder.file("manifest.json", JSON.stringify(this.bpManifest, null, 4));
    }

    async convertNbtToMcstructure(nbtBuffer) {
        if (typeof pako === 'undefined' || typeof nbt === 'undefined') {
            throw new Error('NBT structure conversion requires pako and nbt libraries, which are not available.');
        }

        // Decompress if gzipped
        let decompressed;
        try {
            decompressed = pako.ungzip(nbtBuffer);
        } catch (e) {
            decompressed = nbtBuffer; // Assume already decompressed
        }

        // Parse the Java NBT structure
        const parsedNbt = await new Promise((resolve, reject) => {
            nbt.parse(decompressed, (error, data) => {
                if (error) reject(error);
                else resolve(data);
            });
        });
        const nbtData = unwrapNbtValue(parsedNbt.value || parsedNbt);

        // Block mapping from Java to Bedrock
        const blockMappings = {
            // Common mappings
            "minecraft:stone": "minecraft:stone",
            "minecraft:dirt": "minecraft:dirt",
            "minecraft:grass_block": "minecraft:grass",
            "minecraft:grass": "minecraft:grass",
            "minecraft:cobblestone": "minecraft:cobblestone",
            "minecraft:planks": "minecraft:planks",
            "minecraft:oak_planks": "minecraft:planks",
            "minecraft:sand": "minecraft:sand",
            "minecraft:gravel": "minecraft:gravel",
            "minecraft:gold_ore": "minecraft:gold_ore",
            "minecraft:iron_ore": "minecraft:iron_ore",
            "minecraft:coal_ore": "minecraft:coal_ore",
            "minecraft:oak_log": "minecraft:log",
            "minecraft:spruce_log": "minecraft:log2",
            "minecraft:birch_log": "minecraft:log2",
            "minecraft:jungle_log": "minecraft:log2",
            "minecraft:acacia_log": "minecraft:log2",
            "minecraft:dark_oak_log": "minecraft:log2",
            "minecraft:oak_leaves": "minecraft:leaves",
            "minecraft:spruce_leaves": "minecraft:leaves2",
            "minecraft:birch_leaves": "minecraft:leaves2",
            "minecraft:jungle_leaves": "minecraft:leaves2",
            "minecraft:acacia_leaves": "minecraft:leaves2",
            "minecraft:dark_oak_leaves": "minecraft:leaves2",
            "minecraft:glass": "minecraft:glass",
            "minecraft:lapis_ore": "minecraft:lapis_ore",
            "minecraft:lapis_block": "minecraft:lapis_block",
            "minecraft:dispenser": "minecraft:dispenser",
            "minecraft:sandstone": "minecraft:sandstone",
            "minecraft:note_block": "minecraft:noteblock",
            "minecraft:bed": "minecraft:bed",
            "minecraft:golden_rail": "minecraft:golden_rail",
            "minecraft:detector_rail": "minecraft:detector_rail",
            "minecraft:sticky_piston": "minecraft:sticky_piston",
            "minecraft:web": "minecraft:web",
            "minecraft:piston": "minecraft:piston",
            "minecraft:piston_head": "minecraft:pistonarmcollision",
            "minecraft:wool": "minecraft:wool",
            "minecraft:piston_extension": "minecraft:pistonarmcollision",
            "minecraft:yellow_flower": "minecraft:yellow_flower",
            "minecraft:red_flower": "minecraft:red_flower",
            "minecraft:brown_mushroom": "minecraft:brown_mushroom",
            "minecraft:red_mushroom": "minecraft:red_mushroom",
            "minecraft:gold_block": "minecraft:gold_block",
            "minecraft:iron_block": "minecraft:iron_block",
            "minecraft:double_stone_slab": "minecraft:double_stone_slab",
            "minecraft:stone_slab": "minecraft:stone_slab",
            "minecraft:brick_block": "minecraft:brick_block",
            "minecraft:tnt": "minecraft:tnt",
            "minecraft:bookshelf": "minecraft:bookshelf",
            "minecraft:mossy_cobblestone": "minecraft:mossy_cobblestone",
            "minecraft:obsidian": "minecraft:obsidian",
            "minecraft:torch": "minecraft:torch",
            "minecraft:fire": "minecraft:fire",
            "minecraft:mob_spawner": "minecraft:mob_spawner",
            "minecraft:oak_stairs": "minecraft:oak_stairs",
            "minecraft:chest": "minecraft:chest",
            "minecraft:redstone_wire": "minecraft:redstone_wire",
            "minecraft:diamond_ore": "minecraft:diamond_ore",
            "minecraft:diamond_block": "minecraft:diamond_block",
            "minecraft:crafting_table": "minecraft:crafting_table",
            "minecraft:wheat": "minecraft:wheat",
            "minecraft:farmland": "minecraft:farmland",
            "minecraft:furnace": "minecraft:furnace",
            "minecraft:lit_furnace": "minecraft:lit_furnace",
            "minecraft:standing_sign": "minecraft:standing_sign",
            "minecraft:wooden_door": "minecraft:wooden_door",
            "minecraft:ladder": "minecraft:ladder",
            "minecraft:rail": "minecraft:rail",
            "minecraft:cobblestone_stairs": "minecraft:cobblestone_stairs",
            "minecraft:wall_sign": "minecraft:wall_sign",
            "minecraft:lever": "minecraft:lever",
            "minecraft:stone_pressure_plate": "minecraft:stone_pressure_plate",
            "minecraft:iron_door": "minecraft:iron_door",
            "minecraft:wooden_pressure_plate": "minecraft:wooden_pressure_plate",
            "minecraft:redstone_ore": "minecraft:redstone_ore",
            "minecraft:lit_redstone_ore": "minecraft:lit_redstone_ore",
            "minecraft:unlit_redstone_torch": "minecraft:unlit_redstone_torch",
            "minecraft:redstone_torch": "minecraft:redstone_torch",
            "minecraft:stone_button": "minecraft:stone_button",
            "minecraft:snow_layer": "minecraft:snow_layer",
            "minecraft:ice": "minecraft:ice",
            "minecraft:snow": "minecraft:snow",
            "minecraft:cactus": "minecraft:cactus",
            "minecraft:clay": "minecraft:clay",
            "minecraft:sugar_cane": "minecraft:sugar_cane",
            "minecraft:jukebox": "minecraft:jukebox",
            "minecraft:oak_fence": "minecraft:fence",
            "minecraft:pumpkin": "minecraft:pumpkin",
            "minecraft:netherrack": "minecraft:netherrack",
            "minecraft:soul_sand": "minecraft:soul_sand",
            "minecraft:glowstone": "minecraft:glowstone",
            "minecraft:portal": "minecraft:portal",
            "minecraft:jack_o_lantern": "minecraft:lit_pumpkin",
            "minecraft:cake": "minecraft:cake",
            "minecraft:unpowered_repeater": "minecraft:unpowered_repeater",
            "minecraft:powered_repeater": "minecraft:powered_repeater",
            "minecraft:stained_glass": "minecraft:stained_glass",
            "minecraft:trapdoor": "minecraft:trapdoor",
            "minecraft:monster_egg": "minecraft:monster_egg",
            "minecraft:stonebrick": "minecraft:stonebrick",
            "minecraft:brown_mushroom_block": "minecraft:brown_mushroom_block",
            "minecraft:red_mushroom_block": "minecraft:red_mushroom_block",
            "minecraft:iron_bars": "minecraft:iron_bars",
            "minecraft:glass_pane": "minecraft:glass_pane",
            "minecraft:melon_block": "minecraft:melon_block",
            "minecraft:pumpkin_stem": "minecraft:pumpkin_stem",
            "minecraft:melon_stem": "minecraft:melon_stem",
            "minecraft:vine": "minecraft:vine",
            "minecraft:oak_fence_gate": "minecraft:fence_gate",
            "minecraft:brick_stairs": "minecraft:brick_stairs",
            "minecraft:stone_brick_stairs": "minecraft:stone_brick_stairs",
            "minecraft:mycelium": "minecraft:mycelium",
            "minecraft:waterlily": "minecraft:waterlily",
            "minecraft:nether_brick": "minecraft:nether_brick",
            "minecraft:nether_brick_fence": "minecraft:nether_brick_fence",
            "minecraft:nether_brick_stairs": "minecraft:nether_brick_stairs",
            "minecraft:nether_wart": "minecraft:nether_wart",
            "minecraft:enchanting_table": "minecraft:enchanting_table",
            "minecraft:brewing_stand": "minecraft:brewing_stand",
            "minecraft:cauldron": "minecraft:cauldron",
            "minecraft:end_portal": "minecraft:end_portal",
            "minecraft:end_portal_frame": "minecraft:end_portal_frame",
            "minecraft:end_stone": "minecraft:end_stone",
            "minecraft:dragon_egg": "minecraft:dragon_egg",
            "minecraft:redstone_lamp": "minecraft:redstone_lamp",
            "minecraft:lit_redstone_lamp": "minecraft:lit_redstone_lamp",
            "minecraft:double_wooden_slab": "minecraft:double_wooden_slab",
            "minecraft:wooden_slab": "minecraft:wooden_slab",
            "minecraft:cocoa": "minecraft:cocoa",
            "minecraft:sandstone_stairs": "minecraft:sandstone_stairs",
            "minecraft:emerald_ore": "minecraft:emerald_ore",
            "minecraft:ender_chest": "minecraft:ender_chest",
            "minecraft:tripwire_hook": "minecraft:tripwire_hook",
            "minecraft:tripwire": "minecraft:tripwire",
            "minecraft:emerald_block": "minecraft:emerald_block",
            "minecraft:spruce_stairs": "minecraft:spruce_stairs",
            "minecraft:birch_stairs": "minecraft:birch_stairs",
            "minecraft:jungle_stairs": "minecraft:jungle_stairs",
            "minecraft:command_block": "minecraft:command_block",
            "minecraft:beacon": "minecraft:beacon",
            "minecraft:cobblestone_wall": "minecraft:cobblestone_wall",
            "minecraft:flower_pot": "minecraft:flower_pot",
            "minecraft:carrots": "minecraft:carrots",
            "minecraft:potatoes": "minecraft:potatoes",
            "minecraft:wooden_button": "minecraft:wooden_button",
            "minecraft:skull": "minecraft:skull",
            "minecraft:anvil": "minecraft:anvil",
            "minecraft:trapped_chest": "minecraft:trapped_chest",
            "minecraft:light_weighted_pressure_plate": "minecraft:light_weighted_pressure_plate",
            "minecraft:heavy_weighted_pressure_plate": "minecraft:heavy_weighted_pressure_plate",
            "minecraft:unpowered_comparator": "minecraft:unpowered_comparator",
            "minecraft:powered_comparator": "minecraft:powered_comparator",
            "minecraft:daylight_detector": "minecraft:daylight_detector",
            "minecraft:redstone_block": "minecraft:redstone_block",
            "minecraft:quartz_ore": "minecraft:quartz_ore",
            "minecraft:hopper": "minecraft:hopper",
            "minecraft:quartz_block": "minecraft:quartz_block",
            "minecraft:quartz_stairs": "minecraft:quartz_stairs",
            "minecraft:activator_rail": "minecraft:activator_rail",
            "minecraft:dropper": "minecraft:dropper",
            "minecraft:stained_hardened_clay": "minecraft:stained_hardened_clay",
            "minecraft:stained_glass_pane": "minecraft:stained_glass_pane",
            "minecraft:leaves2": "minecraft:leaves2",
            "minecraft:log2": "minecraft:log2",
            "minecraft:acacia_stairs": "minecraft:acacia_stairs",
            "minecraft:dark_oak_stairs": "minecraft:dark_oak_stairs",
            "minecraft:slime": "minecraft:slime",
            "minecraft:barrier": "minecraft:barrier",
            "minecraft:iron_trapdoor": "minecraft:iron_trapdoor",
            "minecraft:prismarine": "minecraft:prismarine",
            "minecraft:sea_lantern": "minecraft:sea_lantern",
            "minecraft:hay_block": "minecraft:hay_block",
            "minecraft:carpet": "minecraft:carpet",
            "minecraft:hardened_clay": "minecraft:hardened_clay",
            "minecraft:coal_block": "minecraft:coal_block",
            "minecraft:packed_ice": "minecraft:packed_ice",
            "minecraft:double_plant": "minecraft:double_plant",
            "minecraft:standing_banner": "minecraft:standing_banner",
            "minecraft:wall_banner": "minecraft:wall_banner",
            "minecraft:daylight_detector_inverted": "minecraft:daylight_detector_inverted",
            "minecraft:red_sandstone": "minecraft:red_sandstone",
            "minecraft:red_sandstone_stairs": "minecraft:red_sandstone_stairs",
            "minecraft:double_stone_slab2": "minecraft:double_stone_slab2",
            "minecraft:stone_slab2": "minecraft:stone_slab2",
            "minecraft:spruce_fence_gate": "minecraft:spruce_fence_gate",
            "minecraft:birch_fence_gate": "minecraft:birch_fence_gate",
            "minecraft:jungle_fence_gate": "minecraft:jungle_fence_gate",
            "minecraft:dark_oak_fence_gate": "minecraft:dark_oak_fence_gate",
            "minecraft:acacia_fence_gate": "minecraft:acacia_fence_gate",
            "minecraft:spruce_fence": "minecraft:spruce_fence",
            "minecraft:birch_fence": "minecraft:birch_fence",
            "minecraft:jungle_fence": "minecraft:jungle_fence",
            "minecraft:dark_oak_fence": "minecraft:dark_oak_fence",
            "minecraft:acacia_fence": "minecraft:acacia_fence",
            "minecraft:spruce_door": "minecraft:spruce_door",
            "minecraft:birch_door": "minecraft:birch_door",
            "minecraft:jungle_door": "minecraft:jungle_door",
            "minecraft:acacia_door": "minecraft:acacia_door",
            "minecraft:dark_oak_door": "minecraft:dark_oak_door",
            "minecraft:end_rod": "minecraft:end_rod",
            "minecraft:chorus_plant": "minecraft:chorus_plant",
            "minecraft:chorus_flower": "minecraft:chorus_flower",
            "minecraft:purpur_block": "minecraft:purpur_block",
            "minecraft:purpur_pillar": "minecraft:purpur_pillar",
            "minecraft:purpur_stairs": "minecraft:purpur_stairs",
            "minecraft:purpur_double_slab": "minecraft:purpur_double_slab",
            "minecraft:purpur_slab": "minecraft:purpur_slab",
            "minecraft:end_bricks": "minecraft:end_bricks",
            "minecraft:beetroots": "minecraft:beetroots",
            "minecraft:grass_path": "minecraft:grass_path",
            "minecraft:end_gateway": "minecraft:end_gateway",
            "minecraft:repeating_command_block": "minecraft:repeating_command_block",
            "minecraft:chain_command_block": "minecraft:chain_command_block",
            "minecraft:frosted_ice": "minecraft:frosted_ice",
            "minecraft:magma": "minecraft:magma",
            "minecraft:nether_wart_block": "minecraft:nether_wart_block",
            "minecraft:red_nether_brick": "minecraft:red_nether_brick",
            "minecraft:bone_block": "minecraft:bone_block",
            "minecraft:structure_void": "minecraft:structure_void",
            "minecraft:observer": "minecraft:observer",
            "minecraft:shulker_box": "minecraft:shulker_box",
            "minecraft:white_shulker_box": "minecraft:white_shulker_box",
            "minecraft:orange_shulker_box": "minecraft:orange_shulker_box",
            "minecraft:magenta_shulker_box": "minecraft:magenta_shulker_box",
            "minecraft:light_blue_shulker_box": "minecraft:light_blue_shulker_box",
            "minecraft:yellow_shulker_box": "minecraft:yellow_shulker_box",
            "minecraft:lime_shulker_box": "minecraft:lime_shulker_box",
            "minecraft:pink_shulker_box": "minecraft:pink_shulker_box",
            "minecraft:gray_shulker_box": "minecraft:gray_shulker_box",
            "minecraft:silver_shulker_box": "minecraft:silver_shulker_box",
            "minecraft:cyan_shulker_box": "minecraft:cyan_shulker_box",
            "minecraft:purple_shulker_box": "minecraft:purple_shulker_box",
            "minecraft:blue_shulker_box": "minecraft:blue_shulker_box",
            "minecraft:brown_shulker_box": "minecraft:brown_shulker_box",
            "minecraft:green_shulker_box": "minecraft:green_shulker_box",
            "minecraft:red_shulker_box": "minecraft:red_shulker_box",
            "minecraft:black_shulker_box": "minecraft:black_shulker_box",
            "minecraft:white_glazed_terracotta": "minecraft:white_glazed_terracotta",
            "minecraft:orange_glazed_terracotta": "minecraft:orange_glazed_terracotta",
            "minecraft:magenta_glazed_terracotta": "minecraft:magenta_glazed_terracotta",
            "minecraft:light_blue_glazed_terracotta": "minecraft:light_blue_glazed_terracotta",
            "minecraft:yellow_glazed_terracotta": "minecraft:yellow_glazed_terracotta",
            "minecraft:lime_glazed_terracotta": "minecraft:lime_glazed_terracotta",
            "minecraft:pink_glazed_terracotta": "minecraft:pink_glazed_terracotta",
            "minecraft:gray_glazed_terracotta": "minecraft:gray_glazed_terracotta",
            "minecraft:silver_glazed_terracotta": "minecraft:silver_glazed_terracotta",
            "minecraft:cyan_glazed_terracotta": "minecraft:cyan_glazed_terracotta",
            "minecraft:purple_glazed_terracotta": "minecraft:purple_glazed_terracotta",
            "minecraft:blue_glazed_terracotta": "minecraft:blue_glazed_terracotta",
            "minecraft:brown_glazed_terracotta": "minecraft:brown_glazed_terracotta",
            "minecraft:green_glazed_terracotta": "minecraft:green_glazed_terracotta",
            "minecraft:red_glazed_terracotta": "minecraft:red_glazed_terracotta",
            "minecraft:black_glazed_terracotta": "minecraft:black_glazed_terracotta",
            "minecraft:concrete": "minecraft:concrete",
            "minecraft:concrete_powder": "minecraft:concrete_powder",
            "minecraft:structure_block": "minecraft:structure_block"
        };

        // Simplified conversion to MCStructure
        // This is a basic port of the javaToBedrock function
        const structure = {
            format_version: 1,
            size: nbtData.size ? [nbtData.size[0], nbtData.size[1], nbtData.size[2]] : [1, 1, 1],
            structure: {
                block_indices: [[], []], // Two layers
                entities: [],
                palette: {
                    default: {
                        block_palette: [],
                        block_position_data: {}
                    }
                }
            },
            structure_world_origin: [0, 0, 0]
        };

        if (nbtData.palette && nbtData.blocks) {
            // Build palette
            const paletteMap = new Map();
            nbtData.palette.forEach((block, index) => {
                let name = block.Name ? block.Name : "minecraft:air";
                // Apply block mapping
                if (blockMappings[name]) {
                    name = blockMappings[name];
                }
                const states = block.Properties || {};
                structure.structure.palette.default.block_palette.push({
                    name: name,
                    states: states,
                    version: 17825808 // Example version
                });
                paletteMap.set(index, structure.structure.palette.default.block_palette.length - 1);
            });

            // Build block indices
            const sizeX = structure.size[0];
            const sizeY = structure.size[1];
            const sizeZ = structure.size[2];
            const totalBlocks = sizeX * sizeY * sizeZ;

            for (let i = 0; i < totalBlocks; i++) {
                const blockIndex = nbtData.blocks[i] ? nbtData.blocks[i].state : 0;
                const paletteIndex = paletteMap.get(blockIndex) || 0;
                structure.structure.block_indices[0].push(paletteIndex);
                structure.structure.block_indices[1].push(-1); // Waterlogged layer
            }
        }

        // Serialize back to NBT
        const nbtBufferOut = typeof nbt.writeUncompressed === 'function'
            ? nbt.writeUncompressed({ name: 'structure', value: toNbtTag(structure).value })
            : await new Promise((resolve, reject) => {
                nbt.write(structure, (error, data) => {
                    if (error) reject(error);
                    else resolve(data);
                });
            });

        // Gzip compress for MCStructure
        return pako.gzip(nbtBufferOut);
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

    /**
     * Helper to parse a tag JSON file and populate the given tag registry.
     */
    async parseTagFile(relativePath, zipEntry, namespace, tagId, registry) {
        try {
            const fileContent = await zipEntry.async('string');
            const parsed = parseJSON(fileContent);
            if (parsed.values) {
                for (const v of parsed.values) {
                    const id = typeof v === 'string' ? v : (v.id || '');
                    const cleanId = id.replace('minecraft:', '').replace(namespace + ':', '');
                    if (!registry[cleanId]) registry[cleanId] = [];
                    registry[cleanId].push(tagId);
                }
                this.incrementCounter();
            }
        } catch (e) {
            this.logWarning(relativePath, e);
        }
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

        // NBT STRUCTURES
        if (relativePath.endsWith('.nbt')) {
            try {
                const fileContent = await zipEntry.async('arraybuffer');
                // Attempt to convert Java .nbt to Bedrock .mcstructure
                const converted = await this.convertNbtToMcstructure(fileContent);
                const newPath = relativePath.replace(/\.nbt$/, '.mcstructure').replace(/^assets\/[^/]+\//, 'structures/');
                this.bpFolder.file(newPath, converted);
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
                // Fallback: copy as is
                const fileContent = await zipEntry.async('arraybuffer');
                const newPath = relativePath.replace(/\.nbt$/, '.mcstructure').replace(/^assets\/[^/]+\//, 'structures/');
                this.bpFolder.file(newPath, fileContent);
                this.warnings.push({ path: relativePath, error: "NBT structure copied as .mcstructure, but conversion failed. Manual conversion may be required." });
                this.incrementCounter();
            }
            return;
        }

        // WORLD FILES (.zip as Java worlds)
        if (relativePath.endsWith('.zip') && (relativePath.includes('world') || relativePath.includes('save'))) {
            // Warn that world conversion is not supported
            this.warnings.push({ path: relativePath, error: "World files (.zip) detected. World conversion from Java to Bedrock is not supported in this tool. Only mod assets are converted." });
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
                while (this.scriptsList.includes(finalName)) {
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
                const texturePath = textureMatch[2]; // e.g. "block/stone.png", "entity/custom_mob.png"
                const parsedPath = texturePath.split('/');
                const type = parsedPath[0]; // "block", "item", "entity", "gui", "environment", "painting", etc.
                const name = parsedPath[parsedPath.length - 1].split('.')[0];
                // Use namespace-prefixed key to avoid collisions between mods
                const nsPrefix = (namespace !== 'minecraft' && this.namespaces.size > 1) ? `${namespace}_` : '';
                const registryKey = `${nsPrefix}${name}`;

                const fileContent = await zipEntry.async('arraybuffer');

                if (type === 'block' || type === 'blocks') {
                    this.rpFolder.file(`textures/blocks/${registryKey}.png`, fileContent);
                    this.blockTexturesRegistry[registryKey] = `textures/blocks/${registryKey}`;
                } else if (type === 'item' || type === 'items') {
                    this.rpFolder.file(`textures/items/${registryKey}.png`, fileContent);
                    this.itemTexturesRegistry[registryKey] = `textures/items/${registryKey}`;
                } else if (type === 'entity' || type === 'entities') {
                    // Entity textures: preserve sub-path structure for entity skins
                    const entitySubPath = parsedPath.slice(1).join('/');
                    this.rpFolder.file(`textures/entity/${entitySubPath}`, fileContent);
                } else if (type === 'gui') {
                    // GUI textures: copy to RP for potential UI usage
                    this.rpFolder.file(`textures/gui/${parsedPath.slice(1).join('/')}`, fileContent);
                } else if (type === 'environment' || type === 'misc') {
                    this.rpFolder.file(`textures/environment/${parsedPath.slice(1).join('/')}`, fileContent);
                } else if (type === 'painting') {
                    this.rpFolder.file(`textures/painting/${parsedPath.slice(1).join('/')}`, fileContent);
                } else if (type === 'particle') {
                    this.rpFolder.file(`textures/particle/${parsedPath.slice(1).join('/')}`, fileContent);
                } else {
                    // Other texture types: preserve original path
                    this.rpFolder.file(`textures/${texturePath}`, fileContent);
                }

                this.conversionStats.texturesConverted++;
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
                const name = soundPath.replace(/\.(ogg|wav)$/, '');
                const fileContent = await zipEntry.async('arraybuffer');

                const bedrockPath = `sounds/${namespace}/${soundPath}`;
                this.rpFolder.file(bedrockPath, fileContent);

                this.soundsRegistry.push({
                    id: `${namespace}.${name.replace(/\//g, '.')}`,
                    path: bedrockPath.replace(/\.(ogg|wav)$/, '')
                });

                this.conversionStats.soundsConverted++;
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

                const isValidIngredient = (v) => {
                    if (!v) return false;
                    if (typeof v === 'string') return true;
                    // Handle array ingredients (Java 1.19+ format: key can be an array of items)
                    if (Array.isArray(v)) return v.length > 0 && v.some(i => isValidIngredient(i));
                    if (v.tag) return false; // Bedrock doesn't support Java-style tags in recipes
                    return !!v.item;
                };

                const getIngredientId = (v) => {
                    if (typeof v === 'string') return formatId(v);
                    // If array, use the first valid item
                    if (Array.isArray(v)) {
                        const first = v.find(i => i && (typeof i === 'string' || i.item));
                        return first ? getIngredientId(first) : "minecraft:air";
                    }
                    return formatId(v.item);
                };

                if (parsed.type === 'minecraft:crafting_shaped') {
                    let ingredientsValid = true;
                    let keys = {};
                    for (const [k, v] of Object.entries(parsed.key || {})) {
                        if (!isValidIngredient(v)) {
                            ingredientsValid = false;
                            break;
                        }
                        keys[k] = { "item": getIngredientId(v) };
                    }

                    if (ingredientsValid && parsed.result) {
                        bedrockRecipe["minecraft:recipe_shaped"] = {
                            "description": { "identifier": `${namespace}:${recipeId}` },
                            "tags": ["crafting_table"],
                            "pattern": parsed.pattern || ["###", "###", "###"],
                            "key": keys,
                            "result": typeof parsed.result === 'string' ? { "item": formatId(parsed.result) } : { "item": formatId(parsed.result?.item), "count": parsed.result?.count || 1 }
                        };
                        this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                        this.incrementCounter();
                    }

                } else if (parsed.type === 'minecraft:crafting_shapeless') {
                    let ingredients = (parsed.ingredients || []).filter(i => isValidIngredient(i)).map(i => ({ "item": getIngredientId(i) }));

                    if (ingredients.length > 0 && parsed.result) {
                        bedrockRecipe["minecraft:recipe_shapeless"] = {
                            "description": { "identifier": `${namespace}:${recipeId}` },
                            "tags": ["crafting_table"],
                            "ingredients": ingredients,
                            "result": typeof parsed.result === 'string' ? { "item": formatId(parsed.result) } : { "item": formatId(parsed.result?.item), "count": parsed.result?.count || 1 }
                        };
                        this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                        this.incrementCounter();
                    }

                } else if (parsed.type === 'minecraft:smelting' || parsed.type === 'minecraft:blasting' || parsed.type === 'minecraft:campfire_cooking') {
                    if (isValidIngredient(parsed.ingredient) && parsed.result) {
                        bedrockRecipe["minecraft:recipe_furnace"] = {
                            "description": { "identifier": `${namespace}:${recipeId}` },
                            "tags": [parsed.type === 'minecraft:smelting' ? "furnace" : (parsed.type === 'minecraft:blasting' ? "blast_furnace" : "campfire")],
                            "input": getIngredientId(parsed.ingredient),
                            "output": formatId(typeof parsed.result === 'string' ? parsed.result : parsed.result?.item)
                        };
                        this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                        this.incrementCounter();
                    }
                } else if (parsed.type === 'minecraft:stonecutting') {
                    if (isValidIngredient(parsed.ingredient) && parsed.result) {
                        bedrockRecipe["minecraft:recipe_shapeless"] = {
                            "description": { "identifier": `${namespace}:${recipeId}` },
                            "tags": ["stonecutter"],
                            "ingredients": [{ "item": getIngredientId(parsed.ingredient) }],
                            "result": typeof parsed.result === 'string' ? { "item": formatId(parsed.result) } : { "item": formatId(parsed.result?.item), "count": parsed.result?.count || 1 }
                        };
                        this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                        this.incrementCounter();
                    }
                } else if (parsed.type === 'minecraft:smithing') {
                    if (isValidIngredient(parsed.template) && isValidIngredient(parsed.base) && isValidIngredient(parsed.addition) && parsed.result) {
                        bedrockRecipe["minecraft:recipe_smithing_transform"] = {
                            "description": { "identifier": `${namespace}:${recipeId}` },
                            "tags": ["smithing_table"],
                            "template": getIngredientId(parsed.template),
                            "base": getIngredientId(parsed.base),
                            "addition": getIngredientId(parsed.addition),
                            "result": formatId(typeof parsed.result === 'string' ? parsed.result : parsed.result?.item)
                        };
                        this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                        this.incrementCounter();
                    }
                } else {
                    // Fallback for other types
                    let ingredients = [];
                    if (parsed.ingredients) {
                        ingredients = parsed.ingredients.filter(i => isValidIngredient(i)).map(i => ({ "item": getIngredientId(i) }));
                    } else if (parsed.ingredient) {
                        if (isValidIngredient(parsed.ingredient)) ingredients = [{ "item": getIngredientId(parsed.ingredient) }];
                    }

                    if (ingredients.length > 0 && parsed.result) {
                        bedrockRecipe["minecraft:recipe_shapeless"] = {
                            "description": { "identifier": `${namespace}:${recipeId}` },
                            "tags": [parsed.type ? parsed.type.replace(':', '_') : "custom_machine"],
                            "ingredients": ingredients,
                            "result": typeof parsed.result === 'string' ? { "item": formatId(parsed.result) } : { "item": formatId(parsed.result.item || "minecraft:air"), "count": parsed.result.count || 1 }
                        };
                        this.bpFolder.file(`recipes/${recipeId}.json`, JSON.stringify(bedrockRecipe, null, 4));
                        this.incrementCounter();
                    }
                }
                this.conversionStats.recipesConverted++;
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

        // BLOCK TAGS
        const blockTagMatch = relativePath.match(/^data\/([^/]+)\/tags\/blocks\/(.*)\.json$/);
        if (blockTagMatch) {
            await this.parseTagFile(relativePath, zipEntry, blockTagMatch[1], blockTagMatch[2], this.blockTags);
            return;
        }

        // ITEM TAGS
        const itemTagMatch = relativePath.match(/^data\/([^/]+)\/tags\/items\/(.*)\.json$/);
        if (itemTagMatch) {
            await this.parseTagFile(relativePath, zipEntry, itemTagMatch[1], itemTagMatch[2], this.itemTags);
            return;
        }

        // ENTITY TYPE TAGS
        const entityTagMatch = relativePath.match(/^data\/([^/]+)\/tags\/entity_types\/(.*)\.json$/);
        if (entityTagMatch) {
            await this.parseTagFile(relativePath, zipEntry, entityTagMatch[1], entityTagMatch[2], this.entityTypeTags);
            return;
        }

        // ADVANCEMENTS (noted but not directly convertible to Bedrock)
        const advancementMatch = relativePath.match(/^data\/([^/]+)\/(?:advancements|advancement)\/(.*)\.json$/);
        if (advancementMatch) {
            try {
                this.incrementCounter();
                // Advancements don't have a direct Bedrock equivalent
                // Count them instead of adding individual warnings
                this.skippedAdvancements++;
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

                    // Register textures if found in model, using namespace-aware keys
                    if (parsed.textures) {
                        const resolvedTextures = {};
                        for (let [texKey, texPath] of Object.entries(parsed.textures)) {
                            let resolvedPath = this.resolveTextureMapping(texPath, parsed.textures);
                            if (resolvedPath && !resolvedPath.startsWith('#')) {
                                let texName = resolvedPath.split('/').pop();
                                const nsPrefix = (namespace !== 'minecraft' && this.namespaces.size > 1) ? `${namespace}_` : '';
                                const registryKey = `${nsPrefix}${texName}`;
                                this.blockTexturesRegistry[registryKey] = `textures/blocks/${registryKey}`;
                                resolvedTextures[texKey] = registryKey;
                            }
                        }
                        // Store model-to-texture mapping for later use in block generation
                        this.modelTextureMap[modelId] = resolvedTextures;
                    }

                    this.conversionStats.modelsConverted++;
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
                const namespace = animMatch[1];
                const folderName = animMatch[2];
                const fileName = animMatch[3];
                const fileContent = await zipEntry.async('string');

                const parsed = parseJSON(fileContent);

                if (folderName === 'animations' && parsed.animations) {
                    const out = {
                        "format_version": "1.8.0",
                        "animations": {}
                    };

                    for (const [name, anim] of Object.entries(parsed.animations)) {
                        out.animations[`animation.${namespace}.${name}`] = {
                            "loop": true,
                            "bones": anim.bones || {}
                        };
                    }
                    this.rpFolder.file(`animations/${fileName}.json`, JSON.stringify(out, null, 4));
                } else if (parsed.format_version || parsed.geckolib_format_version) {
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
                this.conversionStats.animationsConverted++;
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

                // Load and resolve the item model JSON (with parent chain)
                const modelId = `${namespace}:item/${itemId}`;
                let parsed = await this.loadModel(modelId);

                // Resolve texture reference for the item icon
                const nsPrefix = (namespace !== 'minecraft' && this.namespaces.size > 1) ? `${namespace}_` : '';
                let iconTexture = `${nsPrefix}${itemId}`;
                if (parsed && parsed.textures) {
                    // Java item models use "layer0" as the primary texture
                    let texRef = parsed.textures.layer0 || parsed.textures['0'] || Object.values(parsed.textures)[0];
                    if (texRef) {
                        let resolved = this.resolveTextureMapping(texRef, parsed.textures);
                        if (resolved && !resolved.startsWith('#')) {
                            let texName = resolved.split('/').pop();
                            iconTexture = `${nsPrefix}${texName}`;
                            // Ensure this texture is in the item registry
                            if (!this.itemTexturesRegistry[iconTexture]) {
                                this.itemTexturesRegistry[iconTexture] = `textures/items/${iconTexture}`;
                            }
                        }
                    }
                }

                // Determine item category from item name heuristics
                const categoryRules = [
                    { category: "equipment", keywords: ["sword", "axe", "bow", "crossbow", "pickaxe", "shovel", "hoe", "helmet", "chestplate", "leggings", "boots", "shield", "trident"] },
                    { category: "construction", keywords: ["brick", "ingot", "nugget", "dust", "gem", "slab", "stair", "wall", "fence", "gate"] },
                    { category: "nature", keywords: ["seed", "sapling", "flower", "crop", "berry", "fruit", "mushroom", "dye", "potion"] }
                ];

                let category = "items"; // default Bedrock category
                const idLower = itemId.toLowerCase();
                for (const rule of categoryRules) {
                    if (rule.keywords.some(kw => idLower.includes(kw))) {
                        category = rule.category;
                        break;
                    }
                }

                const bedrockItem = {
                    "format_version": "1.16.100",
                    "minecraft:item": {
                        "description": {
                            "identifier": `${namespace}:${itemId}`,
                            "category": category
                        },
                        "components": {
                            "minecraft:icon": {
                                "texture": iconTexture
                            }
                        }
                    }
                };

                // Apply item tags if available
                if (this.itemTags[itemId]) {
                    for (const tag of this.itemTags[itemId]) {
                        const tagKey = `tag:${tag.replace('/', '_')}`;
                        bedrockItem["minecraft:item"].components[tagKey] = {};
                    }
                }

                this.validator.validateItem(`${namespace}:${itemId}`, bedrockItem);
                this.bpFolder.file(`items/${itemId}.json`, JSON.stringify(bedrockItem, null, 4));
                this.conversionStats.itemsGenerated++;
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
                const parsed = parseJSON(fileContent);

                let properties = {};
                let modelReferences = new Set();

                // Extract models from blockstate variants
                if (parsed.variants) {
                    for (const [key, value] of Object.entries(parsed.variants)) {
                        // Collect variant properties
                        if (key !== "") {
                            const props = key.split(',');
                            for (const p of props) {
                                const [k, v] = p.split('=');
                                if (k && v) {
                                    if (!properties[k]) properties[k] = new Set();
                                    properties[k].add(v);
                                }
                            }
                        }
                        // Extract model references from variants
                        const variants = Array.isArray(value) ? value : [value];
                        for (const variant of variants) {
                            if (variant && variant.model) {
                                modelReferences.add(variant.model);
                            }
                        }
                    }
                }

                // Extract models from multipart blockstates
                if (parsed.multipart) {
                    for (const part of parsed.multipart) {
                        if (part.apply) {
                            const applies = Array.isArray(part.apply) ? part.apply : [part.apply];
                            for (const apply of applies) {
                                if (apply.model) {
                                    modelReferences.add(apply.model);
                                }
                            }
                        }
                        // Extract properties from multipart conditions
                        if (part.when) {
                            for (const [k, v] of Object.entries(part.when)) {
                                if (k === 'OR' || k === 'AND') continue;
                                if (!properties[k]) properties[k] = new Set();
                                String(v).split('|').forEach(val => properties[k].add(val));
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
                    hasLogic: Object.keys(finalProps).length > 0,
                    models: Array.from(modelReferences)
                };
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }
    }

    generateUniversalModLogic() {
        let logic = `// --- UNIVERSAL MOD LOGIC ENGINE ---\n`;
        logic += `console.log("[Universal Engine] Mod loaded successfully");\n\n`;

        // Simple test logic first
        logic += `world.afterEvents.blockPlace.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    if (block.typeId.includes(":") && !block.typeId.startsWith("minecraft:")) {\n`;
        logic += `        player.sendMessage(\`§aCustom block placed: \${block.typeId}\`);\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        logic += `world.afterEvents.playerInteractWithBlock.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    if (block.typeId.includes(":") && !block.typeId.startsWith("minecraft:")) {\n`;
        logic += `        player.sendMessage(\`§eInteracted with: \${block.typeId}\`);\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        return logic;
    }

    analyzeModType() {
        const analysis = {
            type: 'unknown',
            features: []
        };

        const modName = this.modNameBase.toLowerCase();

        // Specific mod detection
        if (modName.includes('create')) {
            analysis.type = 'mechanical';
            analysis.features = ['mechanical', 'automation', 'processing'];
        } else if (modName.includes('litematica') || modName.includes('schematic')) {
            analysis.type = 'building';
            analysis.features = ['schematic', 'placement', 'preview'];
        } else if (modName.includes('replay')) {
            analysis.type = 'utility';
            analysis.features = ['recording', 'playback'];
        } else if (modName.includes('botania') || modName.includes('thaumcraft') || modName.includes('blood') || modName.includes('magic')) {
            analysis.type = 'magic';
            analysis.features = ['magic', 'mana', 'spells'];
        } else if (modName.includes('thermal') || modName.includes('mekanism') || modName.includes('immersive')) {
            analysis.type = 'tech';
            analysis.features = ['automation', 'processing', 'energy'];
        } else if (modName.includes('tinkers') || modName.includes('construct')) {
            analysis.type = 'crafting';
            analysis.features = ['crafting', 'tools', 'materials'];
        }

        // Generic feature detection based on assets
        if (this.blocks.size > 10) {
            if (!analysis.features.includes('mechanical')) analysis.features.push('building');
        }
        if (this.items.size > 20) {
            if (!analysis.features.includes('items')) analysis.features.push('items');
        }

        // If no specific type detected, use generic
        if (analysis.type === 'unknown' && (this.blocks.size > 0 || this.items.size > 0)) {
            analysis.type = 'generic';
            analysis.features = ['generic', 'interactions'];
        }

        return analysis;
    }

    calculateCompatibilityScore(analysis) {
        let score = 50; // Base score for unknown mods

        const typeScores = {
            'mechanical': 85,
            'building': 90,
            'utility': 95,
            'magic': 70,
            'tech': 80,
            'crafting': 75,
            'generic': 60
        };

        if (typeScores[analysis.type]) {
            score = typeScores[analysis.type];
        }

        // Adjust based on features
        if (analysis.features.includes('automation')) score += 5;
        if (analysis.features.includes('processing')) score += 5;
        if (analysis.features.includes('magic')) score -= 10; // Magic is harder to convert
        if (analysis.features.includes('energy')) score += 5;

        // Adjust based on asset counts
        if (this.blocks.size > 50) score -= 10; // Too many blocks might be complex
        if (this.items.size > 100) score -= 10;
        if (this.blocks.size < 5 && this.items.size < 10) score += 10; // Simple mods are easier

        return Math.min(100, Math.max(0, score));
    }

    generateMechanicalLogic() {
        let logic = `// Mechanical System Simulation\n`;
        logic += `const mechanicalComponents = new Map();\n`;
        logic += `const powerNetworks = new Map();\n\n`;

        logic += `// Auto-detect mechanical components from placed blocks\n`;
        logic += `world.afterEvents.blockPlace.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    const blockId = block.typeId;\n`;
        logic += `    \n`;
        logic += `    // Detect mechanical components by name patterns\n`;
        logic += `    if (blockId.includes('cog') || blockId.includes('gear') || blockId.includes('wheel') || \n`;
        logic += `        blockId.includes('mill') || blockId.includes('press') || blockId.includes('crusher') ||\n`;
        logic += `        blockId.includes('kinetic') || blockId.includes('mechanical')) {\n`;
        logic += `        \n`;
        logic += `        mechanicalComponents.set(block.location, {\n`;
        logic += `            type: blockId,\n`;
        logic += `            powered: blockId.includes('water') || blockId.includes('wind') || blockId.includes('generator'),\n`;
        logic += `            speed: blockId.includes('large') ? 16 : 8,\n`;
        logic += `            network: null\n`;
        logic += `        });\n`;
        logic += `        \n`;
        logic += `        connectMechanicalNetwork(block.location);\n`;
        logic += `        if (mechanicalComponents.get(block.location).powered) {\n`;
        logic += `            propagateMechanicalPower(block.location);\n`;
        logic += `        }\n`;
        logic += `        \n`;
        logic += `        player.sendMessage(\`§aMechanical component placed: \${blockId}\`);\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        logic += `function connectMechanicalNetwork(location) {\n`;
        logic += `    const directions = [\n`;
        logic += `        { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },\n`;
        logic += `        { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },\n`;
        logic += `        { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }\n`;
        logic += `    ];\n`;
        logic += `    \n`;
        logic += `    for (const dir of directions) {\n`;
        logic += `        const adjacent = {\n`;
        logic += `            x: location.x + dir.x,\n`;
        logic += `            y: location.y + dir.y,\n`;
        logic += `            z: location.z + dir.z\n`;
        logic += `        };\n`;
        logic += `        \n`;
        logic += `        if (mechanicalComponents.has(adjacent)) {\n`;
        logic += `            const adjComp = mechanicalComponents.get(adjacent);\n`;
        logic += `            const thisComp = mechanicalComponents.get(location);\n`;
        logic += `            \n`;
        logic += `            if (adjComp.network && !thisComp.network) {\n`;
        logic += `                thisComp.network = adjComp.network;\n`;
        logic += `                mechanicalComponents.set(location, thisComp);\n`;
        logic += `                if (!powerNetworks.has(adjComp.network)) {\n`;
        logic += `                    powerNetworks.set(adjComp.network, new Set());\n`;
        logic += `                }\n`;
        logic += `                powerNetworks.get(adjComp.network).add(location);\n`;
        logic += `            }\n`;
        logic += `        }\n`;
        logic += `    }\n`;
        logic += `}\n\n`;

        logic += `function propagateMechanicalPower(location) {\n`;
        logic += `    const component = mechanicalComponents.get(location);\n`;
        logic += `    if (!component || !component.network) return;\n`;
        logic += `    \n`;
        logic += `    const network = powerNetworks.get(component.network);\n`;
        logic += `    if (!network) return;\n`;
        logic += `    \n`;
        logic += `    for (const loc of network) {\n`;
        logic += `        if (loc.x === location.x && loc.y === location.y && loc.z === location.z) continue;\n`;
        logic += `        \n`;
        logic += `        const comp = mechanicalComponents.get(loc);\n`;
        logic += `        if (comp && !comp.powered) {\n`;
        logic += `            comp.powered = true;\n`;
        logic += `            comp.speed = component.speed;\n`;
        logic += `            mechanicalComponents.set(loc, comp);\n`;
        logic += `        }\n`;
        logic += `    }\n`;
        logic += `}\n\n`;

        return logic;
    }

    generateSchematicLogic() {
        let logic = `// Schematic/Placement System Simulation\n`;
        logic += `const schematics = new Map();\n`;
        logic += `const activePlacements = new Map();\n`;
        logic += `let placementMode = false;\n\n`;

        logic += `class Schematic {\n`;
        logic += `    constructor(name, blocks, origin) {\n`;
        logic += `        this.name = name;\n`;
        logic += `        this.blocks = blocks;\n`;
        logic += `        this.origin = origin;\n`;
        logic += `    }\n`;
        logic += `    \n`;
        logic += `    placeAt(location, player) {\n`;
        logic += `        const placementId = \`\${player.nameTag}_\${Date.now()}\`;\n`;
        logic += `        activePlacements.set(placementId, {\n`;
        logic += `            id: placementId,\n`;
        logic += `            schematic: this.name,\n`;
        logic += `            origin: location,\n`;
        logic += `            previewMode: true,\n`;
        logic += `            player: player\n`;
        logic += `        });\n`;
        logic += `        \n`;
        logic += `        player.sendMessage(\`§aSchematic placed: Use /confirm_placement to build\`);\n`;
        logic += `        return placementId;\n`;
        logic += `    }\n`;
        logic += `}\n\n`;

        logic += `world.afterEvents.chatSend.subscribe(ev => {\n`;
        logic += `    const { message, sender } = ev;\n`;
        logic += `    \n`;
        logic += `    if (message.startsWith("/schematic") || message.startsWith("/place")) {\n`;
        logic += `        const args = message.split(" ");\n`;
        logic += `        const command = args[1];\n`;
        logic += `        \n`;
        logic += `        switch (command) {\n`;
        logic += `            case "load":\n`;
        logic += `                if (args[2]) {\n`;
        logic += `                    // Simulate loading schematic\n`;
        logic += `                    const schematic = new Schematic(args[2], new Map(), {x: 0, y: 0, z: 0});\n`;
        logic += `                    schematics.set(args[2], schematic);\n`;
        logic += `                    sender.sendMessage(\`§aLoaded schematic: \${args[2]}\`);\n`;
        logic += `                }\n`;
        logic += `                break;\n`;
        logic += `            case "place":\n`;
        logic += `                placementMode = !placementMode;\n`;
        logic += `                sender.sendMessage(\`§bPlacement mode: \${placementMode ? 'ON' : 'OFF'}\`);\n`;
        logic += `                break;\n`;
        logic += `        }\n`;
        logic += `    }\n`;
        logic += `    \n`;
        logic += `    if (message.startsWith("/confirm_placement")) {\n`;
        logic += `        // Confirm placement logic would go here\n`;
        logic += `        sender.sendMessage("§aPlacement confirmed!");\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        return logic;
    }

    generateRecordingLogic() {
        let logic = `// Recording/Playback System Simulation\n`;
        logic += `const recordings = new Map();\n`;
        logic += `let currentRecording = null;\n`;
        logic += `let isRecording = false;\n\n`;

        logic += `class Recording {\n`;
        logic += `    constructor(name) {\n`;
        logic += `        this.name = name;\n`;
        logic += `        this.events = [];\n`;
        logic += `        this.startTime = Date.now();\n`;
        logic += `    }\n`;
        logic += `    \n`;
        logic += `    addEvent(type, data) {\n`;
        logic += `        if (this.events.length < 500) {\n`;
        logic += `            this.events.push({\n`;
        logic += `                time: Date.now() - this.startTime,\n`;
        logic += `                type: type,\n`;
        logic += `                data: data\n`;
        logic += `            });\n`;
        logic += `        }\n`;
        logic += `    }\n`;
        logic += `}\n\n`;

        logic += `world.afterEvents.chatSend.subscribe(ev => {\n`;
        logic += `    const { message, sender } = ev;\n`;
        logic += `    \n`;
        logic += `    if (message.startsWith("/record")) {\n`;
        logic += `        const args = message.split(" ");\n`;
        logic += `        const command = args[1];\n`;
        logic += `        \n`;
        logic += `        switch (command) {\n`;
        logic += `            case "start":\n`;
        logic += `                if (args[2] && !isRecording) {\n`;
        logic += `                    currentRecording = new Recording(args[2]);\n`;
        logic += `                    isRecording = true;\n`;
        logic += `                    sender.sendMessage(\`§aRecording: \${args[2]}\`);\n`;
        logic += `                }\n`;
        logic += `                break;\n`;
        logic += `            case "stop":\n`;
        logic += `                if (isRecording && currentRecording) {\n`;
        logic += `                    recordings.set(currentRecording.name, currentRecording);\n`;
        logic += `                    sender.sendMessage(\`§aSaved recording: \${currentRecording.name}\`);\n`;
        logic += `                    isRecording = false;\n`;
        logic += `                    currentRecording = null;\n`;
        logic += `                }\n`;
        logic += `                break;\n`;
        logic += `        }\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        logic += `// Record basic events\n`;
        logic += `world.afterEvents.blockPlace.subscribe(ev => {\n`;
        logic += `    if (isRecording && currentRecording) {\n`;
        logic += `        currentRecording.addEvent('place', {\n`;
        logic += `            block: ev.block.typeId,\n`;
        logic += `            location: ev.block.location\n`;
        logic += `        });\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        return logic;
    }

    generateMagicLogic() {
        let logic = `// Magic/Mana System Simulation\n`;
        logic += `const magicComponents = new Map();\n`;
        logic += `const manaNetworks = new Map();\n\n`;

        logic += `world.afterEvents.blockPlace.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    const blockId = block.typeId;\n`;
        logic += `    \n`;
        logic += `    if (blockId.includes('mana') || blockId.includes('magic') || blockId.includes('rune') || \n`;
        logic += `        blockId.includes('altar') || blockId.includes('pool') || blockId.includes('spreader')) {\n`;
        logic += `        \n`;
        logic += `        magicComponents.set(block.location, {\n`;
        logic += `            type: blockId,\n`;
        logic += `            mana: blockId.includes('pool') ? 10000 : 0,\n`;
        logic += `            active: false\n`;
        logic += `        });\n`;
        logic += `        \n`;
        logic += `        player.sendMessage(\`§dMagic component placed: \${blockId}\`);\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        logic += `world.afterEvents.playerInteractWithBlock.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    if (magicComponents.has(block.location)) {\n`;
        logic += `        const component = magicComponents.get(block.location);\n`;
        logic += `        player.sendMessage(\`§dMana: \${component.mana}, Active: \${component.active}\`);\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        return logic;
    }

    generateAutomationLogic() {
        let logic = `// Automation/Processing System Simulation\n`;
        logic += `const automationComponents = new Map();\n`;
        logic += `const processingQueues = new Map();\n\n`;

        logic += `world.afterEvents.blockPlace.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    const blockId = block.typeId;\n`;
        logic += `    \n`;
        logic += `    if (blockId.includes('machine') || blockId.includes('furnace') || blockId.includes('generator') ||\n`;
        logic += `        blockId.includes('processor') || blockId.includes('factory') || blockId.includes('assembler')) {\n`;
        logic += `        \n`;
        logic += `        automationComponents.set(block.location, {\n`;
        logic += `            type: blockId,\n`;
        logic += `            active: false,\n`;
        logic += `            progress: 0,\n`;
        logic += `            energy: 0\n`;
        logic += `        });\n`;
        logic += `        \n`;
        logic += `        player.sendMessage(\`§eAutomation component placed: \${blockId}\`);\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        logic += `system.runInterval(() => {\n`;
        logic += `    for (const [loc, component] of automationComponents) {\n`;
        logic += `        if (component.active && component.energy > 0) {\n`;
        logic += `            component.progress += 10;\n`;
        logic += `            component.energy -= 5;\n`;
        logic += `            \n`;
        logic += `            if (component.progress >= 100) {\n`;
        logic += `                component.progress = 0;\n`;
        logic += `                // Simulate processing completion\n`;
        logic += `            }\n`;
        logic += `            \n`;
        logic += `            automationComponents.set(loc, component);\n`;
        logic += `        }\n`;
        logic += `    }\n`;
        logic += `}, 20);\n\n`;

        return logic;
    }

    generateBuildingLogic() {
        return this.generateSchematicLogic();
    }

    generateUtilityLogic() {
        return this.generateRecordingLogic();
    }

    generateTechLogic() {
        return this.generateAutomationLogic();
    }

    generateGenericLogic() {
        return this.generateGenericInteractionLogic();
    }

    generateMagicLogic() {
        let logic = `// Magic System Simulation\n`;
        logic += `const magicComponents = new Map();\n`;
        logic += `const manaPools = new Map();\n\n`;

        logic += `world.afterEvents.blockPlace.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    const blockId = block.typeId;\n`;
        logic += `    \n`;
        logic += `    if (blockId.includes('altar') || blockId.includes('rune') || blockId.includes('mana') || \n`;
        logic += `        blockId.includes('crystal') || blockId.includes('magic') || blockId.includes('wand')) {\n`;
        logic += `        \n`;
        logic += `        magicComponents.set(block.location, {\n`;
        logic += `            type: blockId,\n`;
        logic += `            mana: blockId.includes('crystal') ? 1000 : 100,\n`;
        logic += `            active: false\n`;
        logic += `        });\n`;
        logic += `        \n`;
        logic += `        player.sendMessage(\`§dMagical component placed: \${blockId}\`);\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        logic += `world.afterEvents.playerInteractWithBlock.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    if (magicComponents.has(block.location)) {\n`;
        logic += `        const component = magicComponents.get(block.location);\n`;
        logic += `        component.active = !component.active;\n`;
        logic += `        magicComponents.set(block.location, component);\n`;
        logic += `        player.sendMessage(\`§d\${component.type} \${component.active ? 'activated' : 'deactivated'}\`);\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        return logic;
    }

    generateCraftingLogic() {
        let logic = `// Crafting System Simulation\n`;
        logic += `const craftingStations = new Map();\n`;
        logic += `const toolMaterials = new Map();\n\n`;

        logic += `world.afterEvents.blockPlace.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    const blockId = block.typeId;\n`;
        logic += `    \n`;
        logic += `    if (blockId.includes('anvil') || blockId.includes('forge') || blockId.includes('workbench') || \n`;
        logic += `        blockId.includes('crafting') || blockId.includes('smeltery') || blockId.includes('part_builder')) {\n`;
        logic += `        \n`;
        logic += `        craftingStations.set(block.location, {\n`;
        logic += `            type: blockId,\n`;
        logic += `            level: blockId.includes('advanced') ? 2 : 1,\n`;
        logic += `            durability: 100\n`;
        logic += `        });\n`;
        logic += `        \n`;
        logic += `        player.sendMessage(\`§6Crafting station placed: \${blockId}\`);\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        logic += `world.afterEvents.playerInteractWithBlock.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    if (craftingStations.has(block.location)) {\n`;
        logic += `        const station = craftingStations.get(block.location);\n`;
        logic += `        player.sendMessage(\`§6Using \${station.type} (Level \${station.level})\`);\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        return logic;
    }

    generateGenericInteractionLogic() {
        let logic = `// Generic Interaction System\n`;
        logic += `const genericComponents = new Map();\n\n`;

        logic += `world.afterEvents.blockPlace.subscribe(ev => {\n`;
        logic += `    const { block } = ev;\n`;
        logic += `    if (block.typeId.includes(":") && !block.typeId.startsWith("minecraft:")) {\n`;
        logic += `        genericComponents.set(block.location, {\n`;
        logic += `            type: block.typeId,\n`;
        logic += `            state: "idle",\n`;
        logic += `            placedAt: Date.now()\n`;
        logic += `        });\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        logic += `world.afterEvents.playerInteractWithBlock.subscribe(ev => {\n`;
        logic += `    const { block, player } = ev;\n`;
        logic += `    if (genericComponents.has(block.location)) {\n`;
        logic += `        const component = genericComponents.get(block.location);\n`;
        logic += `        \n`;
        logic += `        // Generic interaction response\n`;
        logic += `        if (component.type.includes("machine") || component.type.includes("device")) {\n`;
        logic += `            component.state = component.state === "idle" ? "active" : "idle";\n`;
        logic += `            genericComponents.set(block.location, component);\n`;
        logic += `            player.sendMessage(\`§b\${component.type} is now \${component.state}\`);\n`;
        logic += `        } else {\n`;
        logic += `            player.sendMessage(\`§eInteracted with \${component.type}\`);\n`;
        logic += `        }\n`;
        logic += `    }\n`;
        logic += `});\n\n`;

        logic += `// Periodic updates for active components\n`;
        logic += `system.runInterval(() => {\n`;
        logic += `    for (const [loc, data] of genericComponents) {\n`;
        logic += `        if (data.state === "active") {\n`;
        logic += `            // Simulate ongoing activity\n`;
        logic += `        }\n`;
        logic += `    }\n`;
        logic += `}, 40);\n\n`;

        return logic;
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

                // Determine texture key: use model-texture mapping if available, fallback to namespace-prefixed blockId
                const nsPrefix = (namespace !== 'minecraft' && this.namespaces.size > 1) ? `${namespace}_` : '';
                let textureKey = `${nsPrefix}${blockId}`;

                // Try to resolve texture from blockstate model references
                const bProps = this.blockProperties[fullId];
                if (bProps && bProps.models && bProps.models.length > 0) {
                    for (const modelRef of bProps.models) {
                        const texMap = this.modelTextureMap[modelRef];
                        if (texMap) {
                            // Use the first resolved texture found (prefer 'all', 'texture', 'particle')
                            const preferred = texMap['all'] || texMap['texture'] || texMap['particle'] || Object.values(texMap)[0];
                            if (preferred) {
                                textureKey = preferred;
                                break;
                            }
                        }
                    }
                }

                // Ensure the texture key is in the block registry
                if (!this.blockTexturesRegistry[textureKey]) {
                    this.blockTexturesRegistry[textureKey] = `textures/blocks/${textureKey}`;
                }

                const bedrockBlock = { "format_version": "1.16.100", "minecraft:block": { "description": { "identifier": fullId, "is_experimental": false, "register_to_creative_menu": true }, "components": { "minecraft:material_instances": { "*": { "texture": textureKey, "render_method": "alpha_test" } }, "minecraft:destroy_time": destroyTime, "minecraft:explosion_resistance": explosionRes } } };

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

                // MINI-LOGIC ENGINE: Pattern Detection
                const idLower = blockId.toLowerCase();
                
                // Light Emission
                if (idLower.includes("lamp") || idLower.includes("glow") || idLower.includes("light") || idLower.includes("lantern") || idLower.includes("torch") || idLower.includes("candle")) {
                    bedrockBlock["minecraft:block"].components["minecraft:light_emission"] = (idLower.includes("torch") || idLower.includes("lantern")) ? 14 : 15;
                }

                // Containers
                if (idLower.includes("chest") || idLower.includes("barrel") || idLower.includes("shulker") || idLower.includes("storage") || idLower.includes("cabinet")) {
                    bedrockBlock["minecraft:block"].components["minecraft:inventory"] = { "container_type": "container", "inventory_size": 27 };
                    bedrockBlock["minecraft:block"].components["minecraft:container"] = { "container_type": "container", "inventory_size": 27, "restrict_to_owner": false };
                }

                // Interactions (Simple simulation)
                if (idLower.includes("button")) {
                    bedrockBlock["minecraft:block"].components["minecraft:button"] = { "on_click": { "event": "on_interact_event" } };
                }
                if (idLower.includes("lever")) {
                    bedrockBlock["minecraft:block"].components["minecraft:lever"] = { "on_click": { "event": "on_interact_event" } };
                }
                if (idLower.includes("pressure_plate")) {
                    bedrockBlock["minecraft:block"].components["minecraft:pressure_plate"] = { "on_step_on": { "event": "on_interact_event" }, "on_step_off": { "event": "on_interact_event" } };
                }

                // Crafting
                if (idLower.includes("crafting_table") || idLower.includes("workbench")) {
                    bedrockBlock["minecraft:block"].components["minecraft:crafting_table"] = { "table_name": "Crafting Table", "crafting_tags": ["crafting_table"] };
                }
                if (idLower.includes("furnace") || idLower.includes("smelter") || idLower.includes("oven")) {
                    bedrockBlock["minecraft:block"].components["tag:is_furnace"] = {};
                }

                this.validator.validateBlock(fullId, bedrockBlock);
                this.bpFolder.file(`blocks/${blockId}.json`, JSON.stringify(bedrockBlock, null, 4));
                this.conversionStats.blocksGenerated++;
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
            const bedrockSoundsData = {
                "format_version": "1.14.0",
                "sound_definitions": {}
            };

            const fileExists = (path) => {
                const cleanPath = path.replace(/\.(ogg|wav)$/, '');
                return this.soundsRegistry.some(s => s.path === cleanPath);
            };

            if (this.javaSoundsJson) {
                for (const [eventName, eventData] of Object.entries(this.javaSoundsJson)) {
                    if (!eventData.sounds) continue;

                    const validSounds = [];
                    for (const s of eventData.sounds) {
                        let soundName = typeof s === 'string' ? s : s.name;
                        let parts = soundName.split(':');
                        let namespace = parts.length > 1 ? parts[0] : 'minecraft';
                        let path = parts.length > 1 ? parts[1] : soundName;

                        let bedrockPath = `sounds/${namespace}/${path}`;

                        if (fileExists(bedrockPath)) {
                            if (typeof s === 'object') {
                                validSounds.push({ ...s, name: bedrockPath.replace(/\.(ogg|wav)$/, '') });
                            } else {
                                validSounds.push(bedrockPath.replace(/\.(ogg|wav)$/, ''));
                            }
                        }
                    }

                    if (validSounds.length > 0) {
                        bedrockSoundsData.sound_definitions[eventName] = {
                            "category": eventData.category || "neutral",
                            "sounds": validSounds
                        };
                    }
                }
            }

            // Register all actually existing sounds from the registry if they aren't already defined
            for (const s of this.soundsRegistry) {
                if (!bedrockSoundsData.sound_definitions[s.id]) {
                    bedrockSoundsData.sound_definitions[s.id] = {
                        "category": "neutral",
                        "sounds": [s.path]
                    };
                }
            }

            if (Object.keys(bedrockSoundsData.sound_definitions).length > 0) {
                this.rpFolder.file("sounds/sound_definitions.json", JSON.stringify(bedrockSoundsData, null, 4));
            }

            if (this.blocks.size > 0) {
                const rpSoundsJson = {
                    "block_sounds": {}
                };

                for (const fullId of this.blocks) {
                    const idLower = fullId.toLowerCase();
                    let soundType = "stone";
                    if (idLower.includes("wood") || idLower.includes("log") || idLower.includes("plank") || idLower.includes("fence") || idLower.includes("door")) soundType = "wood";
                    else if (idLower.includes("iron") || idLower.includes("gold") || idLower.includes("copper") || idLower.includes("metal") || idLower.includes("steel")) soundType = "metal";
                    else if (idLower.includes("glass")) soundType = "glass";
                    else if (idLower.includes("grass") || idLower.includes("leaf") || idLower.includes("leaves") || idLower.includes("foliage") || idLower.includes("plant")) soundType = "grass";
                    else if (idLower.includes("dirt") || idLower.includes("sand") || idLower.includes("gravel") || idLower.includes("clay") || idLower.includes("mud")) soundType = "gravel";

                    rpSoundsJson.block_sounds[fullId] = {
                        "events": {
                            "place": { "sound": `use.${soundType}` },
                            "break": { "sound": `dig.${soundType}` },
                            "hit": { "sound": `dig.${soundType}` },
                            "step": { "sound": `step.${soundType}` },
                            "fall": { "sound": `step.${soundType}` }
                        }
                    };
                }
                this.rpFolder.file("sounds.json", JSON.stringify(rpSoundsJson, null, 4));
            }
        } catch (e) {
            this.logWarning("generateSoundDefinitions()", e);
        }
    }
}
