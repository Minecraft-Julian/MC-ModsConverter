import { EntityInventoryComponent, ItemStack, world, PlatformType } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
export function configScreen(itemStack, player) {
    if (itemStack.typeId !== "better_on_bedrock:config")
        return;

    const form = new ModalFormData()
    .title("World Config")
    if (!world.gameRules.keepInventory)
        form.toggle("Corpse On Death - Enables Player Corpse", player.hasTag("allow_corpse"))
    form.toggle("What Block Is This? [UI] - Enables the 'WAILA' UI", player.hasTag("toolTip"))
    .toggle("Ambient Sounds", player.hasTag("pog:ambientSounds"))
    .toggle("End Biome Fog - Enables fog for End biomes", player.hasTag("endFog"))
    .show(player).then((response) => {
        if (response.canceled)
            return;

        const responses = [];
        if (world.gameRules.keepInventory)
            responses.push(null);
        responses.push(...response.formValues);
        const [
            isPlayerCorpseEnabled,
            isWailaEnabled,
            isAmbientSoundsEnabled,
            isEndBiomeFogEnabled,
        ] = responses;

        player.sendMessage([
            { text: "§a[!] §r" },
            { translate: "bob.message.configUpdated" }
        ]);

        const enabled = "§a%addServer.resourcePack.enabled§r";
        const disabled = "§c%addServer.resourcePack.disabled§r";

        // Player Corpse
        if (!world.gameRules.keepInventory) {
            if (true == isPlayerCorpseEnabled)
                player.addTag("allow_corpse");
            else
                player.removeTag("allow_corpse");
            player.sendMessage(" §8- §7Player Corpse: ".concat(isPlayerCorpseEnabled ? enabled : disabled));
        };

        // Waila
        if (true == isWailaEnabled)
            player.addTag("toolTip");
        else
            player.removeTag("toolTip");
        player.sendMessage(" §8- §7What's That UI: ".concat(isWailaEnabled ? enabled : disabled));
        
        // Ambient Sounds
        if (true == isAmbientSoundsEnabled)
            player.addTag("pog:ambientSounds");
        else {
            player.removeTag("pog:ambientSounds");
            player.stopMusic();
        }
        player.sendMessage(" §8- §7Ambient Sounds: ".concat(isAmbientSoundsEnabled ? enabled : disabled));

        // End Biome Fog
        if (true == isEndBiomeFogEnabled)
            player.addTag("endFog");
        else {
            player.removeTag("endFog");
            player.removeTag("abyssal");
            player.removeTag("vacant");
            player.removeTag("shroom");
            player.removeTag("void");
            player.removeTag("chorus");
            player.runCommandAsync("fog @s remove test");
        };
        player.sendMessage(" §8- §7End Biome Fog: ".concat(isEndBiomeFogEnabled ? enabled : disabled));
    });
};

/** @param { import("@minecraft/server").Player } player */
export function configItem(player) {
    const systemInfo = player.clientSystemInfo;
    const switchCheck = (
        systemInfo.maxRenderDistance <= 12
        && systemInfo.platformType == PlatformType.Console
    );

    if (!player.hasTag("gotConfig")) {
        player.addTag("allow_corpse");
        player.addTag("toolTip");
        player.addTag("gotConfig");
        player.addTag("pog:ambientSounds");

        const inventory = player.getComponent(EntityInventoryComponent.componentId).container;
        inventory.addItem(new ItemStack("better_on_bedrock:guide_book"));
    };
};