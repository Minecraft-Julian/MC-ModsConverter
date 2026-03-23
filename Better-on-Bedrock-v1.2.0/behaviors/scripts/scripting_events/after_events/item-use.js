import { world } from "@minecraft/server";

import { configScreen } from "../../functionality/items/addon-config";
import { creditScreen, lostJournal } from "../../functionality/items/lost-journal";
import { beginnerPage } from "../../functionality/items/lost-journal";
import { lootbags } from "../../functionality/items/lootbags";
import { netherAmulet } from "../../functionality/items/nether-amulet";
import { useStaff } from "../../functionality/items/staffs";
import { goalsList } from "../../functionality/goals/goals";

world.afterEvents.itemUse.subscribe(
    ({ itemStack, source }) => {
        configScreen(itemStack, source);
        switch (itemStack.typeId) {
            case "better_on_bedrock:guide_book": {
                if (!source.isSneaking)
                    return;

                creditScreen(source);
                break;
            };
            case "better_on_bedrock:lost_journal": {
                goalsList(source);
                /*if(!source.hasTag(`beginningInfo`)) {
                    beginnerPage(source);
                    source.addTag(`beginningInfo`)
                } else {
                    lostJournal(source);
                }*/
                break;
            };
        };
        
        lootbags(itemStack, source);
        netherAmulet(itemStack, source);
        useStaff(itemStack, source);
    },
);