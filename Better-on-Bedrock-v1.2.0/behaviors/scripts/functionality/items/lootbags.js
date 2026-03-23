/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
export function lootbags(itemStack, player) {
    let functionName;
    switch (itemStack.typeId) {
        case "better_on_bedrock:uncommon_lootbag":
            functionName = "lootbag_uncommon"; break;
        case "better_on_bedrock:common_lootbag":
            functionName = "common_lootbag"; break;
        case "better_on_bedrock:rare_lootbag":
            functionName = "rare_lootbag"; break;

        default: return;
    };

    player.runCommandAsync("function ".concat(functionName));
};