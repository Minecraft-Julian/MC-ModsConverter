import { EntityEquippableComponent, EquipmentSlot, TicksPerSecond } from "@minecraft/server";

/**
 * @param { import("@minecraft/server").Player } player
 * @param { import("@minecraft/server").Entity } hitEntity
 */
export function swordEffects(player, hitEntity) {
    const equippable = player.getComponent(EntityEquippableComponent.componentId);
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
    if (mainhand == undefined)
        return;

    switch (mainhand.typeId) {
        case "better_on_bedrock:blade_of_the_nether": hitEntity.setOnFire(6, true); break;
        case "better_on_bedrock:bane_spike": hitEntity.addEffect("poison", TicksPerSecond * 5); break;
    };
};