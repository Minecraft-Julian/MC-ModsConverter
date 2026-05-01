/**
 * Plugin: Script Generator
 * Generates Bedrock Script API (main.js) for behavior logic.
 */
export default function register(ps) {
    ps.register('generate_script',
        'Generate a Bedrock Script API JavaScript file for the behavior pack. Write custom game logic like block interactions, item usage, entity behavior etc.',
        {
            type: 'object',
            properties: {
                scriptContent: { type: 'string', description: 'The JavaScript code to write as main.js (must use @minecraft/server imports)' },
                fileName: { type: 'string', description: 'Script file name (default: main.js)' }
            },
            required: ['scriptContent']
        },
        async (args, ctx) => {
            const { scriptContent, fileName } = args;
            const name = fileName || 'main.js';
            ctx.bpFolder.file(`scripts/${name}`, scriptContent);
            ctx.hasScripts = true;
            return { success: true, message: `Generated script: scripts/${name}` };
        }
    );
}
