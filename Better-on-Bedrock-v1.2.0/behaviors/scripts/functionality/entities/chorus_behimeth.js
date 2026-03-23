/**
 * @param { import("@minecraft/server").Entity } damagingEntity
 * @param { import("@minecraft/server").Entity } hitEntity
 */
export function chorusBehimeth(damagingEntity, hitEntity) {
    if (damagingEntity.typeId !== "better_on_bedrock:chorus_behimeth" || hitEntity.typeId !== "minecraft:player")
        return;

    damagingEntity.playAnimation("animation.chorus_behemoth.attack");
    hitEntity.applyKnockback(0, 0, 0, 0.7);
};