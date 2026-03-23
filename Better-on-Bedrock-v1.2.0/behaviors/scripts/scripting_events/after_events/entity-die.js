import { world, Player } from "@minecraft/server";

import { spawnCorpse } from "../../functionality/player-corpse";

world.afterEvents.entityDie.subscribe(
    ({ damageSource, deadEntity }) => {
        if (deadEntity instanceof Player) {
            spawnCorpse(deadEntity);
        }
        else {
            
        };
    },
);