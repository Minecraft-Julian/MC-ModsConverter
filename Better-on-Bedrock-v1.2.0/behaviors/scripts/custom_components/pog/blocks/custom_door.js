import { system } from "@minecraft/server";
/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    beforeOnPlayerPlace: (data) => {
        const { block, permutationToPlace } = data;
        const above = block.above();
        if (!above.isAir) {
            data.cancel = true;
            return;
        };

        const north = block.north().typeId == permutationToPlace.type.id;
        const east = block.east().typeId == permutationToPlace.type.id;
        const south = block.south().typeId == permutationToPlace.type.id;
        const west = block.west().typeId == permutationToPlace.type.id;
        const mirrored = (north || east || south || west);

        data.permutationToPlace = permutationToPlace.withState("pog:mirrored", mirrored);
        system.run(() => {
            above.setPermutation(permutationToPlace.withState("pog:top_bit", true).withState("pog:mirrored", mirrored));
        });
    },
    onPlayerInteract: ({ block }) => {
        const isTopBit = block.permutation.getState("pog:top_bit");
        const isOpen = block.permutation.getState("pog:door_open");
        block.setPermutation(block.permutation.withState("pog:door_open", !isOpen));

        const other = isTopBit ? block.below() : block.above();
        if (other.typeId == block.typeId)
            other.setPermutation(other.permutation.withState("pog:door_open", !isOpen));
        block.dimension.playSound(isOpen ? "close.wooden_door" : "open.wooden_door", block.location);
    },
    onTick: ({ block, dimension }) => {
        const isTopBit = block.permutation.getState("pog:top_bit");
        if (!isTopBit && block.above().typeId !== block.typeId)
            block.setType("minecraft:air");

        const isOpen = block.permutation.getState("pog:door_open");
        const isPowered = block.permutation.getState("pog:is_powered");
        const hasRedstone = block.getRedstonePower() > 0;

        if (isPowered && !hasRedstone) {
            block.setPermutation(block.permutation.withState("pog:is_powered", !isPowered));

            if (isOpen)
                events.onPlayerInteract({ block });
        } else if (!isPowered && hasRedstone) {
            block.setPermutation(block.permutation.withState("pog:is_powered", !isPowered));
            
            if (!isOpen)
                events.onPlayerInteract({ block });
        };
    },
    onPlayerDestroy: ({ block, destroyedBlockPermutation }) => {
        const below = block.below();
        if (below.typeId == destroyedBlockPermutation.type.id)
            below.setType("minecraft:air");
    },
};