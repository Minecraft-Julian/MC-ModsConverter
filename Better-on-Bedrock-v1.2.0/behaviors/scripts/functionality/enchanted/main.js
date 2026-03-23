import { Entity, Player } from "@minecraft/server";

/**
 * @param { Entity } damagingEntity 
 * @param { Entity } hitEntity
 */
export function applyEnchantments(damagingEntity, hitEntity) {
    if (!hitEntity || !damagingEntity)
        return;

    const dimension = hitEntity.dimension;
    const hitEnchantmentType = hitEntity.getProperty("better_on_bedrock:enchantment_type");
    const hitEnchantmentLevel = hitEntity.getProperty("better_on_bedrock:enchantment_level") || 0;
    
    switch(hitEnchantmentType) {
        case "thorns": {
            const location = damagingEntity.location;
            const damageChance = [0, 3, 5, 10][hitEnchantmentLevel];
            if (Math.random() * 10 < damageChance) {
                damagingEntity.applyDamage(3);
                damagingEntity.playSound("damage.thorns", { location });
            };
            break;
        };
    };

    const damageEnchantmentType = damagingEntity.getProperty("better_on_bedrock:enchantment_type");
    const damageEnchantmentLevel = damagingEntity.getProperty("better_on_bedrock:enchantment_level") || 0;
    switch (damageEnchantmentType) {
        case "fire_aspect": hitEntity.setOnFire(4); break;
        case "knockback": {
            const knockbackStrength = [0, 1, 3][damageEnchantmentLevel];
            hitEntity.applyKnockback(-hitEntity.getViewDirection().z, 1, knockbackStrength, 0.4);
            break;
        };
        case "sharpness": {
            const sharpnessStrength = [0, 1, 3, 4, 5][damageEnchantmentLevel];
            hitEntity.applyDamage(sharpnessStrength + 2);
            break;
        };
        case "mending": {
            if (Math.random() >= 0.8)
                return;

            applyMending(damagingEntity, hitEntity);
            break;
        };
        case "oozing": {
            dimension.spawnEntity("minecraft:slime", hitEntity.location).triggerEvent("spawn_medium");
            break;
        };
        case "infested": {
            hitEntity.dimension.spawnEntity("minecraft:silverfish", hitEntity.location);
            break;
        };
    };
};

/**
 * @param { Entity } damagingEntity 
 * @param { Entity } hitEntity
 */
function applyMending(damagingEntity, hitEntity) {
    if (!(hitEntity instanceof Player))
        return;

    let xpEarned = hitEntity.xpEarnedAtCurrentLevel;
    if (xpEarned === 0)
        hitEntity.addLevels(-1);

    const totalXpNeeded = hitEntity.totalXpNeededForNextLevel;
    hitEntity.addExperience(
        hitEntity.xpEarnedAtCurrentLevel > 0 ? -7
        : totalXpNeeded - 7
    );

    const healthComponent = damagingEntity.getComponent("health");
    if (healthComponent !== void 0) {
        const value = Math.min(healthComponent.currentValue + 2, healthComponent.defaultValue);
        healthComponent.setCurrentValue(value);
    };
};