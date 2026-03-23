import { EntityEquippableComponent, EquipmentSlot, TicksPerSecond } from "@minecraft/server";

/** @param { import("@minecraft/server").Player } player */
export function voidTotem(player) {
    if (!player?.isValid())
        return;
    
    if (player.location.y > 4 || player.dimension.id !== "minecraft:the_end")
        return;

    const equipment = player.getComponent(EntityEquippableComponent.componentId);
    const mainhand = equipment.getEquipment(EquipmentSlot.Mainhand);
    const offhand = equipment.getEquipment(EquipmentSlot.Offhand);
    if (mainhand?.typeId !== "better_on_bedrock:void_totem" && offhand?.typeId !== "better_on_bedrock:void_totem")
        return;

    player.applyKnockback(0, 0, 0, 7.3);
    player.addEffect("slow_falling", TicksPerSecond * 50);
    player.addEffect("nausea", TicksPerSecond * 9);
    player.addEffect("blindness", TicksPerSecond * 4);
    player.dimension.playSound("random.totem", player.location);
    player.dimension.spawnParticle("minecraft:totem_particle", player.location);
    player.runCommandAsync("clear @s better_on_bedrock:void_totem 0 1");
};