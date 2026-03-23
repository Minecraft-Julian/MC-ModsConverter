import { system } from "@minecraft/server";

/** @type { import("@minecraft/server").ItemCustomComponent } */
export const events = {
    onUseOn: ({ block, usedOnBlockPermutation, itemStack, source }) => {
        const { x, y, z } = block.location;
        switch (block.typeId) {
            case "better_on_bedrock:end_podium": {
                const location = {
                    x: x + 0.5,
                    y: y + 5,
                    z: z + 0.5
                };

                block.setPermutation(usedOnBlockPermutation.withState("pog:ring_added", true));
                block.dimension.spawnParticle("test:dragon_death2", location);

                source.runCommandAsync("clear @s better_on_bedrock:the_ardent_crystal 0 1");
                system.runTimeout(() => block.dimension.spawnEntity("better_on_bedrock:poggy", location));
                break;
            };

            case "better_on_bedrock:end_podium_basic": {
                if (block.permutation.getState("pog:ring_added") !== 0)
                    return;

                let lootTable;
                switch (itemStack.typeId) {
                    case "better_on_bedrock:ring_of_care": {
                        lootTable = "chests/end_city_treasure_once";
                        block.setPermutation(usedOnBlockPermutation.withState("pog:ring_added", 1));
                        break;
                    };
                    case "better_on_bedrock:ring_of_hope": {
                        lootTable = "chests/lava_shrine_once";
                        block.setPermutation(usedOnBlockPermutation.withState("pog:ring_added", 2));
                        break;
                    };
                    case "better_on_bedrock:ring_of_hate": {
                        lootTable = "chests/waystone_tower_once";
                        block.setPermutation(usedOnBlockPermutation.withState("pog:ring_added", 3));
                        break;
                    };

                    default: return;
                };

                source.runCommandAsync("clear @s ".concat(itemStack.typeId, " 0 1"));
                block.dimension.runCommandAsync(`loot spawn ${x} ${y} ${z} loot "${lootTable}"`);

                break;
            };
        };
    },
};