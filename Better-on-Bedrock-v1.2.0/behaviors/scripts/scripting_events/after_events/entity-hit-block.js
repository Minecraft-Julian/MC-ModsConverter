import { world, Player } from "@minecraft/server";

import { coconutNut } from "../../functionality/items/coconut-nut";

world.afterEvents.entityHitBlock.subscribe(
    ({ damagingEntity, hitBlock }) => {
        if (!(damagingEntity instanceof Player))
            return;

        coconutNut(damagingEntity, hitBlock);
    },
);