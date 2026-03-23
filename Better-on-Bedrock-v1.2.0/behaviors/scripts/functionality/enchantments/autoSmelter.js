import { ItemStack } from "@minecraft/server";
import { blocks } from "./veinMiner";

/** @param { import("@minecraft/server").PlayerBreakBlockAfterEvent } data */
export function autoSmelter(data) {

    const {
        block, player, dimension,
        itemStackBeforeBreak: itemStack,
        itemStackAfterBreak: afterItemStack,
        brokenBlockPermutation: permutation,
    } = data;
    if (itemStack == undefined || !itemStack.getLore().includes("§r§7Ore Smelter I"))
        return;

    const blockType = permutation.type.id;
    const drops = blocks.find(({ blocks }) =>
        blocks.find(({ name }) => name === blockType)
    );
    const blockDrops = drops?.blocks?.find(({ name }) => name === blockType);
    if (
        blockDrops === undefined
        || (blockDrops.mineable.length !== 0 && !itemStack.getTags().some((tag) => blockDrops.mineable.includes(tag)))
    ) return;

    if (blockDrops?.smelted == undefined)
        return;

    dimension.getEntities({ type: "minecraft:item", location: block.location, maxDistance: 2 }).forEach((entity) => {
        const itemStack = entity.getComponent("minecraft:item").itemStack;
        if (itemStack.typeId == blockDrops.drop) {
            const itemEntity = dimension.spawnItem(new ItemStack(blockDrops.smelted), entity.location);
            itemEntity.applyImpulse(entity.getVelocity());
            entity.kill();
        };
    });
};