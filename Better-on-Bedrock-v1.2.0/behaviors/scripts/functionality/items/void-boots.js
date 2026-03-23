import { world, system, TicksPerSecond, EquipmentSlot, EntityEquippableComponent, ItemDurabilityComponent } from "@minecraft/server";

function landCheck(player) {
    const blockUnder = player.dimension.getBlockFromRay(player.location, { x: 0, y: -1, z: 0 })?.block;
    const block1 = player.dimension.getBlockFromRay({ x: player.location.x - 2, y: player.location.y, z: player.location.z - 2 }, ({ x: 0, y: -1, z: 0 }))?.block;
    const block2 = player.dimension.getBlockFromRay({ x: player.location.x + 2, y: player.location.y, z: player.location.z + 2 }, ({ x: 0, y: -1, z: 0 }))?.block;

    return (
        blockUnder !== undefined
        || block1 !== undefined
        || block2 !== undefined
    );
};

/** @param { import("@minecraft/server").Player } player */
export function voidBoots(player) {
    if (!player?.isValid())
        return;

    if (player?.dimension?.id !== "minecraft:the_end")
        return;

    const equipment = player.getComponent(EntityEquippableComponent.componentId);
    const boots = equipment.getEquipment(EquipmentSlot.Feet);
    if (boots?.typeId !== "better_on_bedrock:voiding_boots" || landCheck(player))
        return;

    const { x, y, z } = player.location;
    player.addEffect("slowness", TicksPerSecond * 3, { showParticles: false });
    player.dimension.runCommandAsync(`fill ${x - 1} ${y - 1} ${z - 1} ${x + 1} ${y - 1} ${z + 1} better_on_bedrock:void_block [] replace air`);
};

system.runInterval(() => {
    system.runJob(function* () {
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (player.dimension.id !== "minecraft:the_end")
                continue;

            const equipment = player.getComponent(EntityEquippableComponent.componentId);
            const boots = equipment.getEquipment(EquipmentSlot.Feet);
            if (boots?.typeId !== "better_on_bedrock:voiding_boots" || landCheck(player) || player.location.y < 0)
                continue;

            const durability = boots.getComponent(ItemDurabilityComponent.componentId);
            durability.damage += 1;
            if (durability.damage >= durability.maxDurability) {
                yield equipment.setEquipment(EquipmentSlot.Feet, undefined);
                continue;
            };

            yield equipment.setEquipment(EquipmentSlot.Feet, boots);
        };
    }());
}, 30);