import { world } from "@minecraft/server";
function isNight() {
    const time = world.getTimeOfDay();
    return time >= 13000 && time < 24000;
};

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onTick: ({ block, dimension }) => {
        try {
            const isTopBit = block.permutation.getState("pog:double_plant") == "top_bit";
            if (isTopBit)
                return;
            
            const isOpen = block.permutation.getState("pog:is_open") == true;
            const other = block.above();
            if (isNight()) {
                if (!isOpen) {
                    const { x, y, z } = block.location;
                    const entity = block.dimension.spawnEntity("better_on_bedrock:tall_blossom", { x: x + 0.5, y, z: z + 0.5 });
                };
                
                if (other.typeId == block.typeId)
                    other.setPermutation(other.permutation.withState("pog:is_open", true));
                
                block.setPermutation(block.permutation.withState("pog:is_open", true));
            }
            else {
                if (other.typeId == block.typeId)
                    other.setPermutation(other.permutation.withState("pog:is_open", false));

                block.setPermutation(block.permutation.withState("pog:is_open", false));
            };
        }
        catch {};
    },
};