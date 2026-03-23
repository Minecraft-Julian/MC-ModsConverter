import { TicksPerSecond, EquipmentSlot, ItemStack, EntityEquippableComponent } from "@minecraft/server";

/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
export function customPotions(itemStack, player) {
    switch (itemStack.typeId) {
        case "better_on_bedrock:enchanted_golden_carrot":
            player.addEffect("night_vision", TicksPerSecond * 30, { amplifier: 2 }); break;
        case "better_on_bedrock:resistance_potion":
            player.addEffect("resistance", TicksPerSecond * 60, { amplifier: 3 });
            player.getComponent(EntityEquippableComponent.componentId)
                .getEquipmentSlot(EquipmentSlot.Mainhand).setItem(new ItemStack("minecraft:glass_bottle"));
            break;
        case "better_on_bedrock:rage_potion":
            player.addEffect("speed", TicksPerSecond * 10.5);
            player.addEffect("strength", TicksPerSecond * 10.5, { amplifier: 2 });
            player.addEffect("haste", TicksPerSecond * 10.5, { amplifier: 3 });
            player.addEffect("absorption", TicksPerSecond * 10.5, { amplifier: 3 });
            player.addEffect("regeneration", TicksPerSecond * 10.5);
            player.getComponent(EntityEquippableComponent.componentId)
                .getEquipmentSlot(EquipmentSlot.Mainhand).setItem(new ItemStack("minecraft:glass_bottle"));
            break;
    };
};