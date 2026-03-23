import { world } from "@minecraft/server";

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onPlayerInteract: ({ block, dimension }) => {
        dimension.spawnEntity("better_on_bedrock:willager", block.location);
        world.structureManager.place("willager_loot_box", dimension, block.location);
    },
};


/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events_chair = {
    onPlace: ({ block, dimension, player }) => {
        block.dimension.spawnEntity('eddieworks:wooden_chair', block.location)
    },
};