import { world } from "@minecraft/server";

import { releaseUseAmulet } from "../../functionality/items/nether-amulet";
import { releaseStaffs } from "../../functionality/items/staffs";

world.afterEvents.itemReleaseUse.subscribe(
    ({ itemStack, source }) => {
        releaseUseAmulet(itemStack, source);
        releaseStaffs(itemStack, source);
    },
);