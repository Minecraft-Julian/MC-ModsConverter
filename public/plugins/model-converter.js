/**
 * Plugin: Model Converter
 * Converts Java block/item models to Bedrock geometry format.
 */
export default function register(pluginSystem) {
    pluginSystem.register(
        'convert_model',
        'Convert a Java block or item model (JSON) to Bedrock geometry format. Java models use elements[] with from/to coordinates, Bedrock uses bones[] with cubes[]. Also registers the geometry in the resource pack.',
        {
            type: 'object',
            properties: {
                modelPath: {
                    type: 'string',
                    description: 'Path to the model file inside the Java mod (e.g. "assets/mymod/models/block/my_block.json")'
                },
                modelType: {
                    type: 'string',
                    enum: ['block', 'item'],
                    description: 'Whether this is a block or item model'
                },
                namespace: {
                    type: 'string',
                    description: 'Mod namespace'
                }
            },
            required: ['modelPath', 'modelType']
        },
        async (args, ctx) => {
            const { modelPath, modelType, namespace } = args;
            const { javaZip, rpFolder } = ctx;

            const entry = javaZip.file(modelPath);
            if (!entry) {
                return { success: false, message: `Model file not found: ${modelPath}` };
            }

            const content = await entry.async('string');
            let javaModel;
            try {
                javaModel = JSON.parse(content);
            } catch {
                return { success: false, message: `Invalid JSON in model: ${modelPath}` };
            }

            // Extract model name from path
            const modelName = modelPath.split('/').pop().replace('.json', '');
            const ns = namespace || modelPath.split('/')[1] || 'custom';
            const geoId = `geometry.${ns}.${modelName}`;

            // Convert Java elements to Bedrock geometry
            const geometry = {
                format_version: '1.16.0',
                'minecraft:geometry': [{
                    description: {
                        identifier: geoId,
                        texture_width: javaModel.texture_size?.[0] || 16,
                        texture_height: javaModel.texture_size?.[1] || 16,
                        visible_bounds_width: 2,
                        visible_bounds_height: 2.5,
                        visible_bounds_offset: [0, 0.75, 0]
                    },
                    bones: []
                }]
            };

            const mainBone = {
                name: modelName,
                pivot: [0, 0, 0],
                cubes: []
            };

            if (Array.isArray(javaModel.elements)) {
                for (const elem of javaModel.elements) {
                    if (!elem.from || !elem.to) continue;

                    // Java: from/to are [x, y, z] in 0-16 space
                    // Bedrock: origin + size, centered on [8, 0, 8]
                    const origin = [
                        elem.from[0] - 8,
                        elem.from[1],
                        elem.from[2] - 8
                    ];
                    const size = [
                        elem.to[0] - elem.from[0],
                        elem.to[1] - elem.from[1],
                        elem.to[2] - elem.from[2]
                    ];

                    const cube = { origin, size, pivot: [0, 0, 0] };

                    // Handle rotation
                    if (elem.rotation) {
                        const axis = elem.rotation.axis || 'y';
                        const angle = elem.rotation.angle || 0;
                        const rotOrigin = elem.rotation.origin
                            ? [elem.rotation.origin[0] - 8, elem.rotation.origin[1], elem.rotation.origin[2] - 8]
                            : [0, 0, 0];
                        cube.pivot = rotOrigin;
                        cube.rotation = [
                            axis === 'x' ? -angle : 0,
                            axis === 'y' ? -angle : 0,
                            axis === 'z' ? angle : 0
                        ];
                    }

                    // Handle UV mapping
                    if (elem.faces) {
                        const uvMap = {};
                        for (const [face, faceData] of Object.entries(elem.faces)) {
                            if (faceData.uv) {
                                // Java UV: [x1, y1, x2, y2] in 0-16 pixel space
                                uvMap[face] = {
                                    uv: [faceData.uv[0], faceData.uv[1]],
                                    uv_size: [faceData.uv[2] - faceData.uv[0], faceData.uv[3] - faceData.uv[1]]
                                };
                            }
                        }
                        if (Object.keys(uvMap).length > 0) {
                            cube.uv = uvMap;
                        }
                    }

                    mainBone.cubes.push(cube);
                }
            }

            geometry['minecraft:geometry'][0].bones.push(mainBone);

            // Write geometry file
            const geoPath = `models/${modelType}s/${modelName}.geo.json`;
            rpFolder.file(geoPath, JSON.stringify(geometry, null, 2));

            // Track geometry in context
            if (!ctx.geometries) ctx.geometries = new Set();
            ctx.geometries.add(geoId);

            return {
                success: true,
                geometryId: geoId,
                cubeCount: mainBone.cubes.length,
                outputPath: geoPath,
                message: `Converted model "${modelName}" → ${geoId} (${mainBone.cubes.length} cubes)`
            };
        }
    );
}
