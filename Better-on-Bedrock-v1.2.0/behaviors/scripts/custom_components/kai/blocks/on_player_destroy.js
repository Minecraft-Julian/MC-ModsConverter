import {
    ItemStack,
    EquipmentSlot,
    EntityEquippableComponent
} from '@minecraft/server';

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onPlayerDestroy: ({
        block,
        player,
        destroyedBlockPermutation: permutation,
    }) => {
        if (permutation.hasTag("stone")) {
            const equippable = player.getComponent(EntityEquippableComponent.componentId);
            const itemStack = equippable.getEquipment(EquipmentSlot.Mainhand);
            if (itemStack === void 0)
                return;

            const isPickaxe = itemStack.hasTag("minecraft:is_pickaxe");
            if (!isPickaxe)
                return;
        };
        
        player.dimension.spawnItem(
            new ItemStack(permutation.type.id), block.location
        );
    },
};