/**
 * Plugin: Sound Converter
 * Copies sound files and generates Bedrock sound_definitions.json
 */
export default function register(pluginSystem) {
    pluginSystem.register(
        'convert_sounds',
        'Copy sound files from Java mod and generate Bedrock sound_definitions.json. Handles .ogg files and remaps sound event paths.',
        {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: 'Mod namespace to process sounds from'
                }
            },
            required: ['namespace']
        },
        async (args, ctx) => {
            const { namespace } = args;
            const { javaZip, rpFolder } = ctx;
            let copied = 0;
            const soundDefs = {};

            // Look for sounds.json
            const soundsJsonPath = `assets/${namespace}/sounds.json`;
            const soundsJsonEntry = javaZip.file(soundsJsonPath);
            let javaSoundsJson = null;

            if (soundsJsonEntry) {
                try {
                    const content = await soundsJsonEntry.async('string');
                    javaSoundsJson = JSON.parse(content);
                } catch { /* ignore parse errors */ }
            }

            // Copy all .ogg files from the namespace
            const soundPrefix = `assets/${namespace}/sounds/`;
            for (const [filePath, zipEntry] of Object.entries(javaZip.files)) {
                if (zipEntry.dir) continue;
                if (!filePath.startsWith(soundPrefix)) continue;
                if (!filePath.endsWith('.ogg')) continue;

                const relativePath = filePath.substring(soundPrefix.length);
                const bedrockPath = `sounds/${namespace}/${relativePath}`;

                try {
                    const data = await zipEntry.async('uint8array');
                    rpFolder.file(bedrockPath, data);
                    copied++;
                } catch { /* skip failed reads */ }
            }

            // Generate sound_definitions.json
            if (javaSoundsJson) {
                for (const [eventName, soundData] of Object.entries(javaSoundsJson)) {
                    const sounds = [];
                    if (Array.isArray(soundData.sounds)) {
                        for (const sound of soundData.sounds) {
                            const soundPath = typeof sound === 'string' ? sound : sound.name;
                            if (soundPath) {
                                sounds.push(`sounds/${namespace}/${soundPath.replace(/^[^:]+:/, '')}`);
                            }
                        }
                    }

                    if (sounds.length > 0) {
                        soundDefs[`${namespace}.${eventName.replace(/\./g, '.')}`] = {
                            category: soundData.category || 'neutral',
                            sounds: sounds.map(s => ({ name: s.replace('.ogg', ''), stream: false }))
                        };
                    }
                }
            }

            if (Object.keys(soundDefs).length > 0 || copied > 0) {
                const existing = ctx.soundDefinitions || {};
                Object.assign(existing, soundDefs);
                ctx.soundDefinitions = existing;

                rpFolder.file('sounds/sound_definitions.json', JSON.stringify({
                    format_version: '1.20.20',
                    sound_definitions: ctx.soundDefinitions
                }, null, 2));
            }

            return {
                success: true,
                copied,
                definitionsGenerated: Object.keys(soundDefs).length,
                message: `Copied ${copied} sound files, generated ${Object.keys(soundDefs).length} sound definitions for "${namespace}".`
            };
        }
    );
}
