import { world, system, TicksPerSecond, EntityEquippableComponent, EquipmentSlot, GameMode, ItemDurabilityComponent } from "@minecraft/server";

/** @type { import("@minecraft/server").ItemCustomComponent } */
export const events = {
    onUse: ({ source, itemStack }) => {
        if (world.isHardcore) {
            source.playSound("item.necklace.fail");
            source.sendMessage([
                { text: "§c[!] §r" },
                { translate: "bob.message.ghostnecklace.fail" },
            ]);
            return;
        };

        const equippableInventory = source.getComponent(EntityEquippableComponent.componentId);
        const offhandItem = equippableInventory.getEquipment(EquipmentSlot.Offhand);
        if (offhandItem == undefined || offhandItem.typeId !== "better_on_bedrock:soul_star") {
            source.startItemCooldown("ghost", TicksPerSecond * 2);
            source.playSound("item.necklace.fail");
            return;
        };

        const offhand = equippableInventory.getEquipmentSlot(EquipmentSlot.Offhand);
        source.startItemCooldown("ghost", TicksPerSecond * 60);
        if (offhand.amount > 1)
            offhand.amount--;
        else
            offhand.setItem(undefined);

        const durability = itemStack.getComponent(ItemDurabilityComponent.componentId);
        durability.damage++;
        equippableInventory.setEquipment(EquipmentSlot.Mainhand, itemStack);

        source.setGameMode(GameMode.spectator);
        source.setDynamicProperty("usedGhostNecklace", true);
        source.addEffect("night_vision", 10, { amplifier: 10 });
        source.dimension.spawnParticle("pog:poof", source.location);
        source.playSound("item.necklace.use");
        system.runTimeout(() => {
            source.setGameMode(GameMode.survival);
            source.setDynamicProperty("usedGhostNecklace", undefined);
            source.dimension.spawnParticle("pog:poof", source.location);
            source.playSound("item.necklace.stop");
        }, TicksPerSecond * 10);
    },
};