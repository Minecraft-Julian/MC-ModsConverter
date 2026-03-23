import { world } from "@minecraft/server";

import { loopGoals } from "../../functionality/goals/goals.js";

world.afterEvents.playerPlaceBlock.subscribe(
    ({ block, player }) => {
        loopGoals(player, block);
    },
);