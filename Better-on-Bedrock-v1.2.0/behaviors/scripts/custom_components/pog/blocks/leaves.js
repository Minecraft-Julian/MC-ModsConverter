import { BlockVolumeBase } from "@minecraft/server";
function isWithinSphere(blockLoc, center, radius) {
    const dx = blockLoc.x - center.x;
    const dy = blockLoc.y - center.y;
    const dz = blockLoc.z - center.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;

    return distanceSquared <= radius * radius;
};

function hasAny(blocks, radius, block) {
    const { x, y, z } = block.location;
    let isFound = false;
    for (let xOffset = -radius; xOffset <= radius; xOffset++) {
        for (let yOffset = -radius; yOffset <= radius; yOffset++) {
            for (let zOffset = -radius; zOffset <= radius; zOffset++) {
                const blockLoc = {
                    x: x + xOffset,
                    y: y + yOffset,
                    z: z + zOffset,
                };
                
                if (isWithinSphere(blockLoc, block.location, radius)) {
                    const newBlock = block.dimension.getBlock(blockLoc);
                    if (blocks.find((type) => type === newBlock?.typeId) !== undefined) {
                        isFound = true;
                        break;
                    };
                };
            };
        };
        
        if (isFound)
            break;
    };

    return isFound;
};

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    beforeOnPlayerPlace: (data) => data.permutationToPlace = data.permutationToPlace.withState("pog:playerPlaced", true),
    onRandomTick: ({ block, dimension }) => {
        const isPlayerPlaced = block.permutation.getState("pog:playerPlaced");
        if (isPlayerPlaced)
            return;

        const validLogBlocks = [
            "minecraft:oak_log",
            "minecraft:birch_log",
            "minecraft:spruce_log",
            "minecraft:acacia_log",
            "minecraft:dark_oak_log",
            "minecraft:cherry_log",
            "minecraft:mangrove_log",
            "minecraft:jungle_log",
            "minecraft:pale_oak_log",
        ];

        const range = 3;
        const { x, y, z } = block.location;
        const contains = hasAny(validLogBlocks, range, block);

        /*const volume = new BlockVolumeBase({
            x: x - range,
            y: y - range,
            z: z - range,
        }, {
            x: x + range,
            y: y + range,
            z: z + range,
        });
        
        const contains = dimension.containsBlock(volume, { includeTypes: validLogBlocks }, true);*/
        if (false == contains) {
            let lootTable;
            switch (block?.typeId) {
                case "better_on_bedrock:peach_leaves": lootTable = "blocks/peach"; break;
                case "better_on_bedrock:orange_leaves": lootTable = "blocks/orange"; break;
                default: return;
            };

            block.setType("air");
            block.dimension.runCommand(`loot spawn ${x} ${y} ${z} loot "${lootTable}"`);
        };
    },
};