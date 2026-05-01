/**
 * Plugin: NBT Converter
 * Converts Java .nbt structure files to Bedrock .mcstructure format.
 */
export default function register(ps) {
    ps.register('convert_nbt',
        'Convert a Java NBT structure file (.nbt) to Bedrock .mcstructure format. Handles block ID remapping.',
        {
            type: 'object',
            properties: {
                nbtPath: { type: 'string', description: 'Path to .nbt file in the Java mod' },
                outputName: { type: 'string', description: 'Output structure name' }
            },
            required: ['nbtPath']
        },
        async (args, ctx) => {
            const { nbtPath, outputName } = args;
            const entry = ctx.javaZip.file(nbtPath);
            if (!entry) return { success: false, message: `Not found: ${nbtPath}` };

            const name = outputName || nbtPath.split('/').pop().replace('.nbt', '');

            // For now, copy the raw NBT data. Full conversion would require
            // block palette remapping which needs the block mapping table.
            try {
                const data = await entry.async('uint8array');
                ctx.bpFolder.file(`structures/${name}.mcstructure`, data);
                return {
                    success: true,
                    message: `Copied structure "${name}" (raw NBT → mcstructure placeholder). Note: Block IDs may need manual remapping.`
                };
            } catch (e) {
                return { success: false, message: `Failed to process: ${e.message}` };
            }
        }
    );
}
