import { world } from "@minecraft/server";

import { customPotions } from "../../functionality/items/custom-potions";

world.afterEvents.itemCompleteUse.subscribe(
    ({ itemStack, source }) => {
        customPotions(itemStack, source);
    },
);