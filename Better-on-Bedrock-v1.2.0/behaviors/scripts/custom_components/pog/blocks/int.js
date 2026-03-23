/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onPlayerInteract: ({ block, dimension }) => {
        const { x, y, z } = block.location;
        switch (block.typeId) {
            case "better_on_bedrock:quest_block": {
                if (block.permutation.getState("better_on_bedrock:interact") == "default") {
                    block.setPermutation(block.permutation.withState("better_on_bedrock:interact", "used"));
                    dimension.runCommandAsync(`loot spawn ${x} ${y} ${z} loot "blocks/paper"`);
                };
                break;
            };
        };
    },
};