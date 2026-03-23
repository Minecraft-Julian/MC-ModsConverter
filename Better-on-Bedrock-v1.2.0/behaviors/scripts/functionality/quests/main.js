import { world, ItemStack, EntityInventoryComponent } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

import "./behavior";
import "./bounties/behavior";

import { regularScreen } from "./regular/main";
import { boughtScreen } from "./bought/main";
import { bountiesScreen } from "./bounties/bounties";

export function mainScreen(player) {
    new ActionFormData()
    .title("§u%bob.gui.quests.title§r")
    .body({ translate: "bob.gui.quests.desc" })
    .button("§u%bob.gui.quests.regular§r", "textures/ui/icons/main_quests")
    .button("§q%bob.gui.quests.bought§r", "textures/ui/icons/acquired_quests")
    .show(player).then((response) => {
        if (response.canceled)
            return;

        switch (response.selection) {
            case 0: regularScreen(player); break;
            case 1: boughtScreen(player); break;
        };
    });
};

world.afterEvents.itemUse.subscribe(
    ({ source, itemStack }) => {
        const container = source.getComponent(EntityInventoryComponent.componentId).container;
        switch (itemStack.typeId) {
            case "better_on_bedrock:bounty_paper_open": mainScreen(source); break;
            case "better_on_bedrock:quest_paper":
                container.setItem(source.selectedSlotIndex, new ItemStack("better_on_bedrock:bounty_paper_open"));
            break;

            case "better_on_bedrock:quest_scroll_opened": bountiesScreen(source); break;
            case "better_on_bedrock:quest_scroll_closed":
                container.setItem(source.selectedSlotIndex, new ItemStack("better_on_bedrock:quest_scroll_opened"));
            break;
        };
    },
);