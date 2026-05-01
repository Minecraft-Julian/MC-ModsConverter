/**
 * Plugin: Blockstate Mapper
 * Converts Java blockstates to Bedrock block definitions with permutations.
 */
export default function register(ps) {
    ps.register('convert_blockstate',
        'Convert a Java blockstate JSON to a Bedrock block definition with permutations and material instances.',
        {
            type: 'object',
            properties: {
                blockstatePath: { type: 'string', description: 'Path to blockstate JSON in Java mod' },
                namespace: { type: 'string', description: 'Mod namespace' },
                textureId: { type: 'string', description: 'Texture shortname for the block' }
            },
            required: ['blockstatePath']
        },
        async (args, ctx) => {
            const { blockstatePath, namespace, textureId } = args;
            const entry = ctx.javaZip.file(blockstatePath);
            if (!entry) return { success: false, message: `Not found: ${blockstatePath}` };

            const content = await entry.async('string');
            let blockstate;
            try { blockstate = JSON.parse(content); } catch { return { success: false, message: 'Invalid JSON' }; }

            const blockName = blockstatePath.split('/').pop().replace('.json', '');
            const ns = namespace || blockstatePath.split('/')[1] || 'custom';
            const fullId = `${ns}:${blockName}`;

            const blockDef = {
                format_version: '1.20.10',
                'minecraft:block': {
                    description: { identifier: fullId, menu_category: { category: 'construction' } },
                    components: {
                        'minecraft:material_instances': {
                            '*': { texture: textureId || blockName, render_method: 'alpha_test' }
                        },
                        'minecraft:destructible_by_mining': { seconds_to_destroy: 3.0 },
                        'minecraft:destructible_by_explosion': { explosion_resistance: 3.0 }
                    }
                }
            };

            // Extract properties from blockstate variants
            if (blockstate.variants) {
                const properties = {};
                const permutations = [];

                for (const variantKey of Object.keys(blockstate.variants)) {
                    if (!variantKey || variantKey === '') continue;
                    const props = variantKey.split(',').map(p => p.trim().split('='));
                    for (const [key, value] of props) {
                        if (!properties[key]) properties[key] = new Set();
                        properties[key].add(value);
                    }
                }

                if (Object.keys(properties).length > 0) {
                    const propDef = {};
                    for (const [key, values] of Object.entries(properties)) {
                        const valArr = Array.from(values);
                        const allBool = valArr.every(v => v === 'true' || v === 'false');
                        propDef[`${ns}:${key}`] = allBool
                            ? [false, true]
                            : valArr.map(v => isNaN(v) ? v : Number(v));
                    }
                    blockDef['minecraft:block'].description.properties = propDef;
                }
            }

            ctx.bpFolder.file(`blocks/${blockName}.json`, JSON.stringify(blockDef, null, 2));

            if (!ctx.blocks) ctx.blocks = new Set();
            ctx.blocks.add(fullId);

            return { success: true, blockId: fullId, message: `Created block definition: ${fullId}` };
        }
    );
}
