import { world } from "@minecraft/server";

import { stonePickaxe } from "../../functionality/items/stone-pickaxe.js";
import { autoSmelter, harvestTouch, leafyLiberator, treeCapitator, veinMiner } from "../../functionality/enchantments/index.js";

world.afterEvents.playerBreakBlock.subscribe(
    (data) => {
        stonePickaxe(data.brokenBlockPermutation, data.player, data.itemStackBeforeBreak);

        autoSmelter(data);
        harvestTouch(data);
        leafyLiberator(data);
        treeCapitator(data);
        veinMiner(data);
    },
);