import { world, Player } from "@minecraft/server";

import { corpse } from "../../functionality/player-corpse";
import { chorusBehimeth } from "../../functionality/entities/chorus_behimeth";
import { swordEffects } from "../../functionality/items/sword-effects";
import { applyEnchantments } from "../../functionality/enchanted/main";

world.afterEvents.entityHitEntity.subscribe(
    ({ damagingEntity, hitEntity }) => {
        applyEnchantments(damagingEntity, hitEntity);

        if (damagingEntity instanceof Player) {
            corpse(damagingEntity, hitEntity);
            swordEffects(damagingEntity, hitEntity);
        }
        else {
            chorusBehimeth(damagingEntity, hitEntity);
            if (
                hitEntity instanceof Player
                && (damagingEntity.typeId == "better_on_bedrock:flame_beam" || damagingEntity.typeId == "better_on_bedrock:inferno_shield_boss")
            ) hitEntity.setOnFire(3, true);
        };
    },
);