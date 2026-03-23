import { Block, world } from "@minecraft/server";

const COVER_TAG = "pog:cover_opaque";

/**
 * A list of blocks that count as "solid covering" to any block using the component.
 * @type {string[]}
 */
const COVER_BLOCKS = [
    "better_on_bedrock:shrubleaves",
    "better_on_bedrock:shrublog",
    "better_on_bedrock:shrublog_stripped"
];

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onPlace({block, dimension}) {
        updateOpacity(block.north());
        updateOpacity(block.south());
        updateOpacity(block.east());
        updateOpacity(block.west());

        if (block.location.y < dimension.heightRange.max)
            updateOpacity(block.above());
        if (block.location.y > dimension.heightRange.min)
            updateOpacity(block.below());
    }
}

// Update opacity on surrounding blocks on place/break events
world.afterEvents.playerPlaceBlock.subscribe(event => {
    const {block, dimension} = event;
    if (block.hasTag(COVER_TAG)) return;

    updateOpacity(block.north());
    updateOpacity(block.south());
    updateOpacity(block.east());
    updateOpacity(block.west());

    if (block.location.y < dimension.heightRange.max)
        updateOpacity(block.above());
    if (block.location.y > dimension.heightRange.min)
        updateOpacity(block.below());
}, {blockTypes: COVER_BLOCKS});

world.afterEvents.playerBreakBlock.subscribe(event => {
    const {block, dimension} = event;
    updateOpacity(block.north());
    updateOpacity(block.south());
    updateOpacity(block.east());
    updateOpacity(block.west());

    if (block.location.y < dimension.heightRange.max)
        updateOpacity(block.above());
    if (block.location.y > dimension.heightRange.min)
        updateOpacity(block.below());
}, {blockTypes: COVER_BLOCKS});

/**
 * Checks for covering on all sides and updates opacity accordingly.
 * @param {Block} block
 */
function updateOpacity(block) {
    const {dimension, permutation} = block;
    if (!block.hasTag(COVER_TAG)) return;

    const below_max = block.location.y < dimension.heightRange.max;
    const above_min = block.location.y > dimension.heightRange.min;

    block.setPermutation(permutation.withState("pog:opaque", all(
        isSolid(block.north()),
        isSolid(block.south()),
        isSolid(block.east()),
        isSolid(block.west()),
        above_min ? isSolid(block.below()) : false,
        below_max ? isSolid(block.above()) : false
    )));
}

/**
 * Tests if all arguments are true.
 * @param {...boolean} conds
 */
function all(...conds) {
    for (const cond of conds)
        if (!cond) return false;
    return true;
}

/** @param {Block} block  */
function isSolid(block) {
    return COVER_BLOCKS.includes(block.typeId);
}
