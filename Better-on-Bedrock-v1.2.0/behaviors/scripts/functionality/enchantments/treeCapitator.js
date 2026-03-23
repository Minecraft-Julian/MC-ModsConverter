import { mine } from "./functionality";
export const logs = [
    "minecraft:acacia_log",
    "minecraft:birch_log",
    "minecraft:dark_oak_log",
    "minecraft:jungle_log",
    "minecraft:oak_log",
    "minecraft:spruce_log",
    "minecraft:mangrove_log",
    "minecraft:cherry_log",
    "minecraft:pale_oak_log",
    "minecraft:crimson_stem",
    "minecraft:warped_stem",

    "minecraft:stripped_acacia_log",
    "minecraft:stripped_birch_log",
    "minecraft:stripped_dark_oak_log",
    "minecraft:stripped_jungle_log",
    "minecraft:stripped_oak_log",
    "minecraft:stripped_spruce_log",
    "minecraft:stripped_mangrove_log",
    "minecraft:stripped_cherry_log",
    "minecraft:stripped_pale_oak_log",
    "minecraft:stripped_crimson_stem",
    "minecraft:stripped_warped_stem",


    "minecraft:acacia_wood",
    "minecraft:birch_wood",
    "minecraft:dark_oak_wood",
    "minecraft:jungle_wood",
    "minecraft:oak_wood",
    "minecraft:spruce_wood",
    "minecraft:mangrove_wood",
    "minecraft:cherry_wood",
    "minecraft:pale_oak_wood",

    "minecraft:stripped_acacia_wood",
    "minecraft:stripped_birch_wood",
    "minecraft:stripped_dark_oak_wood",
    "minecraft:stripped_jungle_wood",
    "minecraft:stripped_oak_wood",
    "minecraft:stripped_spruce_wood",
    "minecraft:stripped_mangrove_wood",
    "minecraft:stripped_cherry_wood",
    "minecraft:stripped_pale_oak_wood",
];

/** @param { import("@minecraft/server").PlayerBreakBlockAfterEvent } data */
export function treeCapitator({
    block, player, dimension,
    itemStackBeforeBreak: itemStack,
    itemStackAfterBreak: afterItemStack,
    brokenBlockPermutation: permutation,
}) {
    if (itemStack == undefined || !itemStack.getLore().includes("§r§7Tree Capitator I") || player.isSneaking)
        return;

    const blockType = permutation.type.id;
    const isSmallLog = permutation.hasTag("better_on_bedrock:small_log");
    if (!permutation.hasTag("log")
        && !isSmallLog
        && !logs.includes(blockType)
    ) return;

    const matches = [];
    if (blockType.startsWith("minecraft:") && logs.includes(blockType)) {
        matches.push("better_on_bedrock:".concat(blockType.split(":")[1]
            .replace("stripped_", "")
            .replace("_wood", "")
            .replace("_log", ""),
        "_small_log"));
    };
    
    if (true == isSmallLog) {
        const customLogs = [
            [ "vacant", "better_on_bedrock:shrublog" ],
            [ "chorus", "better_on_bedrock:chorus_log" ],
            [ "voiding", "better_on_bedrock:voiding_log" ]
        ];
        const type = blockType.split(":")[1].replace("_small_log", "");
        const log = customLogs.find((b) => b[0] == type);
        if (log != void 0) {
            matches.push(log[1]);
        }
        else {
            matches.push("minecraft:".concat(type, "_log"));
            matches.push("minecraft:".concat(type, "_wood"));
            matches.push("minecraft:".concat("stripped_", type, "_log"));
            matches.push("minecraft:".concat("stripped_", type, "_wood"));
        };
    };
    
    const blocks = [{
        blocks: [
            {
                name: blockType,
                mineable: [],
                matches,
            }
        ]
    }];

    mine(block, blockType, player, itemStack, blocks);
};