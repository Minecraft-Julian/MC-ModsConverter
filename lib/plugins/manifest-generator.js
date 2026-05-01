import { v4 as uuidv4 } from 'uuid';

export default function register(ps) {
    ps.register('generate_manifest',
        'Generate Bedrock manifest.json for BP and RP.',
        {
            type: 'object',
            properties: {
                modName: { type: 'string' },
                modDescription: { type: 'string' },
                modVersion: { type: 'string' },
                authors: { type: 'array', items: { type: 'string' } },
                includeScripts: { type: 'boolean' }
            },
            required: ['modName']
        },
        async (args, ctx) => {
            const { modName, modDescription, modVersion, authors, includeScripts } = args;
            const ver = (modVersion || '1.0.0').replace(/[^0-9.]/g, '').split('.').map(Number);
            const version = [ver[0]||1, ver[1]||0, ver[2]||0];
            const ids = { rp: uuidv4(), bp: uuidv4(), rpM: uuidv4(), bpM: uuidv4() };

            const rpManifest = {
                format_version: 2,
                header: { name: `${modName} Resources`, description: modDescription || modName, uuid: ids.rp, version, min_engine_version: [1,20,0] },
                modules: [{ type: 'resources', uuid: ids.rpM, version }],
                dependencies: [{ uuid: ids.bpM, version }],
                metadata: { authors: authors || ['MC-ModsConverter'] }
            };

            const bpManifest = {
                format_version: 2,
                header: { name: `${modName} Behaviors`, description: modDescription || modName, uuid: ids.bp, version, min_engine_version: [1,20,0] },
                modules: [{ type: 'data', uuid: ids.bpM, version }],
                dependencies: [{ uuid: ids.rpM, version }],
                metadata: { authors: authors || ['MC-ModsConverter'] }
            };

            if (includeScripts) {
                bpManifest.modules.push({ type: 'script', language: 'javascript', uuid: uuidv4(), entry: 'scripts/main.js', version: [1,0,0] });
                bpManifest.dependencies.push({ module_name: '@minecraft/server', version: '1.1.0' });
            }

            ctx.rpFolder.file('manifest.json', JSON.stringify(rpManifest, null, 2));
            ctx.bpFolder.file('manifest.json', JSON.stringify(bpManifest, null, 2));
            ctx.manifestUUIDs = ids;

            return { success: true, message: `Generated manifests for "${modName}"` };
        }
    );
}
