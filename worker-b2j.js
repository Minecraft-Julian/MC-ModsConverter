importScripts("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");

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

// ============================================================
// SCRIPT CONVERSION MAPPINGS (Bedrock → Java / Fabric)
// ============================================================

const EVENT_MAPPINGS = {
    "world.afterEvents.itemUse": {
        callback: "UseItemCallback.EVENT.register((player, world, hand) -> {",
        imports: ["net.fabricmc.fabric.api.event.player.UseItemCallback", "net.minecraft.util.ActionResult", "net.minecraft.util.Hand", "net.minecraft.world.World", "net.minecraft.entity.player.PlayerEntity"],
        returnStatement: "    return ActionResult.PASS;",
        closing: "});"
    },
    "world.afterEvents.itemUseOn": {
        callback: "UseBlockCallback.EVENT.register((player, world, hand, hitResult) -> {",
        imports: ["net.fabricmc.fabric.api.event.player.UseBlockCallback", "net.minecraft.util.ActionResult", "net.minecraft.util.Hand", "net.minecraft.util.hit.BlockHitResult", "net.minecraft.world.World", "net.minecraft.entity.player.PlayerEntity"],
        returnStatement: "    return ActionResult.PASS;",
        closing: "});"
    },
    "world.afterEvents.entitySpawn": {
        callback: "ServerEntityEvents.ENTITY_LOAD.register((entity, world) -> {",
        imports: ["net.fabricmc.fabric.api.event.lifecycle.v1.ServerEntityEvents", "net.minecraft.entity.Entity", "net.minecraft.server.world.ServerWorld"],
        returnStatement: "",
        closing: "});"
    },
    "world.afterEvents.entityDie": {
        callback: "ServerLivingEntityEvents.AFTER_DEATH.register((entity, damageSource) -> {",
        imports: ["net.fabricmc.fabric.api.entity.event.v1.ServerLivingEntityEvents", "net.minecraft.entity.LivingEntity", "net.minecraft.entity.damage.DamageSource"],
        returnStatement: "",
        closing: "});"
    },
    "world.afterEvents.blockBreak": {
        callback: "PlayerBlockBreakEvents.AFTER.register((world, player, pos, state, entity) -> {",
        imports: ["net.fabricmc.fabric.api.event.player.PlayerBlockBreakEvents", "net.minecraft.block.BlockState", "net.minecraft.block.entity.BlockEntity", "net.minecraft.entity.player.PlayerEntity", "net.minecraft.util.math.BlockPos", "net.minecraft.world.World"],
        returnStatement: "",
        closing: "});"
    },
    "world.afterEvents.blockPlace": {
        callback: "// Block place event (requires Mixin or custom event)\n        // ServerBlockEvents equivalent not available in base Fabric API",
        imports: [],
        returnStatement: "",
        closing: ""
    },
    "world.afterEvents.entityHit": {
        callback: "AttackEntityCallback.EVENT.register((player, world, hand, entity, hitResult) -> {",
        imports: ["net.fabricmc.fabric.api.event.player.AttackEntityCallback", "net.minecraft.util.ActionResult", "net.minecraft.entity.Entity", "net.minecraft.entity.player.PlayerEntity", "net.minecraft.util.Hand", "net.minecraft.util.hit.EntityHitResult", "net.minecraft.world.World"],
        returnStatement: "    return ActionResult.PASS;",
        closing: "});"
    },
    "world.afterEvents.playerInteractWithBlock": {
        callback: "UseBlockCallback.EVENT.register((player, world, hand, hitResult) -> {",
        imports: ["net.fabricmc.fabric.api.event.player.UseBlockCallback", "net.minecraft.util.ActionResult"],
        returnStatement: "    return ActionResult.PASS;",
        closing: "});"
    },
    "world.beforeEvents.chatSend": {
        callback: "ServerMessageEvents.CHAT_MESSAGE.register((message, sender, params) -> {",
        imports: ["net.fabricmc.fabric.api.message.v1.ServerMessageEvents"],
        returnStatement: "",
        closing: "});"
    }
};

const TICK_MAPPINGS = {
    "system.runInterval": {
        callback: "ServerTickEvents.END_SERVER_TICK.register(server -> {",
        imports: ["net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents", "net.minecraft.server.MinecraftServer"],
        closing: "});"
    },
    "system.runTimeout": {
        callback: "// Delayed task using tick counter\n        ServerTickEvents.END_SERVER_TICK.register(new ServerTickEvents.EndTick() {\n            private int ticksRemaining = DELAY_TICKS;\n            @Override\n            public void onEndTick(MinecraftServer server) {\n                if (ticksRemaining-- <= 0) {",
        imports: ["net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents", "net.minecraft.server.MinecraftServer"],
        closing: "                }\n            }\n        });"
    }
};

const API_MAPPINGS = [
    { bedrock: /player\.sendMessage\(([^)]+)\)/g, java: "player.sendMessage(Text.of($1))", imports: ["net.minecraft.text.Text"] },
    { bedrock: /world\.playSound\(([^)]+)\)/g, java: "world.playSound(null, player.getBlockPos(), SoundEvents.UI_BUTTON_CLICK, SoundCategory.PLAYERS, 1.0f, 1.0f)", imports: ["net.minecraft.sound.SoundEvents", "net.minecraft.sound.SoundCategory"] },
    { bedrock: /dimension\.spawnEntity\(([^)]+)\)/g, java: "world.spawnEntity($1)", imports: ["net.minecraft.entity.Entity"] },
    { bedrock: /entity\.kill\(\)/g, java: "entity.kill()", imports: [] },
    { bedrock: /entity\.teleport\(([^)]+)\)/g, java: "entity.teleport($1)", imports: [] },
    { bedrock: /console\.warn\(([^)]+)\)/g, java: "LOGGER.warn($1)", imports: ["org.slf4j.Logger", "org.slf4j.LoggerFactory"] },
    { bedrock: /player\.runCommandAsync\(([^)]+)\)/g, java: "player.getServer().getCommandManager().executeWithPrefix(player.getCommandSource(), $1)", imports: ["net.minecraft.server.command.CommandManager"] },
    { bedrock: /player\.runCommand\(([^)]+)\)/g, java: "player.getServer().getCommandManager().executeWithPrefix(player.getCommandSource(), $1)", imports: ["net.minecraft.server.command.CommandManager"] }
];

// ============================================================
// BEDROCK → JAVA CONVERTER
// ============================================================

self.onmessage = function (e) {
    if (e.data.type === 'start') {
        const converter = new BedrockToJavaConverter(e.data.file, e.data.options);
        converter.process();
    }
};

class BedrockToJavaConverter {
    constructor(file, options = {}) {
        this.file = file;
        this.options = options;
        this.modNameBase = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, '_');
        this.modId = this.modNameBase.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 32);
        this.modClassName = this.toPascalCase(this.modNameBase);

        this.fileCount = 0;
        this.totalFiles = 0;
        this.warnings = [];

        // Collected data
        this.scripts = [];
        this.textures = { blocks: {}, items: {} };
        this.blockDefinitions = [];
        this.itemDefinitions = [];
        this.recipes = [];
        this.lootTables = [];
        this.sounds = [];
        this.languages = {};
        this.convertedEvents = [];
        this.allImports = new Set();
    }

    toPascalCase(str) {
        return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase())
            .replace(/^(.)/, (_, c) => c.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    logWarning(path, error) {
        console.warn(`[B2J Converter] Error processing ${path}:`, error);
        this.warnings.push({ path, error: error.message || String(error) });
    }

    async process() {
        self.postMessage({ type: 'status', title: 'Processing...', desc: `Reading ${this.file.name}`, isLoading: true });

        try {
            const zip = new JSZip();
            this.loadedZip = await zip.loadAsync(this.file);
            this.outputZip = new JSZip();

            // Phase 1: SCAN
            self.postMessage({ type: 'status', title: 'Scanning...', desc: 'Analyzing Bedrock Addon structure', isLoading: true, percent: 5 });
            const files = this.scan();
            this.totalFiles = files.length;

            if (this.totalFiles === 0) {
                self.postMessage({ type: 'error', message: 'No files found in the addon. Please ensure this is a valid Bedrock addon (.mcaddon/.mcpack/.zip).' });
                return;
            }

            // Phase 2: PARSE & EXTRACT
            self.postMessage({ type: 'status', title: 'Parsing Bedrock Addon...', desc: 'Extracting scripts, blocks, items & assets', isLoading: true, percent: 10 });
            for (const file of files) {
                try {
                    await this.categorizeAndProcessFile(file.path, file.entry);
                } catch (e) {
                    this.logWarning(file.path, e);
                    this.incrementCounter();
                }
            }

            // Phase 3: CONVERT SCRIPTS
            self.postMessage({ type: 'status', title: 'Converting Scripts...', desc: 'Translating Bedrock Script API → Java/Fabric', isLoading: true, percent: 60 });
            this.convertScripts();

            // Phase 4: GENERATE JAVA MOD
            self.postMessage({ type: 'status', title: 'Generating Java Mod...', desc: 'Building Fabric mod structure', isLoading: true, percent: 75 });
            this.generateJavaMod();

            // Phase 5: PACKAGE
            self.postMessage({ type: 'status', title: 'Packaging...', desc: 'Creating output archive', isLoading: true, percent: 90 });

            const content = await this.outputZip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 5 }
            }, function updateCallback(metadata) {
                self.postMessage({ type: 'status', title: 'Packaging...', desc: `Compressing ${metadata.percent.toFixed(1)}%`, isLoading: true, percent: 90 + (metadata.percent * 0.1) });
            });

            self.postMessage({
                type: 'success',
                blob: content,
                fileName: `${this.modNameBase}_java_mod.zip`,
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

    incrementCounter() {
        this.fileCount++;
        const percent = 10 + (this.fileCount / this.totalFiles) * 50;
        if (this.fileCount % 10 === 0 || this.fileCount === this.totalFiles) {
            self.postMessage({ type: 'status', title: 'Parsing Bedrock Addon...', desc: `Processed ${this.fileCount} / ${this.totalFiles} files`, isLoading: true, percent });
        }
    }

    async categorizeAndProcessFile(relativePath, zipEntry) {
        const lowerPath = relativePath.toLowerCase();

        // SCRIPTS (.js files in scripts/ folder)
        if (lowerPath.match(/(?:^|\/|_bp\/)scripts\/.*\.js$/)) {
            try {
                const content = await zipEntry.async('string');
                const name = relativePath.split('/').pop();
                this.scripts.push({ name, content, path: relativePath });
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // BLOCK DEFINITIONS
        if (lowerPath.match(/(?:^|\/|_bp\/)blocks\/.*\.json$/)) {
            try {
                const content = await zipEntry.async('string');
                const parsed = parseJSON(content);
                const name = relativePath.split('/').pop().replace('.json', '');
                this.blockDefinitions.push({ name, data: parsed, path: relativePath });
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // ITEM DEFINITIONS
        if (lowerPath.match(/(?:^|\/|_bp\/)items\/.*\.json$/)) {
            try {
                const content = await zipEntry.async('string');
                const parsed = parseJSON(content);
                const name = relativePath.split('/').pop().replace('.json', '');
                this.itemDefinitions.push({ name, data: parsed, path: relativePath });
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // RECIPES
        if (lowerPath.match(/(?:^|\/|_bp\/)recipes\/.*\.json$/)) {
            try {
                const content = await zipEntry.async('string');
                const parsed = parseJSON(content);
                const name = relativePath.split('/').pop().replace('.json', '');
                this.recipes.push({ name, data: parsed, path: relativePath });
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // LOOT TABLES
        if (lowerPath.match(/(?:^|\/|_bp\/)loot_tables\/.*\.json$/)) {
            try {
                const content = await zipEntry.async('string');
                const parsed = parseJSON(content);
                const name = relativePath.split('/').pop().replace('.json', '');
                this.lootTables.push({ name, data: parsed, path: relativePath });
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // TEXTURES
        if (lowerPath.match(/textures\/.*\.(png|tga|jpg|jpeg)$/)) {
            try {
                const fileContent = await zipEntry.async('arraybuffer');
                const name = relativePath.split('/').pop().split('.')[0];

                if (lowerPath.includes('/blocks/') || lowerPath.includes('/block/')) {
                    this.textures.blocks[name] = fileContent;
                } else if (lowerPath.includes('/items/') || lowerPath.includes('/item/')) {
                    this.textures.items[name] = fileContent;
                }
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // SOUNDS
        if (lowerPath.match(/sounds\/.*\.(ogg|wav)$/)) {
            try {
                const fileContent = await zipEntry.async('arraybuffer');
                const name = relativePath.split('/').pop();
                this.sounds.push({ name, content: fileContent, path: relativePath });
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        // LANGUAGE FILES
        if (lowerPath.match(/texts\/.*\.lang$/)) {
            try {
                const content = await zipEntry.async('string');
                const langFile = relativePath.split('/').pop();
                const langCode = langFile.replace('.lang', '');
                this.languages[langCode] = content;
                this.incrementCounter();
            } catch (e) {
                this.logWarning(relativePath, e);
            }
            return;
        }

        this.incrementCounter();
    }

    // ============================================================
    // SCRIPT CONVERSION CORE
    // ============================================================

    convertScripts() {
        for (const script of this.scripts) {
            try {
                const converted = this.convertScriptContent(script.content, script.name);
                script.convertedJava = converted.javaCode;
                script.convertedImports = converted.imports;

                for (const imp of converted.imports) {
                    this.allImports.add(imp);
                }
            } catch (e) {
                this.logWarning(script.path, e);
                script.convertedJava = `// Failed to convert: ${script.name}\n// Original Bedrock script included as comment:\n` +
                    script.content.split('\n').map(line => `// ${line}`).join('\n');
                script.convertedImports = [];
            }
        }
    }

    convertScriptContent(jsCode, fileName) {
        const imports = new Set();
        const javaBlocks = [];
        let remainingCode = jsCode;

        // Remove import statements (Bedrock-style)
        remainingCode = remainingCode.replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']*["'];?\s*/g, '');
        remainingCode = remainingCode.replace(/import\s+\*\s+as\s+\w+\s+from\s+["'][^"']*["'];?\s*/g, '');

        // Process event subscriptions
        for (const [bedrockEvent, mapping] of Object.entries(EVENT_MAPPINGS)) {
            const eventPattern = new RegExp(
                bedrockEvent.replace(/\./g, '\\.') + '\\.subscribe\\s*\\(\\s*(?:\\(([^)]*)\\)|([a-zA-Z_$][a-zA-Z0-9_$]*))\\s*=>\\s*\\{',
                'g'
            );

            let match;
            while ((match = eventPattern.exec(remainingCode)) !== null) {
                const params = match[1] || match[2] || '';
                const bodyStart = match.index + match[0].length;
                const body = this.extractBracedBlock(remainingCode, bodyStart);

                if (body !== null) {
                    const convertedBody = this.convertApiCalls(body, imports);
                    let javaBlock = `        // Converted from: ${bedrockEvent}.subscribe\n`;
                    javaBlock += `        ${mapping.callback}\n`;
                    javaBlock += this.indentCode(convertedBody, 3);
                    if (mapping.returnStatement) {
                        javaBlock += `\n${mapping.returnStatement}`;
                    }
                    if (mapping.closing) {
                        javaBlock += `\n        ${mapping.closing}`;
                    }
                    javaBlocks.push(javaBlock);

                    for (const imp of mapping.imports) {
                        imports.add(imp);
                    }
                }
            }
        }

        // Process tick intervals
        for (const [bedrockTick, mapping] of Object.entries(TICK_MAPPINGS)) {
            const tickPattern = new RegExp(
                bedrockTick.replace(/\./g, '\\.') + '\\s*\\(\\s*\\(\\)\\s*=>\\s*\\{',
                'g'
            );

            let match;
            while ((match = tickPattern.exec(remainingCode)) !== null) {
                const bodyStart = match.index + match[0].length;
                const body = this.extractBracedBlock(remainingCode, bodyStart);

                if (body !== null) {
                    const convertedBody = this.convertApiCalls(body, imports);
                    let javaBlock = `        // Converted from: ${bedrockTick}\n`;
                    javaBlock += `        ${mapping.callback}\n`;
                    javaBlock += this.indentCode(convertedBody, 3);
                    if (mapping.closing) {
                        javaBlock += `\n        ${mapping.closing}`;
                    }
                    javaBlocks.push(javaBlock);

                    for (const imp of mapping.imports) {
                        imports.add(imp);
                    }
                }
            }
        }

        // Convert any remaining standalone API calls
        const lines = remainingCode.split('\n');
        const unconvertedLines = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('import ')) continue;

            // Check if this line contains known API patterns
            let converted = false;
            for (const [bedrockEvent] of Object.entries(EVENT_MAPPINGS)) {
                if (trimmed.includes(bedrockEvent)) {
                    converted = true;
                    break;
                }
            }
            for (const [bedrockTick] of Object.entries(TICK_MAPPINGS)) {
                if (trimmed.includes(bedrockTick)) {
                    converted = true;
                    break;
                }
            }

            if (!converted && trimmed.length > 0 && !trimmed.startsWith('}') && !trimmed.startsWith(');')) {
                unconvertedLines.push(trimmed);
            }
        }

        if (unconvertedLines.length > 0) {
            let commentBlock = `        // --- Unconverted Bedrock code (manual review required) ---\n`;
            for (const line of unconvertedLines) {
                commentBlock += `        // ${line}\n`;
            }
            javaBlocks.push(commentBlock);

            this.warnings.push({
                path: fileName,
                error: `${unconvertedLines.length} line(s) could not be automatically converted and require manual review.`
            });
        }

        return {
            javaCode: javaBlocks.join('\n\n'),
            imports: Array.from(imports)
        };
    }

    extractBracedBlock(code, startIndex) {
        let depth = 1;
        let i = startIndex;
        let result = '';

        while (i < code.length && depth > 0) {
            if (code[i] === '{') depth++;
            else if (code[i] === '}') {
                depth--;
                if (depth === 0) break;
            }
            result += code[i];
            i++;
        }

        return depth === 0 ? result : null;
    }

    convertApiCalls(code, imports) {
        let converted = code;

        for (const mapping of API_MAPPINGS) {
            if (mapping.bedrock.test(converted)) {
                converted = converted.replace(mapping.bedrock, mapping.java);
                for (const imp of mapping.imports) {
                    imports.add(imp);
                }
            }
            // Reset regex lastIndex
            mapping.bedrock.lastIndex = 0;
        }

        // Convert let/const/var to Java-style type declarations (simplified)
        converted = converted.replace(/\b(?:let|const|var)\s+(\w+)\s*=\s*/g, 'var $1 = ');

        return converted;
    }

    indentCode(code, level) {
        const indent = '    '.repeat(level);
        return code.split('\n')
            .map(line => line.trim() ? `${indent}${line.trim()}` : '')
            .join('\n');
    }

    // ============================================================
    // JAVA MOD GENERATION
    // ============================================================

    generateJavaMod() {
        const srcBase = `src/main/java/com/converted/${this.modId}`;
        const resourceBase = `src/main/resources`;

        // Generate main mod class
        this.generateMainClass(srcBase);

        // Generate event handler class from converted scripts
        if (this.scripts.length > 0) {
            this.generateEventHandler(srcBase);
        }

        // Generate block classes
        this.generateBlockClasses(srcBase);

        // Generate item classes
        this.generateItemClasses(srcBase);

        // Generate recipes
        this.generateJavaRecipes(resourceBase);

        // Generate loot tables
        this.generateJavaLootTables(resourceBase);

        // Copy textures
        this.copyTextures(resourceBase);

        // Generate language files
        this.generateLanguageFiles(resourceBase);

        // Generate fabric.mod.json
        this.generateFabricModJson(resourceBase);

        // Generate build.gradle
        this.generateBuildGradle();

        // Generate gradle.properties
        this.generateGradleProperties();

        // Generate README
        this.generateReadme();
    }

    generateMainClass(srcBase) {
        const imports = [
            'net.fabricmc.api.ModInitializer',
            'org.slf4j.Logger',
            'org.slf4j.LoggerFactory'
        ];

        let code = '';
        for (const imp of imports) {
            code += `import ${imp};\n`;
        }

        code += `\npublic class ${this.modClassName} implements ModInitializer {\n`;
        code += `    public static final String MOD_ID = "${this.modId}";\n`;
        code += `    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);\n\n`;
        code += `    @Override\n`;
        code += `    public void onInitialize() {\n`;
        code += `        LOGGER.info("Initializing " + MOD_ID);\n`;

        if (this.blockDefinitions.length > 0) {
            code += `        ModBlocks.register();\n`;
        }
        if (this.itemDefinitions.length > 0) {
            code += `        ModItems.register();\n`;
        }
        if (this.scripts.length > 0) {
            code += `        ModEvents.register();\n`;
        }

        code += `    }\n`;
        code += `}\n`;

        this.outputZip.file(`${srcBase}/${this.modClassName}.java`, code);
    }

    generateEventHandler(srcBase) {
        const allImports = new Set([
            'org.slf4j.Logger',
            'org.slf4j.LoggerFactory'
        ]);

        let eventBodies = [];

        for (const script of this.scripts) {
            if (script.convertedJava) {
                eventBodies.push(`        // --- From: ${script.name} ---`);
                eventBodies.push(script.convertedJava);
            }
            if (script.convertedImports) {
                for (const imp of script.convertedImports) {
                    allImports.add(imp);
                }
            }
        }

        let code = '';
        for (const imp of Array.from(allImports).sort()) {
            code += `import ${imp};\n`;
        }

        code += `\npublic class ModEvents {\n`;
        code += `    private static final Logger LOGGER = LoggerFactory.getLogger("${this.modId}");\n\n`;
        code += `    public static void register() {\n`;

        if (eventBodies.length > 0) {
            code += eventBodies.join('\n\n') + '\n';
        } else {
            code += `        // No Bedrock events found to convert\n`;
        }

        code += `    }\n`;
        code += `}\n`;

        this.outputZip.file(`${srcBase}/ModEvents.java`, code);
    }

    generateBlockClasses(srcBase) {
        if (this.blockDefinitions.length === 0) return;

        const imports = [
            'net.minecraft.block.AbstractBlock',
            'net.minecraft.block.Block',
            'net.minecraft.item.BlockItem',
            'net.minecraft.item.Item',
            'net.minecraft.registry.Registries',
            'net.minecraft.registry.Registry',
            'net.minecraft.util.Identifier'
        ];

        let code = '';
        for (const imp of imports) {
            code += `import ${imp};\n`;
        }

        code += `\npublic class ModBlocks {\n`;

        for (const block of this.blockDefinitions) {
            const blockDesc = block.data?.["minecraft:block"]?.description;
            const blockId = blockDesc?.identifier || `${this.modId}:${block.name}`;
            const parts = blockId.split(':');
            const ns = parts[0] || this.modId;
            const name = parts[1] || block.name;
            const fieldName = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');

            const components = block.data?.["minecraft:block"]?.components || {};
            const destroyTime = components["minecraft:destroy_time"] || 1.0;
            const resistance = components["minecraft:explosion_resistance"] || 1.0;
            const lightLevel = components["minecraft:light_emission"] || 0;

            let settings = `AbstractBlock.Settings.create().strength(${destroyTime}f, ${resistance}f)`;
            if (lightLevel > 0) {
                settings += `.luminance(state -> ${lightLevel})`;
            }

            code += `    public static final Block ${fieldName} = new Block(${settings});\n`;
        }

        code += `\n    public static void register() {\n`;

        for (const block of this.blockDefinitions) {
            const blockDesc = block.data?.["minecraft:block"]?.description;
            const blockId = blockDesc?.identifier || `${this.modId}:${block.name}`;
            const parts = blockId.split(':');
            const ns = parts[0] || this.modId;
            const name = parts[1] || block.name;
            const fieldName = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');

            code += `        Registry.register(Registries.BLOCK, Identifier.of("${ns}", "${name}"), ${fieldName});\n`;
            code += `        Registry.register(Registries.ITEM, Identifier.of("${ns}", "${name}"), new BlockItem(${fieldName}, new Item.Settings()));\n`;
        }

        code += `    }\n`;
        code += `}\n`;

        this.outputZip.file(`${srcBase}/ModBlocks.java`, code);
    }

    generateItemClasses(srcBase) {
        if (this.itemDefinitions.length === 0) return;

        const imports = [
            'net.minecraft.item.Item',
            'net.minecraft.registry.Registries',
            'net.minecraft.registry.Registry',
            'net.minecraft.util.Identifier'
        ];

        let code = '';
        for (const imp of imports) {
            code += `import ${imp};\n`;
        }

        code += `\npublic class ModItems {\n`;

        for (const item of this.itemDefinitions) {
            const itemDesc = item.data?.["minecraft:item"]?.description;
            const itemId = itemDesc?.identifier || `${this.modId}:${item.name}`;
            const parts = itemId.split(':');
            const ns = parts[0] || this.modId;
            const name = parts[1] || item.name;
            const fieldName = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');

            const components = item.data?.["minecraft:item"]?.components || {};
            const maxStack = components["minecraft:max_stack_size"] || 64;

            code += `    public static final Item ${fieldName} = new Item(new Item.Settings().maxCount(${maxStack}));\n`;
        }

        code += `\n    public static void register() {\n`;

        for (const item of this.itemDefinitions) {
            const itemDesc = item.data?.["minecraft:item"]?.description;
            const itemId = itemDesc?.identifier || `${this.modId}:${item.name}`;
            const parts = itemId.split(':');
            const ns = parts[0] || this.modId;
            const name = parts[1] || item.name;
            const fieldName = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');

            code += `        Registry.register(Registries.ITEM, Identifier.of("${ns}", "${name}"), ${fieldName});\n`;
        }

        code += `    }\n`;
        code += `}\n`;

        this.outputZip.file(`${srcBase}/ModItems.java`, code);
    }

    generateJavaRecipes(resourceBase) {
        for (const recipe of this.recipes) {
            try {
                const data = recipe.data;
                let javaRecipe = null;

                if (data["minecraft:recipe_shaped"]) {
                    const r = data["minecraft:recipe_shaped"];
                    javaRecipe = {
                        "type": "minecraft:crafting_shaped",
                        "pattern": r.pattern || [],
                        "key": {},
                        "result": {
                            "item": typeof r.result === 'string' ? r.result : (r.result?.item || "minecraft:air"),
                            "count": r.result?.count || 1
                        }
                    };
                    if (r.key) {
                        for (const [k, v] of Object.entries(r.key)) {
                            javaRecipe.key[k] = { "item": v.item || v };
                        }
                    }
                } else if (data["minecraft:recipe_shapeless"]) {
                    const r = data["minecraft:recipe_shapeless"];
                    javaRecipe = {
                        "type": "minecraft:crafting_shapeless",
                        "ingredients": (r.ingredients || []).map(i => ({ "item": i.item || i })),
                        "result": {
                            "item": typeof r.result === 'string' ? r.result : (r.result?.item || "minecraft:air"),
                            "count": r.result?.count || 1
                        }
                    };
                } else if (data["minecraft:recipe_furnace"]) {
                    const r = data["minecraft:recipe_furnace"];
                    javaRecipe = {
                        "type": "minecraft:smelting",
                        "ingredient": { "item": typeof r.input === 'string' ? r.input : (r.input?.item || "minecraft:air") },
                        "result": typeof r.output === 'string' ? r.output : (r.output?.item || "minecraft:air"),
                        "experience": 0.1,
                        "cookingtime": 200
                    };
                }

                if (javaRecipe) {
                    const ns = this.modId;
                    this.outputZip.file(`${resourceBase}/data/${ns}/recipes/${recipe.name}.json`, JSON.stringify(javaRecipe, null, 4));
                }
            } catch (e) {
                this.logWarning(recipe.path, e);
            }
        }
    }

    generateJavaLootTables(resourceBase) {
        for (const loot of this.lootTables) {
            try {
                const data = loot.data;
                const javaLoot = {
                    "type": "minecraft:block",
                    "pools": (data.pools || []).map(pool => ({
                        "rolls": pool.rolls || 1,
                        "entries": (pool.entries || []).map(entry => ({
                            "type": "minecraft:item",
                            "name": entry.name || "minecraft:air",
                            "weight": entry.weight || 1
                        }))
                    }))
                };

                const ns = this.modId;
                this.outputZip.file(`${resourceBase}/data/${ns}/loot_tables/${loot.name}.json`, JSON.stringify(javaLoot, null, 4));
            } catch (e) {
                this.logWarning(loot.path, e);
            }
        }
    }

    copyTextures(resourceBase) {
        const ns = this.modId;

        for (const [name, content] of Object.entries(this.textures.blocks)) {
            this.outputZip.file(`${resourceBase}/assets/${ns}/textures/block/${name}.png`, content);
        }

        for (const [name, content] of Object.entries(this.textures.items)) {
            this.outputZip.file(`${resourceBase}/assets/${ns}/textures/item/${name}.png`, content);
        }
    }

    generateLanguageFiles(resourceBase) {
        const ns = this.modId;

        for (const [langCode, content] of Object.entries(this.languages)) {
            // Convert .lang format to JSON
            const langJson = {};
            const lines = content.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

                const eqIdx = trimmed.indexOf('=');
                if (eqIdx === -1) continue;

                let key = trimmed.substring(0, eqIdx);
                const value = trimmed.substring(eqIdx + 1);

                // Convert Bedrock keys to Java format
                // tile.namespace:blockname.name → block.namespace.blockname
                if (key.startsWith('tile.') && key.endsWith('.name')) {
                    key = key.replace('tile.', 'block.').replace('.name', '');
                    key = key.replace(':', '.');
                }
                // item.namespace:itemname.name → item.namespace.itemname
                if (key.startsWith('item.') && key.endsWith('.name')) {
                    key = key.replace('.name', '');
                    key = key.replace(':', '.');
                }

                langJson[key] = value;
            }

            // Java uses en_us.json format
            const javaLangCode = langCode.toLowerCase();
            this.outputZip.file(`${resourceBase}/assets/${ns}/lang/${javaLangCode}.json`, JSON.stringify(langJson, null, 4));
        }
    }

    generateFabricModJson(resourceBase) {
        const fabricMod = {
            "schemaVersion": 1,
            "id": this.modId,
            "version": "1.0.0",
            "name": this.modNameBase,
            "description": `Converted from Bedrock addon by MC-ModsConverter`,
            "authors": ["MC-ModsConverter"],
            "contact": {
                "homepage": "https://minecraft-julian.github.io/MC-ModsConverter/"
            },
            "license": "All-Rights-Reserved",
            "environment": "*",
            "entrypoints": {
                "main": [`com.converted.${this.modId}.${this.modClassName}`]
            },
            "depends": {
                "fabricloader": ">=0.15.0",
                "minecraft": ">=1.20.4",
                "java": ">=17",
                "fabric-api": "*"
            }
        };

        this.outputZip.file(`${resourceBase}/fabric.mod.json`, JSON.stringify(fabricMod, null, 4));
    }

    generateBuildGradle() {
        const gradle = `plugins {
    id 'fabric-loom' version '1.5-SNAPSHOT'
    id 'maven-publish'
}

version = project.mod_version
group = project.maven_group

repositories {
    // Add additional repositories here
}

dependencies {
    minecraft "com.mojang:minecraft:\${project.minecraft_version}"
    mappings "net.fabricmc:yarn:\${project.yarn_mappings}:v2"
    modImplementation "net.fabricmc:fabric-loader:\${project.loader_version}"
    modImplementation "net.fabricmc.fabric-api:fabric-api:\${project.fabric_version}"
}

processResources {
    inputs.property "version", project.version
    filteringCharset "UTF-8"

    filesMatching("fabric.mod.json") {
        expand "version": project.version
    }
}

tasks.withType(JavaCompile).configureEach {
    it.options.release = 17
}

java {
    withSourcesJar()
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

jar {
    from("LICENSE") {
        rename { "\${it}_\${project.archivesBaseName}" }
    }
}
`;
        this.outputZip.file('build.gradle', gradle);
    }

    generateGradleProperties() {
        const props = `# Fabric Properties
minecraft_version=1.20.4
yarn_mappings=1.20.4+build.3
loader_version=0.15.6

# Mod Properties
mod_version=1.0.0
maven_group=com.converted.${this.modId}
archives_base_name=${this.modId}

# Dependencies
fabric_version=0.96.4+1.20.4
`;
        this.outputZip.file('gradle.properties', props);
    }

    generateReadme() {
        const readme = `# ${this.modNameBase} (Converted Java Mod)

This mod was automatically converted from a Minecraft Bedrock Edition addon using [MC-ModsConverter](https://minecraft-julian.github.io/MC-ModsConverter/).

## Setup

1. Install [Fabric Loader](https://fabricmc.net/) and [Fabric API](https://modrinth.com/mod/fabric-api)
2. Set up a Fabric mod development environment
3. Copy this project into your workspace
4. Run \`./gradlew build\` to compile

## Notes

- Converted scripts may require manual adjustments
- Check \`ModEvents.java\` for converted event handlers
- Some Bedrock-specific features may not have direct Java equivalents
- Review all generated code before using in production

## Generated Files

| File | Description |
|------|-------------|
| \`${this.modClassName}.java\` | Main mod entry point |
| \`ModEvents.java\` | Converted Bedrock script event handlers |
| \`ModBlocks.java\` | Block registrations |
| \`ModItems.java\` | Item registrations |

---
*Generated by MC-ModsConverter*
`;
        this.outputZip.file('README.md', readme);
    }
}
