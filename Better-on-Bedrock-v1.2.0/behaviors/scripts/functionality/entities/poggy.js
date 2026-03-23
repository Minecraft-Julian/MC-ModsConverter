import { world, system, EntityVariantComponent, EntityMarkVariantComponent, EntityHealthComponent } from "@minecraft/server";
import { getClosestEntityFromViewDirection } from "../util";

system.runInterval(() => {
    const players = world.getAllPlayers();
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const entity = player.dimension.getEntities({
            type: "better_on_bedrock:poggy",
            location: player.location,
            closest: 1
        })[0];

        if (entity === undefined)
            continue;

        const variant = entity.getComponent(EntityVariantComponent.componentId)?.value;
        switch (variant) {
            case 0:
                entity.teleport(player.location);
                entity.dimension.playSound("mob.endermen.portal", player.location);
                entity.applyKnockback(0, 0, 0, -3.5);
            break;
            case 4: entity.applyKnockback(0, 0, 0, -0.3); break;
        };
    };
}, 32);

/** @param { import("@minecraft/server").Player } player */
export function poggy(player) {
    const entity = player.dimension.getEntities({
        type: "better_on_bedrock:poggy",
        location: player.location,
        closest: 1
    })[0];

    if (entity === undefined)
        return;

    const variant = entity.getComponent(EntityVariantComponent.componentId)?.value;
    switch (variant) {
        case 3: entity.applyKnockback(0, 0, 0, 0.16); break;
        case 4: entity.applyKnockback(0, 0, 0, -0.3); break;
        case 11: {
            const entityFromView = getClosestEntityFromViewDirection(entity, 128);
            if (entityFromView?.id === player.id)
                entityFromView.applyDamage(1);
            break;
        };
        case 12: {
            entity.applyKnockback(0, 0, 0, -0.3);

            const dx = entity.location.x - player.location.x;
            const dy = entity.location.y - player.location.y;
            const dz = entity.location.z - player.location.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distance <= 4) {
                player.applyKnockback(0, 0, 5.4, 1);
                player.applyDamage(4);

                if (entity.getComponent(EntityMarkVariantComponent.componentId)?.value == 1) {
                    entity.triggerEvent("phase_3_move_up");
                }
                else {
                    entity.triggerEvent("phase_2_move_up");
                };
            };
            break;
        };
        case 13: {
            entity.teleport(player.location);
            break;
        };
        case 15: {
            const entityFromView = getClosestEntityFromViewDirection(entity, 128);
            if (entityFromView?.id === player.id)
                entityFromView.applyDamage(6);
            break;
        };
    };

    const markVariant = entity.getComponent(EntityMarkVariantComponent.componentId)?.value;
    const currentHealth = entity.getComponent(EntityHealthComponent.componentId)?.currentValue;
    switch (markVariant) {
        case 10: {
            if (currentHealth <= 45)
                entity.triggerEvent("phase_2_fail");
            break;
        };
        case 100: {
            if (currentHealth <= 25)
                entity.triggerEvent("phase_1_fail");
            break;
        };
    };
};