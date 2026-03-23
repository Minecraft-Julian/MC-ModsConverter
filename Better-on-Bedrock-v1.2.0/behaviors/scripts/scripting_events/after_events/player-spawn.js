import { GameMode, world } from "@minecraft/server";
import { configItem } from "../../functionality/items/addon-config";

world.afterEvents.playerSpawn.subscribe(
    ({ player, initialSpawn }) => {
        if (true == initialSpawn) {
            configItem(player);
            if (true == player.getDynamicProperty("usedGhostNecklace")) {
                player.setGameMode(GameMode.survival);
                player.setDynamicProperty("usedGhostNecklace");

                const topmost = player.dimension.getTopmostBlock(player.location);
                const { x, y, z } = topmost.location;
                if (topmost !== undefined)
                    player.teleport({ x, y: y + 1, z });
            };
        }
        else {

        };
    },
);