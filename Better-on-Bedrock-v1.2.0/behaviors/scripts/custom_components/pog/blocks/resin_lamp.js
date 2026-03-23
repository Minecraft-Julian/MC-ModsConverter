import { world } from "@minecraft/server";

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onTick: ({ block, dimension }) => {
        const isOn = block.permutation.getState("pog:is_on");
        block.setPermutation(block.permutation.withState("pog:is_on", block.getRedstonePower() > 0));
    },
};