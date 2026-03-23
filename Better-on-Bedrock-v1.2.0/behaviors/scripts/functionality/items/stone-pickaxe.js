import { EntityEquippableComponent, EntityInventoryComponent, ItemDurabilityComponent, ItemStack } from "@minecraft/server";

/**
 * @param { import("@minecraft/server").BlockPermutation } permutation
 * @param { import("@minecraft/server").Player } player
 * @param { import("@minecraft/server").ItemStack } itemStack
 */
export function stonePickaxe(permutation, player, itemStack) {
    const block = player.getBlockFromViewDirection({ maxDistance: 8 })?.block;
    switch (permutation.type.id) {
        case "minecraft:iron_ore": {
            if (itemStack?.typeId !== "minecraft:stone_pickaxe")
                return;

            player.playSound("random.break");
            player.sendMessage([
                { text: "§c[!] §r" },
                { translate: "bob.message.ironWithCopperPick" }
            ]);

            block.dimension.getEntities({ type: "minecraft:item", location: block.location, maxDistance: 3 })
                .forEach((entity) => entity.kill());
            break;
        };
        case "minecraft:deepslate_iron_ore": {
            if (itemStack?.typeId !== "minecraft:stone_pickaxe")
                return;

            player.playSound("random.break");
            player.sendMessage([
                { text: "§c[!] §r" },
                { translate: "bob.message.ironWithCopperPick" }
            ]);

            block.dimension.getEntities({ type: "minecraft:item", location: block.location, maxDistance: 3 })
                .forEach((entity) => entity.kill());
            break;
        };
    };
};