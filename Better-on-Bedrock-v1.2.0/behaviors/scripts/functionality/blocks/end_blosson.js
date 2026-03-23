import { Direction } from "@minecraft/server";

/**
 * @param { import("@minecraft/server").Block } block 
 * @param { import("@minecraft/server").ItemStack } itemStack 
 * @param { import("@minecraft/server").Direction } blockFace 
 */
export default function(block, itemStack, blockFace) {
    if (blockFace !== Direction.Up || itemStack.typeId !== "better_on_bedrock:end_blossom_spore_head_item")
        return;

    const above = block.above();
    switch (block.typeId) {
        case "better_on_bedrock:upward_blossom_head":
        case "better_on_bedrock:upward_blossom_stem":
            above.setType("better_on_bedrock:upward_blossom_head");
            block.setType("better_on_bedrock:upward_blossom_stem");
        break;

        default:
            above.setType("better_on_bedrock:upward_blossom_base");
            above.above().setType("better_on_bedrock:upward_blossom_head");
        break;
    };
};