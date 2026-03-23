import {
    ItemStack,
    EntityDamageCause,
    EquipmentSlot,
    EntityEquippableComponent,
    ItemDurabilityComponent,
    TicksPerSecond
} from "@minecraft/server";

/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
export function netherAmulet(itemStack, player) {
    if (!player.isSneaking || !itemStack?.hasTag("better_on_bedrock:nether_amulet"))
        return;

    const equippable = player.getComponent(EntityEquippableComponent.componentId);
    const durability = itemStack.getComponent(ItemDurabilityComponent.componentId);
    switch (itemStack.typeId) {
        case "better_on_bedrock:nether_amulet_3_stone_yellow_red_green": {
            const newItem = new ItemStack("better_on_bedrock:nether_amulet_full_purple_active");
            const itemDurability = newItem.getComponent(ItemDurabilityComponent.componentId);
            itemDurability.damage = durability.damage;

            equippable.setEquipment(EquipmentSlot.Mainhand, newItem);
            player.playSound("amulete.switch.wither");
            break;
        };
        case "better_on_bedrock:nether_amulet_full_purple_active": {
            const newItem = new ItemStack("better_on_bedrock:nether_amulet_full_red_active");
            const itemDurability = newItem.getComponent(ItemDurabilityComponent.componentId);
            itemDurability.damage = durability.damage;

            equippable.setEquipment(EquipmentSlot.Mainhand, newItem);
            player.playSound("amulete.switch.regeneration");
            break;
        };
        case "better_on_bedrock:nether_amulet_full_red_active": {
            const newItem = new ItemStack("better_on_bedrock:nether_amulet_3_stone_yellow_red_green");
            const itemDurability = newItem.getComponent(ItemDurabilityComponent.componentId);
            itemDurability.damage = durability.damage;

            equippable.setEquipment(EquipmentSlot.Mainhand, newItem);
            player.playSound("amulete.switch.shield");
            break;
        };
    };
};

/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
export function startUseAmulet(itemStack, player) {
    if (player.isSneaking || !itemStack?.hasTag("better_on_bedrock:nether_amulet"))
        return;

    switch (itemStack.typeId) {
        case "better_on_bedrock:nether_amulet_full_purple_active": {
            if (!durabilityCheck(itemStack, player))
                return;

            player.startItemCooldown("better_on_bedrock:amulet.attack", 3.5 * TicksPerSecond);

            player.playSound("amulete.attack.wither");
            player.dimension.spawnEntity("minecraft:wither_skull_dangerous", {
                x: player.getHeadLocation().x + player.getViewDirection().x,
                y: player.getHeadLocation().y + player.getViewDirection().y,
                z: player.getHeadLocation().z + player.getViewDirection().z
            })
            .applyImpulse(player.getViewDirection());
            break;
        };
    };
};


/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
export function releaseUseAmulet(itemStack, player) {
    if (player.isSneaking || !itemStack?.hasTag("better_on_bedrock:nether_amulet"))
        return;

    if (!durabilityCheck(itemStack, player))
        return

    switch (itemStack.typeId) {
        case "better_on_bedrock:nether_amulet_full_red_active": {
            player.addEffect("regeneration", TicksPerSecond * 30, { amplifier: 2, showParticles: false });
            player.playSound("amulete.attack.regeneration");
            player.dimension.getEntities({
                location: player.location,
                maxDistance: 16,
                excludeTypes: [ "minecraft:player" ]
            })
            .forEach((entity) => entity.applyDamage(15, { cause: EntityDamageCause.fire }));
            player.dimension.spawnParticle("pog:heal", player.location);
            break;
        };
        case "better_on_bedrock:nether_amulet_3_stone_yellow_red_green": {
            player.playSound("amulete.attack.shield");
            player.dimension.spawnEntity("better_on_bedrock:inferno_shield", {
                x: player.getHeadLocation().x + player.getViewDirection().x,
                y: player.getHeadLocation().y + player.getViewDirection().y,
                z: player.getHeadLocation().z + player.getViewDirection().z
            })
            .applyImpulse(player.getViewDirection());
            break;
        };
    };
};

/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
function durabilityCheck(itemStack, player) {
    if (itemStack === void 0)
        return false;

    const equippable = player.getComponent(EntityEquippableComponent.componentId);
    const durability = itemStack.getComponent(ItemDurabilityComponent.componentId);
    if (durability.damage === durability.maxDurability)
        return false;

    durability.damage++;
    equippable.setEquipment(EquipmentSlot.Mainhand, itemStack);
    return true;
};