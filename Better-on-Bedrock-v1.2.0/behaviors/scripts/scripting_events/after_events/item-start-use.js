import { world } from "@minecraft/server";

import { startUseAmulet } from "../../functionality/items/nether-amulet";
import { staffs } from "../../functionality/items/staffs";

world.afterEvents.itemStartUse.subscribe(
    ({ itemStack, source }) => {
        startUseAmulet(itemStack, source);
        staffs(itemStack, source);
    },
);