import { EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot } from "@minecraft/server";

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onPlace: ({ block, dimension }) => {
        switch (block.typeId) {
            case "better_on_bedrock:pedestal_block":
                dimension.spawnEntity("better_on_bedrock:pedestal", {
                    x: block.location.x + 0.5,
                    y: block.location.y,
                    z: block.location.z + 0.5,
                });
            break;
        };
    },
    /*onPlayerInteract: ({ block, dimension, player }) => {
        switch (block.typeId) {
            case "better_on_bedrock:pedestal_block": {
                const pedestal = dimension.getEntities({
                    type: "better_on_bedrock:pedestal",
                    location: block.location,
                    maxDistance: 1
                })[0];
                
                const playerContainer = player.getComponent(EntityInventoryComponent.componentId).container;
                const container = pedestal.getComponent(EntityInventoryComponent.componentId).container;

                container.swapItems(0, player.selectedSlotIndex, playerContainer);
                break;
            };
        };
    },*/
};