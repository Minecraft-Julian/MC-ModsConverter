import { EntityVariantComponent } from "@minecraft/server";
import { getClosestEntityFromViewDirection } from "../util";

/** @param { import("@minecraft/server").Player } player */
export function seeker(player) {
    if (!player?.isValid())
        return;
    
    const entity = player.dimension.getEntities({
        type: "better_on_bedrock:seeker",
        location: player.location,
        closest: 1
    })[0];

    if (entity === undefined)
        return;

    const variant = entity.getComponent(EntityVariantComponent.componentId)?.value;
    switch (variant) {
        case 2: {
            const entityFromView = getClosestEntityFromViewDirection(entity, 32);
            if (entityFromView?.id === player.id)
                player.applyDamage(5);
            break;
        };
        /*case 3: {
            const dx = entity.location.x - player.location.x;
            const dy = entity.location.y - player.location.y;
            const dz = entity.location.z - player.location.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distance <= 16) {
                player.applyKnockback(
                    entity.location.x - player.location.x,
                    entity.location.z - player.location.z,
                    (Math.abs(entity.location.x - player.location.x) + Math.abs(entity.location.z - player.location.z)) * 0.05,
                    (entity.location.y - player.location.y) * 0.05
                );
            };
            break;
        };*/
        case 5: {
            const entityFromView = getClosestEntityFromViewDirection(entity, 32);
            if (entityFromView?.id === player.id) {
                player.addEffect("slowness", 100);
                player.addEffect("weakness", 220, { amplifier: 2 });
                player.applyDamage(12);
                player.applyKnockback(9, 0, 1, 1);
            };
            break;
        };
    };
};