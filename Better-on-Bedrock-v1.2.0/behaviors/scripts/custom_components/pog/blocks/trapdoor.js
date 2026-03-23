/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onPlayerInteract: ({ block }) => {
        const isOpen = block.permutation.getState("pog:is_open");
        block.setPermutation(block.permutation.withState("pog:is_open", !isOpen));
        block.dimension.playSound(isOpen ? "close.wooden_trapdoor" : "open.wooden_trapdoor", block.location);
    },
    onTick: ({ block, dimension }) => {
        const isOpen = block.permutation.getState("pog:is_open");
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
};