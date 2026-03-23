import {
    ItemStack,
    EquipmentSlot,
    EntityEquippableComponent,
    EntityInventoryComponent
} from "@minecraft/server";

/**
 * @param { import("@minecraft/server").Player } player 
 * @param { import("@minecraft/server").Block } block 
 */
export function coconutNut(player, block) {
    if (block.typeId !== "minecraft:stone")
        return;

    const equippable = player.getComponent(EntityEquippableComponent.componentId);
    const inventory = player.getComponent(EntityInventoryComponent.componentId).container;
    if (inventory.getItem(player.selectedSlotIndex)?.typeId
        !== "better_on_bedrock:coconut_nut") return;

    const itemStack = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
    if (itemStack.amount - 1 === 0) {
        itemStack.setItem(void 0);
    }
    else itemStack.amount--;

    inventory.addItem(new ItemStack("better_on_bedrock:broken_open_coconut"));
    player.dimension.playSound("block.turtle_egg.crack", player.location);
};