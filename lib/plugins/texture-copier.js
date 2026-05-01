/**
 * Plugin: Texture Copier
 * Copies textures from Java mod structure to Bedrock addon structure.
 * Handles path remapping: assets/<ns>/textures/ → textures/
 */
export default function register(pluginSystem) {
    pluginSystem.register(
        'copy_textures',
        'Copy textures from the Java mod to the Bedrock addon. Automatically remaps paths from Java format (assets/<namespace>/textures/block/) to Bedrock format (textures/blocks/). Supports types: block, item, entity, particle, environment, gui.',
        {
            type: 'object',
            properties: {
                textureType: {
                    type: 'string',
                    enum: ['block', 'item', 'entity', 'particle', 'environment', 'gui', 'all'],
                    description: 'Type of textures to copy. Use "all" to copy everything.'
                },
                namespace: {
                    type: 'string',
                    description: 'Mod namespace to copy textures from. Leave empty for all namespaces.'
                }
            },
            required: ['textureType']
        },
        async (args, ctx) => {
            const { textureType, namespace } = args;
            const { javaZip, bedrockZip, rpFolder } = ctx;
            let copied = 0;
            let skipped = 0;

            // Java → Bedrock path mappings
            const pathMap = {
                'block': { java: 'textures/block/', bedrock: 'textures/blocks/' },
                'item': { java: 'textures/item/', bedrock: 'textures/items/' },
                'entity': { java: 'textures/entity/', bedrock: 'textures/entity/' },
                'particle': { java: 'textures/particle/', bedrock: 'textures/particle/' },
                'environment': { java: 'textures/environment/', bedrock: 'textures/environment/' },
                'gui': { java: 'textures/gui/', bedrock: 'textures/ui/' }
            };

            const types = textureType === 'all' ? Object.keys(pathMap) : [textureType];

            for (const [filePath, zipEntry] of Object.entries(javaZip.files)) {
                if (zipEntry.dir) continue;

                const assetsMatch = filePath.match(/^assets\/([^/]+)\/(.+)$/);
                if (!assetsMatch) continue;

                const ns = assetsMatch[1];
                if (namespace && ns !== namespace) continue;
                if (ns === 'minecraft') continue; // Skip vanilla textures

                const subPath = assetsMatch[2];

                for (const type of types) {
                    const mapping = pathMap[type];
                    if (!mapping) continue;

                    if (subPath.startsWith(mapping.java)) {
                        const fileName = subPath.substring(mapping.java.length);
                        // Only copy image files
                        if (!fileName.match(/\.(png|jpg|jpeg|tga)$/i)) continue;

                        try {
                            const data = await zipEntry.async('uint8array');
                            rpFolder.file(`${mapping.bedrock}${fileName}`, data);
                            copied++;
                        } catch (e) {
                            skipped++;
                        }
                    }
                }
            }

            return {
                success: true,
                copied,
                skipped,
                message: `Copied ${copied} ${textureType} textures${namespace ? ` from namespace "${namespace}"` : ''}.${skipped > 0 ? ` Skipped ${skipped} files.` : ''}`
            };
        }
    );
}
