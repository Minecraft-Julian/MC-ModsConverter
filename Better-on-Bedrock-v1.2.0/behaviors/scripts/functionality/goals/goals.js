import { world, ItemStack, Block } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getRewards } from "../quests/util";

export const goals = [
    {
        name: "%bob.achievement.1",
        description: "bob.achievement.1.desc",
        tag: "craftingTable",
        unlock: {
            /** @param {import("@minecraft/server").Block} block */ 
            check: (block) => {
                if (!(block instanceof Block))
                    return false;

                return [
                    "minecraft:crafting_table",
                    "better_on_bedrock:acacia_crafting_table",
                    "better_on_bedrock:bamboo_crafting_table",
                    "better_on_bedrock:birch_crafting_table",
                    "better_on_bedrock:cherry_crafting_table",
                    "better_on_bedrock:chorus_crafting_table",
                    "better_on_bedrock:dark_oak_crafting_table",
                    "better_on_bedrock:jungle_crafting_table",
                    "better_on_bedrock:mangrove_crafting_table",
                    "better_on_bedrock:pale_crafting_table",
                    "better_on_bedrock:spruce_crafting_table",
                    "better_on_bedrock:vacant_crafting_table",
                    "better_on_bedrock:voiding_crafting_table",
                ].includes(block.typeId);
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.1",
        },
    },
    {
        name: "%bob.achievement.2",
        description: "bob.achievement.2.desc",
        tag: "stone_age",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:cobblestone";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.2",
        },
    },
    {
        name: "%bob.achievement.3",
        description: "bob.achievement.3.desc",
        tag: "stone_pickaxe",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:stone_pickaxe";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.3",
        },
    },
    {
        name: "%bob.achievement.4",
        description: "bob.achievement.4.desc",
        tag: "carrots",
        unlock: {
            /** @param {import("@minecraft/server").Block} block */ 
            check: (block) => {
                if (!(block instanceof Block))
                    return false;

                return [
                    "minecraft:carrots",
                ].includes(block.typeId);
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.4",
        },
    },
    {
        name: "%bob.achievement.5",
        description: "bob.achievement.5.desc",
        tag: "iron_ingot",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:iron_ingot";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.5",
        },
    },
    {
        name: "%bob.achievement.6",
        description: "bob.achievement.6.desc",
        tag: "lava_bucket",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:lava_bucket";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.6",
        },
    },
    {
        name: "%bob.achievement.7",
        description: "bob.achievement.7.desc",
        tag: "iron_chestplate",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return [
                    "minecraft:iron_helmet",
                    "minecraft:iron_chestplate",
                    "minecraft:iron_leggings",
                    "minecraft:iron_boots",
                ].includes(itemStack.typeId);
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.7",
        },
    },
    {
        name: "%bob.achievement.8",
        description: "bob.achievement.8.desc",
        tag: "iron_pickaxe",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:iron_pickaxe";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.8",
        },
    },
    {
        name: "%bob.achievement.9",
        description: "bob.achievement.9.desc",
        tag: "obsidian",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:obsidian";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.9",
        },
    },
    {
        name: "%bob.achievement.10",
        description: "bob.achievement.10.desc",
        tag: "pog:diamonds",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:diamond";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.10",
        },
    },
    {
        name: "%bob.achievement.11",
        description: "bob.achievement.11.desc",
        tag: "diamond_chestplate",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return [
                    "minecraft:diamond_helmet",
                    "minecraft:diamond_chestplate",
                    "minecraft:diamond_leggings",
                    "minecraft:diamond_boots",
                ].includes(itemStack.typeId);
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.11",
        },
    },
    {
        name: "%bob.achievement.12",
        description: "bob.achievement.12.desc",
        tag: "enchanted_book",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:enchanted_book";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.12",
        },
    },
    {
        name: "%bob.achievement.13",
        description: "bob.achievement.13.desc",
        tag: "golden_apple",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return [
                    "minecraft:golden_apple",
                    "minecraft:enchanted_golden_apple",
                ].includes(itemStack.typeId);
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.13",
        },
    },
    {
        name: "%bob.achievement.14",
        description: "bob.achievement.14.desc",
        tag: "ender_eye",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:ender_eye";
            },
            sound: "epic_quest",
            title: "bob.toast;achievement.14",
        },
    },

    {
        name: "%bob.achievement.15",
        description: "bob.achievement.15.desc",
        tag: "honey_bottle",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:honey_bottle";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.15",
        },
    },
    {
        name: "%bob.achievement.16",
        description: "bob.achievement.16.desc",
        tag: "lead",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "minecraft:lead";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.16",
        },
    },


    {
        name: "%bob.achievement.17",
        description: "bob.achievement.17.desc",
        tag: "wild_carrot",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "better_on_bedrock:wild_carrot";
            },
            sound: "epic_quest",
            title: "bob.toast;achievement.17",
        },
    },
    {
        name: "%bob.achievement.18",
        description: "bob.achievement.18.desc",
        tag: "coconut_nut",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "better_on_bedrock:coconut_nut";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.18",
        },
    },
    {
        name: "%bob.achievement.19",
        description: "bob.achievement.19.desc",
        tag: "ender_tear",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "better_on_bedrock:ender_tear";
            },
            sound: "epic_quest",
            title: "bob.toast;achievement.19",
        },
    },
    {
        name: "%bob.achievement.20",
        description: "bob.achievement.20.desc",
        tag: "waystone",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "better_on_bedrock:waystone_block";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.20",
        },
    },
    {
        name: "%bob.achievement.21",
        description: "bob.achievement.21.desc",
        tag: "firts_block",
        unlock: {
            /** @param {import("@minecraft/server").Block} block */ 
            check: (block) => {
                if (!(block instanceof Block))
                    return false;

                return block.typeId === "better_on_bedrock:enchant_bench";
            },
            sound: "normal_quest",
            title: "bob.toast;achievement.21",
        },
    },
    {
        name: "%bob.achievement.22",
        description: "bob.achievement.22.desc",
        tag: "stardust_ore",
        unlock: {
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            check: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId === "better_on_bedrock:stardust_nugget";
            },
            sound: "epic_quest",
            title: "bob.toast;achievement.22",
        },
    },
];

/**
 * @param { import("@minecraft/server").Player } player
 */
export function loopGoals(player, object) {
    const tags = player.getTags();
    for (let j = 0; j < goals.length; j++) {
        const goal = goals[j];
        if (goal?.unlock == void 0)
            continue;

        if (!goal.unlock.check(object) || tags.includes(goal.tag))
            continue;

        if (goal?.unlock?.sound !== void 0)
            player.playSound(goal.unlock.sound);

        if (goal?.unlock?.title !== void 0)
            player.sendMessage(goal.unlock.title);

        player.addTag(goal.tag);
        world.sendMessage([
            { text: "§a[!] §7" },
            {
                translate: "bob.message.achievementMade",
                with: [
                    player.name,
                    goal.name
                ],
            },
        ]);
    };
};

/**
 * @param { import("@minecraft/server").Player } player
 */
export function goalsList(player) {
    const form = new ActionFormData();
    form.title("Goals");

    const tags = player.getTags();
    for (let i = 0; i < goals.length; i++) {
        const goal = goals[i];
        const isUnlocked = tags.includes(goal.tag);

        form.button(goal.name.concat("\n", isUnlocked ? "§q[DONE]§r" : "§c[LOCKED]§r"));
    };

    form.show(player).then(
        (response) => {
            if (response.canceled)
                return;

            goalInfo(player, response.selection);
        },
    );
};

function goalInfo(player, index) {
    const goal = goals[index];

    new ActionFormData()
    .title(goal.name)
    .body({ rawtext: [
        { translate: goal.description },
        { text: "\n\n§e§l%bob.gui.rewards§r\n" },
        ...getRewards(goal.rewards),
    ] })
    .button("§c< %gui.goBack§r")
    .show(player).then(
        (response) => {
            if (response.canceled)
                return;

            goalsList(player);
        },
    );
};