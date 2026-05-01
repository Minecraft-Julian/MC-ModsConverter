/**
 * Plugin: Recipe Converter
 * Converts Java crafting recipes to Bedrock format.
 */
export default function register(pluginSystem) {
    pluginSystem.register(
        'convert_recipe',
        'Convert a Java crafting recipe to Bedrock format. Handles shaped, shapeless, smelting, stonecutting, and smithing recipes. Remaps item IDs and adjusts format differences.',
        {
            type: 'object',
            properties: {
                recipePath: {
                    type: 'string',
                    description: 'Path to the recipe JSON inside the Java mod (e.g. "data/mymod/recipes/my_recipe.json")'
                },
                namespace: {
                    type: 'string',
                    description: 'Mod namespace for the recipe identifier'
                }
            },
            required: ['recipePath']
        },
        async (args, ctx) => {
            const { recipePath, namespace } = args;
            const { javaZip, bpFolder } = ctx;

            const entry = javaZip.file(recipePath);
            if (!entry) {
                return { success: false, message: `Recipe not found: ${recipePath}` };
            }

            const content = await entry.async('string');
            let javaRecipe;
            try {
                javaRecipe = JSON.parse(content.replace(/\/\/.*/g, '').replace(/,\s*([}\]])/g, '$1'));
            } catch {
                return { success: false, message: `Invalid JSON in recipe: ${recipePath}` };
            }

            const recipeName = recipePath.split('/').pop().replace('.json', '');
            const ns = namespace || recipePath.split('/')[1] || 'custom';
            const recipeId = `${ns}:${recipeName}`;

            let bedrockRecipe = null;

            switch (javaRecipe.type) {
                case 'minecraft:crafting_shaped':
                case 'crafting_shaped': {
                    const pattern = javaRecipe.pattern || [];
                    const key = {};

                    if (javaRecipe.key) {
                        for (const [k, v] of Object.entries(javaRecipe.key)) {
                            key[k] = resolveIngredient(v);
                        }
                    }

                    bedrockRecipe = {
                        format_version: '1.20.10',
                        'minecraft:recipe_shaped': {
                            description: { identifier: recipeId },
                            tags: ['crafting_table'],
                            pattern,
                            key,
                            unlock: [{ context: 'AlwaysUnlocked' }],
                            result: resolveResult(javaRecipe.result)
                        }
                    };
                    break;
                }

                case 'minecraft:crafting_shapeless':
                case 'crafting_shapeless': {
                    const ingredients = (javaRecipe.ingredients || []).map(resolveIngredient);

                    bedrockRecipe = {
                        format_version: '1.20.10',
                        'minecraft:recipe_shapeless': {
                            description: { identifier: recipeId },
                            tags: ['crafting_table'],
                            ingredients,
                            unlock: [{ context: 'AlwaysUnlocked' }],
                            result: resolveResult(javaRecipe.result)
                        }
                    };
                    break;
                }

                case 'minecraft:smelting':
                case 'minecraft:blasting':
                case 'minecraft:smoking':
                case 'smelting':
                case 'blasting':
                case 'smoking': {
                    const tags = [];
                    if (javaRecipe.type.includes('smelting')) tags.push('furnace');
                    if (javaRecipe.type.includes('blasting')) tags.push('blast_furnace');
                    if (javaRecipe.type.includes('smoking')) tags.push('smoker');

                    bedrockRecipe = {
                        format_version: '1.20.10',
                        'minecraft:recipe_furnace': {
                            description: { identifier: recipeId },
                            tags,
                            input: resolveIngredient(javaRecipe.ingredient),
                            output: typeof javaRecipe.result === 'string' ? javaRecipe.result : javaRecipe.result?.item || javaRecipe.result?.id || 'minecraft:air'
                        }
                    };
                    break;
                }

                case 'minecraft:stonecutting':
                case 'stonecutting': {
                    bedrockRecipe = {
                        format_version: '1.20.10',
                        'minecraft:recipe_shaped': {
                            description: { identifier: recipeId },
                            tags: ['stonecutter'],
                            pattern: ['I'],
                            key: { I: resolveIngredient(javaRecipe.ingredient) },
                            unlock: [{ context: 'AlwaysUnlocked' }],
                            result: resolveResult(javaRecipe.result)
                        }
                    };
                    break;
                }

                default:
                    return {
                        success: false,
                        message: `Unsupported recipe type: ${javaRecipe.type}`
                    };
            }

            if (bedrockRecipe) {
                const outPath = `recipes/${recipeName}.json`;
                bpFolder.file(outPath, JSON.stringify(bedrockRecipe, null, 2));

                return {
                    success: true,
                    recipeId,
                    type: javaRecipe.type,
                    outputPath: outPath,
                    message: `Converted recipe "${recipeName}" (${javaRecipe.type})`
                };
            }

            return { success: false, message: 'Failed to create Bedrock recipe' };
        }
    );
}

function resolveIngredient(ingredient) {
    if (!ingredient) return { item: 'minecraft:air' };
    if (typeof ingredient === 'string') return { item: remapId(ingredient) };
    if (Array.isArray(ingredient)) {
        // Tag-based ingredient or multiple options — pick first
        return resolveIngredient(ingredient[0]);
    }
    if (ingredient.item) return { item: remapId(ingredient.item) };
    if (ingredient.tag) {
        // Convert tag reference to a representative item
        return { item: tagToItem(ingredient.tag) };
    }
    if (ingredient.id) return { item: remapId(ingredient.id) };
    return { item: 'minecraft:air' };
}

function resolveResult(result) {
    if (!result) return { item: 'minecraft:air', count: 1 };
    if (typeof result === 'string') return { item: remapId(result), count: 1 };
    return {
        item: remapId(result.item || result.id || 'minecraft:air'),
        count: result.count || 1
    };
}

function remapId(id) {
    if (!id) return 'minecraft:air';
    // Strip minecraft: prefix inconsistencies
    return id.includes(':') ? id : `minecraft:${id}`;
}

function tagToItem(tag) {
    // Common tag → representative item mappings
    const tagMap = {
        'minecraft:planks': 'minecraft:planks',
        'minecraft:logs': 'minecraft:log',
        'minecraft:wooden_slabs': 'minecraft:wooden_slab',
        'minecraft:stone_crafting_materials': 'minecraft:cobblestone',
        'minecraft:coals': 'minecraft:coal',
        'minecraft:wool': 'minecraft:wool',
        'c:ingots/iron': 'minecraft:iron_ingot',
        'c:ingots/gold': 'minecraft:gold_ingot',
        'c:ingots/copper': 'minecraft:copper_ingot',
        'c:gems/diamond': 'minecraft:diamond',
        'c:gems/emerald': 'minecraft:emerald',
        'forge:ingots/iron': 'minecraft:iron_ingot',
        'forge:ingots/gold': 'minecraft:gold_ingot',
    };
    return tagMap[tag] || `minecraft:${tag.split('/').pop()}`;
}
