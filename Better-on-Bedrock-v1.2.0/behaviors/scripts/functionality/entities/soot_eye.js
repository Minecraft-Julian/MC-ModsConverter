import { EntityVariantComponent } from "@minecraft/server";
import { getClosestEntityFromViewDirection } from "../util";

/** @param { import("@minecraft/server").Player } player */
export function sootEye(player) {
    if (!player?.isValid())
        return;
    
    const eye = player.dimension.getEntities({
        type: "better_on_bedrock:soot_eye",
        location: player.location,
        closest: 1
    })[0];

    if (eye !== undefined) {
        const entityFromView = getClosestEntityFromViewDirection(eye, 32);
        const variant = eye.getComponent(EntityVariantComponent.componentId)?.value;
        if (entityFromView?.id === player.id && variant == 1) {
            entityFromView.applyDamage(9);
        };
    };

    const eyeBeam = player.dimension.getEntities({
        type: "better_on_bedrock:soot_eye",
        location: player.location,
        closest: 1
    })[0];

    if (eyeBeam !== undefined) {
        const entityFromView = getClosestEntityFromViewDirection(eyeBeam, 32);
        const variant = eyeBeam.getComponent(EntityVariantComponent.componentId)?.value;
        if (entityFromView?.id === player.id && variant == 1) {
            entityFromView.applyDamage(5);
            entityFromView.setOnFire(2);
        };
    };

    const sootYeet = player.dimension.getEntities({
        type: "better_on_bedrock:soot_yeet",
        location: player.location,
        closest: 1
    })[0];

    if (sootYeet !== undefined) {
        const dx = sootYeet.location.x - player.location.x;
        const dy = sootYeet.location.y - player.location.y;
        const dz = sootYeet.location.z - player.location.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (sootYeet.getComponent(EntityVariantComponent.componentId).value == 1 && distance <= 2) {
            player.applyKnockback(0, 0, 0, 1.4);
            sootYeet.dimension.spawnParticle("pog:soot_yee_player", sootYeet.location);
        };
    };
};