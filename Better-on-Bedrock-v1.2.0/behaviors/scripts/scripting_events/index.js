// After Events
import "./after_events/block-break";
import "./after_events/block-place";
import "./after_events/entity-die";
import "./after_events/entity-hit-block";
import "./after_events/entity-hit";
import "./after_events/entity-hurt";
import "./after_events/item-complete-use";
import "./after_events/item-release-use";
import "./after_events/item-start-use";
import "./after_events/item-stop-use";
import "./after_events/item-use";
import "./after_events/item-use-on";
import "./after_events/player-spawn";

import { world, system, TicksPerSecond } from "@minecraft/server";
world.afterEvents.playerInteractWithEntity.subscribe(
    ({ player, target }) => {
        if (target.typeId !== "better_on_bedrock:guide_book")
            return;

        target.triggerEvent("better_on_bedrock:trigger_right_page_turn_animation");
        system.runTimeout(
            () => {
                if (!target.isValid())
                    return;

                target.triggerEvent("better_on_bedrock:guide_book_right_page_turn");
            }, 0.38 * TicksPerSecond,
        );
    },
);