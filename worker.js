importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

const ASSET_TYPES = {

    'textures': { path: 'textures/', bedrockPath: 'textures/', convert: true },

    'models': { path: 'models/', bedrockPath: 'models/', convert: true },

    'sounds': { path: 'sounds/', bedrockPath: 'sounds/', convert: true },

    'lang': { path: 'lang/', bedrockPath: 'texts/', convert: true },

    'recipes': { path: 'recipes/', bedrockPath: 'recipes/', convert: true },

    'loot_tables': { path: 'loot_tables/', bedrockPath: 'loot_tables/', convert: true },

    'structures': { path: 'structures/', bedrockPath: 'structures/', convert: true },

    'advancements': { path: 'advancements/', bedrockPath: 'behavior_pack/advancements/', convert: false },

    'functions': { path: 'functions/', bedrockPath: 'behavior_pack/functions/', convert: false },

    'tags': { path: 'tags/', bedrockPath: 'behavior_pack/tags/', convert: false },

    'animations': { path: 'blockstates/', bedrockPath: 'blocks/', convert: true },

    'entities': { path: 'entities/', bedrockPath: 'entities/', convert: true },

    'particles': { path: 'particles/', bedrockPath: 'particles/', convert: true },

    'items': { path: 'models/item/', bedrockPath: 'models/items/', convert: true },

};

let warnings = [];

let totalAssets = 0;

let convertedAssets = 0;

onmessage = function(e) {

    const data = e.data;

    if (data.type === 'start') {

        warnings = [];

        totalAssets = 0;

        convertedAssets = 0;

        processFile(data.file, data.options);

    }

};

function processFile(file, options) {

    postMessage({ type: 'status', title: 'Processing...', desc: 'Reading file architecture', isLoading: true });

    JSZip.loadAsync(file).then(zip => {

        const assets = {};

        const promises = [];

        zip.forEach((relativePath, zipEntry) => {

            if (!zipEntry.dir) {

                if (relativePath.endsWith('.jar')) {

                    // Handle modpacks: load sub-jars

                    promises.push(zipEntry.async('arraybuffer').then(ab => {

                        return JSZip.loadAsync(ab).then(subZip => {

                            subZip.forEach((subPath, subEntry) => {

                                if (!subEntry.dir) {

                                    const assetType = getAssetType(subPath);

                                    if (assetType) {

                                        if (!assets[assetType]) assets[assetType] = [];

                                        promises.push(subEntry.async('blob').then(content => {

                                            assets[assetType].push({ path: subPath, content: content });

                                        }));

                                    }

                                }

                            });

                        });

                    }));

                } else {

                    const assetType = getAssetType(relativePath);

                    if (assetType) {

                        if (!assets[assetType]) assets[assetType] = [];

                        promises.push(zipEntry.async('blob').then(content => {

                            assets[assetType].push({ path: relativePath, content: content });

                        }));

                    }

                }

            }

        });

        return Promise.all(promises).then(() => {

            return convertAssets(assets, options);

        });

    }).then(result => {

        postMessage({ type: 'success', blob: result.blob, fileName: result.fileName, count: convertedAssets, warnings: warnings });

    }).catch(error => {

        postMessage({ type: 'error', message: error.message });

    });

}

function getAssetType(path) {

    for (const [type, config] of Object.entries(ASSET_TYPES)) {

        if (path.startsWith('assets/minecraft/' + config.path) || path.startsWith(config.path)) {

            return type;

        }

    }

    return null;

}

function convertAssets(assets, options) {

    const outputZip = new JSZip();

    const promises = [];

    for (const [type, config] of Object.entries(ASSET_TYPES)) {

        if (assets[type]) {

            assets[type].forEach(asset => {

                totalAssets++;

                promises.push(convertAsset(asset, config, options, type).then(converted => {

                    if (converted) {

                        convertedAssets++;

                        outputZip.file(converted.path, converted.content);

                    }

                }));

            });

        }

    }

    return Promise.all(promises).then(() => {

        return outputZip.generateAsync({ type: 'blob' });

    }).then(blob => {

        return { blob: blob, fileName: 'converted.mcaddon' };

    });

}

function convertAsset(asset, config, options, type) {

    return new Promise((resolve) => {

        const bedrockPath = asset.path.replace(/^assets\/minecraft\//, config.bedrockPath).replace(/^/, config.bedrockPath);

        if (config.convert) {

            if (asset.path.endsWith('.json')) {

                asset.content.text().then(text => {

                    let convertedText = text;

                    if (type === 'models' && options.convertModels) {

                        convertedText = convertModel(text, asset.path);

                    } else if (type === 'recipes') {

                        convertedText = convertRecipe(text);

                    } else if (type === 'animations') {

                        convertedText = convertAnimation(text);

                    } else if (type === 'entities') {

                        convertedText = convertEntity(text);

                    } else if (type === 'particles') {

                        convertedText = convertParticle(text);

                    } else if (type === 'items') {

                        convertedText = convertItem(text);

                    }

                    resolve({ path: bedrockPath, content: convertedText });

                });

            } else {

                resolve({ path: bedrockPath, content: asset.content });

            }

        } else {

            resolve({ path: bedrockPath, content: asset.content });

        }

    });

}

function convertModel(jsonText, path) {

    try {

        const model = JSON.parse(jsonText);

        if (path.includes('/item/')) {

            // Item model

            return convertItem(jsonText);

        } else {

            // Block model

            if (model.elements) {

                const geometry = {

                    format_version: '1.12.0',

                    'minecraft:geometry': [{

                        description: {

                            identifier: 'geometry.unknown',

texture_width: model.texture_size ? model.texture_size[0] : 16,

                            texture_height: model.texture_size ? model.texture_size[1] : 16

                        },

                        bones: [{

                            name: 'root',

                            pivot: [0, 0, 0],

                            cubes: model.elements.map(el => ({

                                origin: el.from,

                                size: [el.to[0] - el.from[0], el.to[1] - el.from[1], el.to[2] - el.from[2]],

                                uv: el.faces ? Object.values(el.faces).map(f => f.uv || [0,0,16,16]).flat() : []

                            }))

                        }]

                    }]

                };

                return JSON.stringify(geometry, null, 2);

            }

        }

        return jsonText;

    } catch (e) {

        warnings.push({ path: path, error: 'Failed to convert model: ' + e.message });

        return jsonText;

    }

}

function convertRecipe(jsonText) {

    try {

        const recipe = JSON.parse(jsonText);

        // Basic recipe conversion - keep as is for now, Bedrock recipes are similar

        return jsonText;

    } catch (e) {

        warnings.push({ path: asset.path, error: 'Failed to convert recipe: ' + e.message });

        return jsonText;

    }

}

function convertAnimation(jsonText) {

    try {

        const blockstate = JSON.parse(jsonText);

        const blockDef = {

            format_version: "1.16.100",

            "minecraft:block": {

                description: {

                    identifier: "minecraft:unknown"

                },

                components: {},

                permutations: []

            }

        };

        if (blockstate.variants) {

            for (const [key, value] of Object.entries(blockstate.variants)) {

                const perm = {

                    condition: `query.block_property('${key}')`,

                    components: {}

                };

                if (value.model) {

                    // Add geometry or something

                    perm.components["minecraft:geometry"] = { identifier: value.model };

                }

                blockDef["minecraft:block"].permutations.push(perm);

            }

        }

        return JSON.stringify(blockDef, null, 2);

    } catch (e) {

        warnings.push({ path: asset.path, error: 'Failed to convert animation: ' + e.message });

        return jsonText;

    }

}

function convertEntity(jsonText) {

    try {

        const entity = JSON.parse(jsonText);

        if (!entity['minecraft:entity']) {

            entity['minecraft:entity'] = {

                description: {

                    identifier: entity.id || 'unknown',

                    is_spawnable: true,

                    is_summonable: true

                },

                components: entity.components || {}

            };

        }

        return JSON.stringify(entity, null, 2);

    } catch (e) {

        warnings.push({ path: asset.path, error: 'Failed to convert entity: ' + e.message });

        return jsonText;

    }

}

function convertParticle(jsonText) {

    try {

        // Particles are similar, keep as is

        return jsonText;

    } catch (e) {

        warnings.push({ path: asset.path, error: 'Failed to convert particle: ' + e.message });

        return jsonText;

    }

}

function convertItem(jsonText) {

    try {

        const item = JSON.parse(jsonText);

        // Java item models are similar to Bedrock item models

        return JSON.stringify(item, null, 2);

    } catch (e) {

        warnings.push({ path: asset.path, error: 'Failed to convert item: ' + e.message });

        return jsonText;

    }

}

// Progress updates (simplified)

setInterval(() => {

    if (totalAssets > 0) {

        const percent = Math.min(100, Math.round((convertedAssets / totalAssets) * 100));

        postMessage({ type: 'status', title: 'Converting...', desc: `Converted ${convertedAssets} of ${totalAssets} assets`, isLoading: true, percent: percent });

    }

}, 500);percent });

    }

}, 500);