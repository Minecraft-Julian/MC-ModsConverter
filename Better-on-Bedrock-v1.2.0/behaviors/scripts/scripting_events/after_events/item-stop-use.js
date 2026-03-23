import { world } from "@minecraft/server";

import { releaseStaffs } from "../../functionality/items/staffs";

world.afterEvents.itemStopUse.subscribe(
    ({ itemStack, source }) => {
        releaseStaffs(itemStack, source);
        source.runCommand(`stopsound @p staff.fire.breath`)
        source.runCommand(`stopsound @p staff.basic.use`)
    },
);