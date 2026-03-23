import { world, system, TicksPerSecond, EntityEquippableComponent, EquipmentSlot, EntityDamageCause } from "@minecraft/server";

/** @param { import("@minecraft/server").Entity } entity */
function hasFullArmor(entity) {
    const equipmentInventory = entity.getComponent(EntityEquippableComponent.componentId);
    if (equipmentInventory == undefined)
        return false;

    if (
        equipmentInventory.getEquipment(EquipmentSlot.Head)?.typeId !== "better_on_bedrock:amethyst_helmet"
        || equipmentInventory.getEquipment(EquipmentSlot.Chest)?.typeId !== "better_on_bedrock:amethyst_chestplate"
        || equipmentInventory.getEquipment(EquipmentSlot.Legs)?.typeId !== "better_on_bedrock:amethyst_leggings"
        || equipmentInventory.getEquipment(EquipmentSlot.Feet)?.typeId !== "better_on_bedrock:amethyst_boots"
    ) return false;
    return true;
};

/** @param { import("@minecraft/server").Vector3 } vector */
function vectorLength(vector) {
    const x = Math.pow(vector.x, 2);
    const y = Math.pow(vector.y, 2);
    const z = Math.pow(vector.z, 2);
    return Math.sqrt(x + y + z);
};

system.runInterval(() => {
    const players = world.getAllPlayers();
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (!hasFullArmor(player))
            return;

        const velocityVector = player.getVelocity();
        const velocity = vectorLength({ x: velocityVector.x, y: 0, z: velocityVector.z });
        if (velocity < 0.216 || player.isJumping)
            return;

        player.playSound("step.amethyst_block");
    };
}, 8);

system.runInterval(() => {
    const players = world.getAllPlayers();
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (!hasFullArmor(player))
            return;

        const velocityVector = player.getVelocity();
        const velocity = vectorLength({ x: velocityVector.x, y: 0, z: velocityVector.z });
        if (Math.round(velocity) > 0)
            return;

        player.playSound("step.amethyst_block");
    };
}, 150);

/**
 * 
 * @param { import("@minecraft/server").EntityDamageSource } damageSource 
 * @param { import("@minecraft/server").Entity } hurtEntity 
 */
function amethystKnockback(damageSource, hurtEntity) {
    if (damageSource.cause !== EntityDamageCause.entityAttack)
        return;
    
    if (!hasFullArmor(hurtEntity))
        return;

    damageSource.damagingEntity.applyKnockback(-hurtEntity.getViewDirection().z, 1, 3, 0.4);
};

export { amethystKnockback };