import { world, system, BlockTypes, EntityInventoryComponent, ItemStack, TicksPerSecond } from "@minecraft/server";
export const blocks = BlockTypes.getAll().map((block) => block.id);

import { wawla } from "./functionality/wawla.js";
import { ghostNecklace } from "./functionality/items/ghost-necklace.js";
import { voidTotem } from "./functionality/items/void-totem.js";
import { voidBoots } from "./functionality/items/void-boots.js";

// import { poggy } from "./functionality/entities/poggy.js";
import { seeker } from "./functionality/entities/seeker.js";
import { sootEye } from "./functionality/entities/soot_eye.js";

import { registerBlockComponents, registerItemComponents } from "./custom_components/index.js";

import "./scripting_events/index.js";
import "./functionality/index.js";
import "./functionality/entities/inferior.js";
import "./functionality/custom_spear/handler.js";

import "./functionality/entities/seeker.js";
import "./functionality/entities/seeker_teleport.js";

import "./functionality/blocks/jukebox.js";
import "./functionality/blocks/strip_block.js";

import "./functionality/enchanted/main.js";

// Imports our custom components
import { wall_Manager } from './custom_components/blocks/walls/wall_Manager.js'
import { ambience } from "./functionality/ambience/ambient_stuff.js";

import { loopQuests, loopSecretQuests } from "./functionality/quests/behavior.js"
import { loopGoals } from "./functionality/goals/goals.js";

world.afterEvents.playerBreakBlock.subscribe(
    (data) => wall_Manager.updateWallsAround(data.block)
);

world.afterEvents.playerPlaceBlock.subscribe(
    (data) => wall_Manager.updateWallsAround(data.block)
);


/** @param { import("@minecraft/server").Vector3 } vector */
function vectorLength(vector) {
    const x = Math.pow(vector.x, 2);
    const y = Math.pow(vector.y, 2);
    const z = Math.pow(vector.z, 2);
    return Math.sqrt(x + y + z);
};

// Main interval
system.runInterval(() => {
    system.runJob(function *() {
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (!player?.isValid())
                continue;

            // First time moving
            const velocityVector = player.getVelocity();
            const velocity = vectorLength({ x: velocityVector.x, y: 0, z: velocityVector.z });
            if (velocity > 0 && !player.hasTag("introMove")) {
                player.addTag("introMove");

                player.sendMessage([
                    { text: "§6[!] §r" },
                    { translate: "bob.message.welcome" },
                ]);
                player.sendMessage("bob.toast;achievement.0");
                player.playSound("normal_quest");

                const container = player.getComponent(EntityInventoryComponent.componentId).container;
                container.addItem(new ItemStack("better_on_bedrock:config"));
                container.addItem(new ItemStack("better_on_bedrock:quest_paper"));
                container.addItem(new ItemStack("better_on_bedrock:lost_journal"));
            };

            yield ghostNecklace(player);
            yield voidTotem(player);
            yield voidBoots(player);

            
            // Boss attacks
            
            //yield poggy(player);
            yield seeker(player);
            yield sootEye(player);
        };
    }());
}, 2);

let tick = 0;
system.runInterval(() => {
    system.runJob(function* () {
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (!player?.isValid())
                continue;

            if (!player.hasTag('joined3')) {
                player.addTag('joined3')
            }
            else if (player.getDynamicProperty("tiersCompleted") == void 0) {
                player.setDynamicProperty("tiersCompleted", 0);
            };
            
            if (player.hasTag("toolTip"))
                yield wawla(player);

            if (tick == TicksPerSecond) {
                yield ambience(player);
                yield inventoryLoop(player);
            };
        };
    }());
    
    if (tick == TicksPerSecond) {
        tick = 0;
    }
    else tick++;
});

function inventoryLoop(player) {
    const inventory = player.getComponent("inventory").container;
    for (let slot = 0; slot < inventory.size; slot++) {
        const itemStack = inventory.getItem(slot);
        if (!itemStack)
            continue;

        loopQuests(player, itemStack);
        loopSecretQuests(player, itemStack);
        loopGoals(player, itemStack);
    };
};

// Custom Components
world.beforeEvents.worldInitialize.subscribe(
    ({ blockComponentRegistry, itemComponentRegistry }) => {
        registerBlockComponents(blockComponentRegistry);
        registerItemComponents(itemComponentRegistry);
    },
);
