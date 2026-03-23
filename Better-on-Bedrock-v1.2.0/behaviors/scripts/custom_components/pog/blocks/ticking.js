import { BlockPermutation, EntityEquippableComponent, EquipmentSlot, GameMode } from "@minecraft/server";
const blockStages = {};

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onRandomTick: ({ block, dimension }) => {
        if (Math.random() < 0.7)
            return;

        const permutation = block.permutation;
    
        switch (block.typeId) {
            case "better_on_bedrock:quetzacaw_egg_block": {
                const currentStage = permutation.getState("better_on_bedrock:crack_stage");
                if (currentStage == undefined)
                    return;

                if (currentStage == 3) {
                    block.setType("minecraft:air");
                    block.dimension.playSound("block.turtle_egg.crack", block.location);
                    block.dimension.spawnEntity("better_on_bedrock:quetzacaw_friendly", block.location);
                    return;
                };
        
                block.dimension.playSound("block.turtle_egg.break", block.location);
                block.setPermutation(
                    permutation.withState("better_on_bedrock:crack_stage", currentStage + 1)
                );
                break;
            };
        };

        const currentGrowth = permutation.getState("better_on_bedrock:growth_stage");
        if (currentGrowth == undefined)
            return;

        const blockId = block.typeId;
        let growthStages;
        if (blockStages[blockId] == void 0) {
            growthStages = getValidValuesForBlock(blockId);
            blockStages[blockId] = growthStages;
        }
        else {
            growthStages = blockStages[blockId];
        };
                
        const maxGrowth = growthStages[growthStages.length - 1];
        if (maxGrowth === currentGrowth)
            return;
                
        const nextStage = Math.min(currentGrowth + 1, maxGrowth);
        block.setPermutation(
            permutation.withState("better_on_bedrock:growth_stage", nextStage)
        );
    },
    onPlayerInteract: ({ block, dimension, player }) => {
        const permutation = block.permutation;
        const mainHand = player.getComponent(EntityEquippableComponent.componentId).getEquipment(EquipmentSlot.Mainhand);
        const currentGrowth = permutation.getState("better_on_bedrock:growth_stage");
        if (currentGrowth == undefined)
            return;
        
        switch (mainHand?.typeId) {
            case "minecraft:bone_meal": {
                const blockId = block.typeId;
                let growthStages;
                if (blockStages[blockId] == void 0) {
                    growthStages = getValidValuesForBlock(blockId);
                    blockStages[blockId] = growthStages;
                }
                else {
                    growthStages = blockStages[blockId];
                };
                
                const maxGrowth = growthStages[growthStages.length - 1];
                if (maxGrowth === currentGrowth)
                    return;
                
                const nextStage = Math.min(currentGrowth + 1, maxGrowth);
                block.setPermutation(
                    permutation.withState("better_on_bedrock:growth_stage", nextStage)
                );

                if (player.getGameMode() == GameMode.survival) {
                    player.runCommandAsync("clear @s minecraft:bone_meal 0 1"); // Remove used bone meal
                };

                dimension.playSound("item.bone_meal.use", block.location); // Play bone meal sound
                dimension.spawnParticle("minecraft:crop_growth_emitter", {
                    x: block.location.x + 0.5,
                    y: block.location.y + 0.5,
                    z: block.location.z + 0.5,
                });  // Spawn growth particles
                break;
            };
        };

        if (currentGrowth <= 1)
            return;

        let lootTable;
        let sound;
        switch (block.typeId) {
            case "better_on_bedrock:blueberry_block": {
                sound = "block.sweet_berry_bush.pick";
                switch (currentGrowth) {
                    case 2: lootTable = "blocks/blueberry_half"; break;
                    case 3: lootTable = "blocks/blueberry"; break;
                };

                break;
            };
            case "better_on_bedrock:grape": {
                sound = "block.sweet_berry_bush.pick";
                switch (currentGrowth) {
                    case 2: lootTable = "blocks/grape_half"; break;
                    case 3: lootTable = "blocks/grape"; break;
                };

                break;
            };

            default: return;
        };

        const { x, y, z } = block.location;
        dimension.runCommandAsync(`loot spawn ${x + 0.5} ${y + 0.5} ${z + 0.5} loot "`.concat(lootTable).concat('"'));
        dimension.playSound(sound, block.location);
        block.setPermutation(block.permutation.withState("better_on_bedrock:growth_stage", 1));
    },
};

// This function checks if a specific block state with a given value is valid.
function isBlockStateValid(blockId, blockState, blockValue) {
    const state = {}; // Create a temporary state object
    state[blockState] = blockValue; // Set the state with the provided value

    const permutation = BlockPermutation.resolve(blockId, state); // Create a permutation based on the state
    return permutation.getState(blockState) === blockValue; // Check if the permutation matches the provided value
};

/**
 * @param {string} blockId - The unique identifier of the block.
 * @returns {number[]} An array containing all growth states for a block.
 */
function getValidValuesForBlock(blockId) {
    const states = []; // Empty object to store valid state values
    for (let i = 0; i < 8; i++) {
        // Check if the block state with the current value is valid
        if (!isBlockStateValid(blockId, "better_on_bedrock:growth_stage", i))
            continue;

        states.push(i); // Add the valid value to the state's array
    };
    
    return states;
};