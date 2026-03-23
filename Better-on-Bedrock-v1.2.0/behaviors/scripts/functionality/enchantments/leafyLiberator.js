import { mine } from "./functionality";
const blocks = [
    {
        blocks: [
            {
                name: "minecraft:oak_leaves",
                mineable: [],
                drop: "minecraft:oak_leaves",
            },
            {
                name: "minecraft:spruce_leaves",
                mineable: [],
                drop: "minecraft:spruce_leaves",
            },
            {
                name: "minecraft:birch_leaves",
                mineable: [],
                drop: "minecraft:birch_leaves",
            },
            {
                name: "minecraft:jungle_leaves",
                mineable: [],
                drop: "minecraft:jungle_leaves",
            },
            {
                name: "minecraft:acacia_leaves",
                mineable: [],
                drop: "minecraft:acacia_leaves",
            },
            {
                name: "minecraft:dark_oak_leaves",
                mineable: [],
                drop: "minecraft:dark_oak_leaves",
            },
            {
                name: "minecraft:cherry_leaves",
                mineable: [],
                drop: "minecraft:cherry_leaves",
            },
            {
                name: "minecraft:mangrove_leaves",
                mineable: [],
                drop: "minecraft:mangrove_leaves",
            },
            {
                name: "minecraft:azalea_leaves",
                mineable: [],
                drop: "minecraft:azalea_leaves",
            },
            {
                name: "minecraft:azalea_leaves_flowered",
                mineable: [],
                drop: "minecraft:azalea_leaves_flowered",
            },
            {
                name: "better_on_bedrock:orange_leaves",
                mineable: [],
                drop: "better_on_bedrock:orange_leaves",
            },
            {
                name: "better_on_bedrock:peach_leaves",
                mineable: [],
                drop: "better_on_bedrock:peach_leaves",
            },
            {
                name: "better_on_bedrock:shrubleaves",
                mineable: [],
                drop: "better_on_bedrock:shrubleaves",
            },
        ],
    },
];

/** @param { import("@minecraft/server").PlayerBreakBlockAfterEvent } data */
export function leafyLiberator({
    block, player, dimension,
    itemStackBeforeBreak: itemStack,
    itemStackAfterBreak: afterItemStack,
    brokenBlockPermutation: permutation,
}) {
    if (itemStack == undefined || !itemStack.getLore().includes("§r§7Leafy Liberator I") || player.isSneaking)
        return;

    mine(block, permutation.type.id, player, itemStack, blocks);
};