import { mine } from "./functionality";
const blocks = [
    {
        blocks: [
            {
                name: "minecraft:hay_block",
                mineable: [],
                drop: "minecraft:hay_block",
            },
        ],
        drop: {
            min: 1,
            max: 1,
        },
    },
    {
        blocks: [
            {
                name: "minecraft:wheat",
                states: {
                    growth: 7
                },
                mineable: [],
                drops: [
                    "minecraft:wheat",
                    "minecraft:wheat_seeds"
                ],
            },
            {
                name: "minecraft:beetroot",
                states: {
                    growth: 7
                },
                mineable: [],
                drops: [
                    "minecraft:beetroot",
                    "minecraft:beetroot_seeds"
                ],
            },
            {
                name: "minecraft:carrots",
                states: {
                    growth: 7
                },
                mineable: [],
                drop: "minecraft:carrot",
            },
            {
                name: "minecraft:potatoes",
                states: {
                    growth: 7
                },
                mineable: [],
                drop: "minecraft:potato",
            },
            {
                name: "minecraft:tall_grass",
                mineable: [],
                drop: "minecraft:wheat_seeds",
            },
        ],
        drop: {
            min: 1,
            max: 4,
        },
    },
];

/** @param { import("@minecraft/server").PlayerBreakBlockAfterEvent } data */
export function harvestTouch({
    block, player, dimension,
    itemStackBeforeBreak: itemStack,
    itemStackAfterBreak: afterItemStack,
    brokenBlockPermutation: permutation,
}) {
    if (itemStack == undefined || !itemStack.getLore().includes("§r§7Harvest Touch I") || player.isSneaking)
        return;

    mine(block, permutation.type.id, player, itemStack, blocks, false);
};