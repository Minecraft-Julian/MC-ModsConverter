import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui"
import { dimensionNames } from "./util";

export function spawnCorpse(player) {
    if (world.gameRules.keepInventory == true || !player.hasTag("allow_corpse"))
        return;

	const dName = dimensionNames[player.dimension.id];
	const entity = player.dimension.spawnEntity("better_on_bedrock:player_corpse", player.location);
	entity.nameTag = ("Corpse of " + player.name);
	entity.runCommand(`tp @e[type=item, r=6] @s`);
	player.sendMessage([
        { text: "§c[!] §r" },
        { translate: "bob.message.youDiedAt" },
        {
            translate: "bob.message.dimensionLocation",
            with: [
                Math.round(player.location.x).toString(),
                Math.round(player.location.y).toString(),
                Math.round(player.location.z).toString(),
                dName,
            ],
        },
    ]);
};

/**
 * @param { import("@minecraft/server").Player } player 
 * @param { import("@minecraft/server").Entity } hitEntity 
 */
export function corpse(player, hitEntity) {
    if (
        hitEntity.typeId != "better_on_bedrock:player_corpse"
        || hitEntity.hasTag("dusted")
    ) return;

    new ActionFormData()
    .title({ translate: "bob.gui.playercorpse.title" })
    .body({ translate: "bob.gui.playercorpse.body" })
    .button({ translate: "bob.gui.playercorpse.dust" })
    .button({ translate: "bob.gui.playercorpse.keep" })
    .show(player).then(
        ({ selection }) => {
            switch (selection) {
                case 0: // Dust
                    hitEntity.triggerEvent("entity_transform");
                    hitEntity.playAnimation("animation.player_corpse.despawn");
                    hitEntity.addTag("dusted");
                    hitEntity.runCommandAsync("loot spawn ~0.5 ~ ~0.5 loot decayed_bone.loottable");
                    break;
                case 1: // Spare
                    break;
            };
        },
    );
};