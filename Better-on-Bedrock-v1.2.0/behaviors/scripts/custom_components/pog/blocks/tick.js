/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onTick: ({ block, dimension }) => {
        switch (block.typeId) {
            case "better_on_bedrock:void_block":
                block.setType("air");    
            break;
            case "better_on_bedrock:voided_bush":
                dimension.spawnParticle("pog:leaves", block.location);
            break;
            case "better_on_bedrock:soul_jar_block":
                dimension.spawnParticle("pog:soul_jar", block.location);
                dimension.playSound("bloom.sculk_catalyst", block.location);
            break;
        };
    },
};