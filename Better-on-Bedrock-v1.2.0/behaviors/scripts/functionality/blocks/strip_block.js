import { BlockPermutation, BlockStates, ItemStack, EntityEquippableComponent, EquipmentSlot, system, world } from "@minecraft/server";

world.beforeEvents.playerInteractWithBlock.subscribe(ev => {
    const player = ev.player
    const block = ev.block

    const item = player.getComponent(EntityEquippableComponent.componentId).getEquipment(EquipmentSlot.Mainhand);
    const equipment = player?.getComponent('equippable');
    const durability = item?.getComponent('durability');
    const strippedBlock = block?.typeId + '_stripped';
    const blockFace = block?.permutation.getState('minecraft:block_face');
    if (block?.hasTag(`better_on_bedrock:log`)) {
        if (item?.hasTag('minecraft:is_axe')) {
            if (!strippedBlock) return;
            system.run(() => {
                block.setPermutation(BlockPermutation.resolve(strippedBlock, {
                    'minecraft:block_face': blockFace
                }));
            });
            system.run(() => {
                player.playSound('fall.wood');
            });
            if (durability && durability.damage < durability.maxDurability) {
                system.run(() => {
                    durability.damage++;
                    equipment.setEquipment('Mainhand', item);
                });
            }
            if (durability && durability.damage >= durability.maxDurability) {
                system.run(() => {
                    player.playSound('random.break');
                    equipment.setEquipment('Mainhand', new ItemStack('minecraft:air', 1));
                });
            }
        }
    }
})