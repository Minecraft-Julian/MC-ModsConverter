import { world } from "@minecraft/server";

import endBlosson from "../../functionality/blocks/end_blosson";

world.afterEvents.itemUseOn.subscribe(
    ({ block, itemStack, blockFace }) => {
        endBlosson(block, itemStack, blockFace);
    },
);