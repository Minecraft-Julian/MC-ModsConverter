import { Direction } from "@minecraft/server";
/**
 * @import { BlockCustomComponent, BlockComponentPlayerPlaceBeforeEvent } from "@minecraft/server";
 * @implements { BlockCustomComponent }
 */
export default class SmallLogsComponent {
    static componentId = "pog:small_logs";
    static TAG = "better_on_bedrock:small_log";

    constructor() {
        this.beforeOnPlayerPlace.bind(this);
        this.onPlace.bind(this);
        this.onPlayerDestroy.bind(this);
    };

    /** @param { BlockComponentPlayerPlaceBeforeEvent } data */
    beforeOnPlayerPlace(data) {
        const { block, permutationToPlace: permutation } = data;
        const face = permutation.getState("minecraft:block_face");

        data.permutationToPlace = SmallLogsComponent.updateLog(block, permutation, face);
    };

    onPlace({ block }) {
        SmallLogsComponent.shouldUpdateLog(block);
        
        SmallLogsComponent.shouldUpdateLog(block.above());
        SmallLogsComponent.shouldUpdateLog(block.below());
        SmallLogsComponent.shouldUpdateLog(block.north());
        SmallLogsComponent.shouldUpdateLog(block.south());
        SmallLogsComponent.shouldUpdateLog(block.east());
        SmallLogsComponent.shouldUpdateLog(block.west());
    };

    onPlayerDestroy({ block }) {
        SmallLogsComponent.shouldUpdateLog(block.above());
        SmallLogsComponent.shouldUpdateLog(block.below());
        SmallLogsComponent.shouldUpdateLog(block.north());
        SmallLogsComponent.shouldUpdateLog(block.south());
        SmallLogsComponent.shouldUpdateLog(block.east());
        SmallLogsComponent.shouldUpdateLog(block.west());
    };



    /**
     * @param { import("@minecraft/server").Block } block
     */
    static shouldUpdateLog(block) {
        if (!block.hasTag(SmallLogsComponent.TAG))
            return;

        const permutation = block.permutation;
        const face = permutation.getState("minecraft:block_face");
    
        block.setPermutation(
            SmallLogsComponent.updateLog(block, permutation, face)
        );
    };

    /**
     * @param { import("@minecraft/server").Block } block
     * @param { import("@minecraft/server").BlockPermutation } permutation
     * @param { string } face
     * @returns { import("@minecraft/server").BlockPermutation }
     */
    static updateLog(block, permutation, face) {
        let north = false;
        let south = false;
        let east = false;
        let west = false;
    
        switch (face) {
            case "up":
            case "down": {
                north = SmallLogsComponent.checkFaces(block.north(), [ "north", "south" ]);
                south = SmallLogsComponent.checkFaces(block.south(), [ "north", "south" ]);
                east = SmallLogsComponent.checkFaces(block.east(), [ "east", "west" ]);
                west = SmallLogsComponent.checkFaces(block.west(), [ "east", "west" ]);
                break;
            };
            case "north":
            case "south": {
                north = SmallLogsComponent.checkFaces(block.above(), [ "up", "down" ]);
                south = SmallLogsComponent.checkFaces(block.below(), [ "up", "down" ]);
                east = SmallLogsComponent.checkFaces(block.east(), [ "east", "west" ]);
                west = SmallLogsComponent.checkFaces(block.west(), [ "east", "west" ]);
                break;
            };
            case "east":
            case "west": {
                north = SmallLogsComponent.checkFaces(block.north(), [ "north", "south" ]);
                south = SmallLogsComponent.checkFaces(block.south(), [ "north", "south" ]);
                east = SmallLogsComponent.checkFaces(block.above(), [ "up", "down" ]);
                west = SmallLogsComponent.checkFaces(block.below(), [ "up", "down" ]);
                break;
            };
        };
    
        return permutation
            .withState("better_on_bedrock:connected_north", north)
            .withState("better_on_bedrock:connected_south", south)
            .withState("better_on_bedrock:connected_east", east)
            .withState("better_on_bedrock:connected_west", west);
    };

    static checkFaces(block, values = []) {
        if (!block.hasTag(SmallLogsComponent.TAG))
            return false;

        const permutation = block.permutation;
        const face = permutation.getState("minecraft:block_face");
        
        return values.includes(face);
    };
};