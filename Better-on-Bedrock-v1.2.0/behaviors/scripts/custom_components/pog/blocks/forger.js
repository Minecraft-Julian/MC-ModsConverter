import { ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

/**
 * @param { import("@minecraft/server").Player } player
 * @param { string } itemId
 */
function getItemCount(player, itemId) {
	let itemCount = 0;
	const inventory = player.getComponent("inventory").container;
	for (let slot = 0; slot < inventory.size; slot++) {
		const item = inventory.getItem(slot);
		if (
			item !== undefined
			&& item.typeId == itemId
		) itemCount += item.amount;
	};

	return itemCount;
};

/** @param { import("@minecraft/server").Player } player */
function ironToolHead(player) {
    new ActionFormData()
    .title("Iron Tool Head")
    .body("You require §7Iron Ingots §8x2§r to forge an Iron Tool Head.")
    .button("Forge")
    .button("§cClose§r")
    .show(player).then((response) => {
        if (response.canceled)
            return;

        switch (response.selection) {
            case 0: {
                if (getItemCount(player, "minecraft:iron_ingot") > 0) {
                    player.dimension.spawnItem(new ItemStack("better_on_bedrock:pickaxe_head"), player.location);
                    player.runCommandAsync("clear @s minecraft:iron_ingot 0 2");
                    player.playSound("random.anvil_use");
                }
                else {
                    player.sendMessage("§c[!] §rYou don't have the required amount of §7Iron Ingots§r.");
                };
                break;
            };
        };
    });
};

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onPlayerInteract: ({ player }) => {
        new ActionFormData()
        .title("Welcome to the Forger")
        .body("This block will allow you to craft specific resources for crafting unique items!")
        .button("Iron Tool Head")
        .button("§cClose§r")
        .show(player).then((response) => {
        if (response.canceled)
            return;
        
            switch (response.selection) {
                case 0: ironToolHead(player); break;
            };
        });
    },
};