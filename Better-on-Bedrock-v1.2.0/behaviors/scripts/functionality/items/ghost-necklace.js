import { EntityInventoryComponent, ItemDurabilityComponent, ItemStack } from "@minecraft/server";

/** @param { import("@minecraft/server").Player } player */
export function ghostNecklace(player) {
    const inventory = player.getComponent(EntityInventoryComponent.componentId).container;
    for (let i = 0; i < inventory.size; i++) {
        const itemStack = inventory.getItem(i);
        if (itemStack?.typeId !== "better_on_bedrock:fixed_ghost_necklace")
            continue;

        const durability = itemStack.getComponent(ItemDurabilityComponent.componentId);
        if (durability.damage == 10) {
            inventory.setItem(i, new ItemStack("better_on_bedrock:broken_ghost_necklace"));
        };
    };
};