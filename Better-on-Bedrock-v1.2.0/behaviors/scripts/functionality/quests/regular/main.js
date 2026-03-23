import { ItemStack, Entity } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

import { mainScreen } from "../main";
import { getFormattedStatus, getRewards, giveRewards } from "../util.js";

import { logs } from "../../enchantments/treeCapitator.js";

export const tiers = [
    {
        name: "%bob.quests.tier.1",
        icon: "textures/ui/icons/quests/getting_started",
        property: "quests",
        title: "bob.toast;quests.tier.1",
        rewards: [
            {
                type: 0,
                name: "better_on_bedrock:adventure_hat",
                amount: 1
            }
        ],
        quests: [
            {
                name: "%bob.quests.tier.1.name.1",
                icon: "textures/ui/icons/quests/1/first_wood",
                description: "%bob.quests.tier.1.desc.1",
                default: 1,
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:stick",
                        amount: 4,
                    },
                    {
                        type: 1,
                        amount: 25,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        const isLog = itemStack.hasTag("log")
                            || itemStack.hasTag("better_on_bedrock:small_log")
                            || logs.includes(itemStack.typeId)
                            || itemStack.typeId.includes("log");
                        return isLog && itemStack.amount >= 3;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.1.1"
                },
            },
            {
                name: "%bob.quests.tier.1.name.2",
                icon: "textures/ui/icons/quests/1/stone_age",
                description: "%bob.quests.tier.1.desc.2",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:torch",
                        amount: 4,
                    },
                    {
                        type: 1,
                        amount: 25,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:cobblestone" && itemStack.amount >= 14;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.1.2"
                },
            },
            {
                name: "%bob.quests.tier.1.name.3",
                icon: "textures/ui/icons/quests/1/getting_an_upgrade",
                description: "%bob.quests.tier.1.desc.3",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:coal",
                        amount: 5,
                    },
                    {
                        type: 1,
                        amount: 50,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:stone_pickaxe";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.1.3"
                },
            },
            {
                name: "%bob.quests.tier.1.name.6",
                icon: "textures/ui/icons/quests/1/copper_age",
                description: "%bob.quests.tier.1.desc.6",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:chest",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 75,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:copper_pickaxe";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.1.6"
                },
            },
            {
                name: "%bob.quests.tier.1.name.4",
                icon: "textures/ui/icons/quests/1/iron_y",
                description: "%bob.quests.tier.1.desc.4",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:leather",
                        amount: 3,
                    },
                    {
                        type: 1,
                        amount: 50,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:iron_pickaxe";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.1.4"
                },
            },
            {
                name: "%bob.quests.tier.1.name.5",
                icon: "textures/ui/icons/quests/1/diamonds",
                description: "%bob.quests.tier.1.desc.5",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:diamond",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 100,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:diamond" && itemStack.amount >= 9;
                    },
                    sound: "epic_quest",
                    title: "bob.toast;quests.1.5"
                },
            },
        ],
    },
    {
        name: "%bob.quests.tier.2",
        icon: "textures/ui/icons/quests/adventure_time",
        property: "quests2",
        title: "bob.toast;quests.tier.2",
        quests: [
            {
                name: "%bob.quests.tier.2.name.1",
                icon: "textures/ui/icons/quests/2/trader",
                description: "%bob.quests.tier.2.desc.1",
                default: 1,
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:ender_pearl",
                        amount: 3,
                    },
                    {
                        type: 1,
                        amount: 100,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:bought_quest";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.2.1"
                },
            },
            {
                name: "%bob.quests.tier.2.name.2",
                icon: "textures/ui/icons/quests/2/bounty_time",
                description: "%bob.quests.tier.2.desc.2",
                rewards: [
                    {
                        type: 1,
                        amount: 75,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return (
                            itemStack.typeId == "better_on_bedrock:bounty_paper_open"
                            || itemStack.typeId == "better_on_bedrock:quest_scroll_closed"
                        );
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.2.2"
                },
            },
            {
                name: "%bob.quests.tier.2.name.3",
                icon: "textures/ui/icons/quests/2/wizard_craft",
                description: "%bob.quests.tier.2.desc.3",
                rewards: [
                    {
                        type: 0,
                        name: "better_on_bedrock:record_stardust",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 250,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:flame_rune";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.2.3"
                },
            },
            {
                name: "%bob.quests.tier.2.name.4",
                icon: "textures/ui/icons/quests/2/traveler",
                description: "%bob.quests.tier.2.desc.4",
                rewards: [
                    {
                        type: 0,
                        name: "better_on_bedrock:ender_tear",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 250,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:waystone_block";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.2.4"
                },
            },
            {
                name: "%bob.quests.tier.2.name.5",
                icon: "textures/ui/icons/quests/2/staffs_n_stones",
                description: "%bob.quests.tier.2.desc.5",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:golden_apple",
                        amount: 2,
                    },
                    {
                        type: 1,
                        amount: 200,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:staff";
                    },
                    sound: "epic_quest",
                    title: "bob.toast;quests.2.5"
                },
            },
        ],
    },
    {
        name: "%bob.quests.tier.3",
        icon: "textures/ui/icons/quests/nether_arise",
        property: "quests3",
        title: "bob.toast;quests.tier.3",
        quests: [
            {
                name: "§g%bob.quests.tier.3.name.1§r",
                icon: "textures/ui/icons/quests/3/deep_below",
                description: "%bob.quests.tier.3.desc.1",
                default: 1,
                rewards: [
                    {
                        type: 0,
                        name: "better_on_bedrock:corstinite_ingot",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 15,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:corstinite_ingot";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.3.1"
                },
            },
            {
                name: "§g%bob.quests.tier.3.name.2§r",
                icon: "textures/ui/icons/quests/3/friends",
                description: "%bob.quests.tier.3.desc.2",
                rewards: [
                    {
                        type: 0,
                        name: "better_on_bedrock:smeared_pearl",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 15,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:quetzacaw_egg";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.3.2"
                },
            },
            {
                name: "§g%bob.quests.tier.3.name.3§r",
                icon: "textures/ui/icons/quests/3/money_crab",
                description: "%bob.quests.tier.3.desc.3",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:ender_pearl",
                        amount: 5,
                    },
                    {
                        type: 1,
                        amount: 15,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:blackstone_crumb" && itemStack.amount >= 6;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.3.3"
                },
            },
            {
                name: "§g%bob.quests.tier.3.name.4§r",
                icon: "textures/ui/icons/quests/3/shielded_pyroclast",
                description: "%bob.quests.tier.3.desc.4",
                rewards: [
                    {
                        type: 0,
                        name: "better_on_bedrock:green_stone",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 15,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").Entity} entity */ 
                    check: (entity) => {
                        if (!(entity instanceof Entity))
                            return false;

                        return entity.typeId === "better_on_bedrock:inferior";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.3.4"
                },
            },
            {
                name: "§g%bob.quests.tier.3.name.5§r",
                icon: "textures/ui/icons/quests/3/withered_samurai",
                description: "%bob.quests.tier.3.desc.5",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:blaze_powder",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 15,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").Entity} entity */ 
                    check: (entity) => {
                        if (!(entity instanceof Entity))
                            return false;

                        return entity.typeId === "better_on_bedrock:withered_samurai";
                    },
                    sound: "epic_quest",
                    title: "bob.toast;quests.3.5"
                },
            },
        ],
    },
    {
        name: "%bob.quests.tier.4",
        icon: "textures/ui/icons/quests/monster_looter",
        property: "quests4",
        title: "bob.toast;quests.tier.4",
        quests: [
            {
                name: "%bob.quests.tier.4.name.1",
                icon: "textures/ui/icons/quests/4/zombie_slayer",
                description: "%bob.quests.tier.4.desc.1",
                default: 1,
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:cooked_beef",
                        amount: 6,
                    },
                    {
                        type: 1,
                        amount: 10,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:rotten_flesh" && itemStack.amount >= 32;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.4.1"
                },
            },
            {
                name: "%bob.quests.tier.4.name.2",
                icon: "textures/ui/icons/quests/4/creeper_hunter",
                description: "%bob.quests.tier.4.desc.2",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:tnt",
                        amount: 5,
                    },
                    {
                        type: 1,
                        amount: 15,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:gunpowder" && itemStack.amount >= 16;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.4.2"
                },
            },
            {
                name: "%bob.quests.tier.4.name.3",
                icon: "textures/ui/icons/quests/4/stringy_situation",
                description: "%bob.quests.tier.4.desc.3",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:shears",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 15,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:string" && itemStack.amount >= 14;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.4.3"
                },
            },
            {
                name: "%bob.quests.tier.4.name.4",
                icon: "textures/ui/icons/quests/4/more_souls",
                description: "%bob.quests.tier.4.desc.4",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:diamond",
                        amount: 2,
                    },
                    {
                        type: 1,
                        amount: 100,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:soul_star" && itemStack.amount >= 2;
                    },
                    sound: "epic_quest",
                    title: "bob.toast;quests.4.4"
                },
            },
        ],
    },
    {
        name: "%bob.quests.tier.5",
        icon: "textures/ui/icons/quests/more_food",
        property: "quests5",
        title: "bob.toast;quests.tier.5",
        quests: [
            {
                name: "%bob.quests.tier.5.name.1",
                icon: "textures/ui/icons/quests/5/a_big_nut",
                description: "%bob.quests.tier.5.desc.1",
                default: 1,
                rewards: [
                    {
                        type: 1,
                        amount: 125,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:broken_open_coconut";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.5.1"
                },
            },
            {
                name: "%bob.quests.tier.5.name.2",
                icon: "textures/ui/icons/quests/5/eggs_as_plants",
                description: "%bob.quests.tier.5.desc.2",
                default: 1,
                rewards: [
                    {
                        type: 1,
                        amount: 100,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:baked_eggplant" && itemStack.amount >= 32;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.5.2"
                },
            },
            {
                name: "%bob.quests.tier.5.name.3",
                icon: "textures/ui/icons/quests/5/a_good_diet",
                description: "%bob.quests.tier.5.desc.3",
                rewards: [
                    {
                        type: 0,
                        name: "better_on_bedrock:healthy_carrot",
                        amount: 3,
                    },
                    {
                        type: 1,
                        amount: 50,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:salad" && itemStack.amount >= 8;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.5.3"
                },
            },
            {
                name: "%bob.quests.tier.5.name.4",
                icon: "textures/ui/icons/quests/5/wildin_food",
                description: "%bob.quests.tier.5.desc.4",
                rewards: [
                    {
                        type: 0,
                        name: "better_on_bedrock:wild_carrot",
                        amount: 5,
                    },
                    {
                        type: 1,
                        amount: 50,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:wild_carrot" && itemStack.amount >= 16;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.5.4"
                },
            },
            {
                name: "%bob.quests.tier.5.name.5",
                icon: "textures/ui/icons/quests/5/green_hay",
                description: "%bob.quests.tier.5.desc.5",
                rewards: [
                    {
                        type: 0,
                        name: "better_on_bedrock:barley_soup",
                        amount: 2,
                    },
                    {
                        type: 1,
                        amount: 60,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:barley_soup" && itemStack.amount >= 5;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.5.5"
                },
            },
            {
                name: "%bob.quests.tier.5.name.6",
                icon: "textures/ui/icons/quests/5/cure_for_tears",
                description: "%bob.quests.tier.5.desc.6",
                rewards: [
                    {
                        type: 0,
                        name: "better_on_bedrock:barley_soup",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 65,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:baked_onion" && itemStack.amount >= 32;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.5.6"
                },
            },
            {
                name: "%bob.quests.tier.5.name.7",
                icon: "textures/ui/icons/quests/5/la_baguette",
                description: "%bob.quests.tier.5.desc.7",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:bread",
                        amount: 6,
                    },
                    {
                        type: 1,
                        amount: 100,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:baguette";
                    },
                    sound: "epic_quest",
                    title: "bob.toast;quests.5.7"
                },
            },
        ],
    },
    {
        name: "%bob.quests.tier.6",
        icon: "textures/ui/icons/quests/combat_time",
        property: "quests6",
        title: "bob.toast;quests.tier.6",
        quests: [
            {
                name: "%bob.quests.tier.6.name.1",
                icon: "textures/ui/icons/quests/6/bow_master",
                description: "%bob.quests.tier.6.desc.1",
                default: 1,
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:bow",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 15,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:arrow" && itemStack.amount >= 48;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.6.1"
                },
            },
            {
                name: "%bob.quests.tier.6.name.2",
                icon: "textures/ui/icons/quests/6/staying_healthy",
                description: "%bob.quests.tier.6.desc.2",
                rewards: [
                    {
                        type: 0,
                        name: "better_on_bedrock:healthy_carrot",
                        amount: 8,
                    },
                    {
                        type: 1,
                        amount: 10,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:healthy_carrot" && itemStack.amount >= 16;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.6.2"
                },
            },
            {
                name: "%bob.quests.tier.6.name.3",
                icon: "textures/ui/icons/quests/6/armored_up",
                description: "%bob.quests.tier.6.desc.3",
                rewards: [
                    {
                        type: 1,
                        amount: 50,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:diamond_chestplate";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.6.3"
                },
            },
            {
                name: "%bob.quests.tier.6.name.4",
                icon: "textures/ui/icons/quests/6/willager_hat",
                description: "%bob.quests.tier.6.desc.4",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:enchanted_golden_apple",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 200,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "better_on_bedrock:willager_hat";
                    },
                    sound: "epic_quest",
                    title: "bob.toast;quests.6.4"
                },
            },
        ],
    },
    {
        name: "%bob.quests.tier.7",
        icon: "textures/ui/icons/quests/beyond_the_overworld",
        property: "quests7",
        title: "bob.toast;quests.tier.7",
        quests: [
            {
                name: "%bob.quests.tier.7.name.1",
                icon: "textures/ui/icons/quests/7/this_is_fine",
                description: "%bob.quests.tier.7.desc.1",
                default: 1,
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:blaze_powder",
                        amount: 5,
                    },
                    {
                        type: 1,
                        amount: 15,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:blaze_rod" && itemStack.amount >= 5;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.7.1"
                },
            },
            {
                name: "%bob.quests.tier.7.name.2",
                icon: "textures/ui/icons/quests/7/snow_white",
                description: "%bob.quests.tier.7.desc.2",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:iron_ingot",
                        amount: 5,
                    },
                    {
                        type: 1,
                        amount: 10,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:quartz" && itemStack.amount >= 32;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.7.2"
                },
            },
            {
                name: "%bob.quests.tier.7.name.3",
                icon: "textures/ui/icons/quests/7/netherite",
                description: "%bob.quests.tier.7.desc.3",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:smithing_table",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 25,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:netherite_ingot";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.7.3"
                },
            },
            {
                name: "%bob.quests.tier.7.name.4",
                icon: "textures/ui/icons/quests/7/ender_player",
                description: "%bob.quests.tier.7.desc.4",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:ender_pearl",
                        amount: 3,
                    },
                    {
                        type: 1,
                        amount: 50,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:chorus_fruit" && itemStack.amount >= 64;
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.7.4"
                },
            },
            {
                name: "%bob.quests.tier.7.name.5",
                icon: "textures/ui/icons/quests/7/nether_bed",
                description: "%bob.quests.tier.7.desc.5",
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:glowstone",
                        amount: 8,
                    },
                    {
                        type: 1,
                        amount: 75,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:respawn_anchor";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.7.5"
                },
            },
            {
                name: "%bob.quests.tier.7.name.6",
                icon: "textures/ui/icons/quests/7/movable_chest",
                description: "%bob.quests.tier.7.desc.6",
                rewards: [
                    {
                        type: 1,
                        amount: 85,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:undyed_shulker_box";
                    },
                    sound: "normal_quest",
                    title: "bob.toast;quests.7.6"
                },
            },
            {
                name: "%bob.quests.tier.7.name.7",
                icon: "textures/ui/icons/quests/7/dragon_egg",
                description: "%bob.quests.tier.7.desc.7",
                default: 1,
                rewards: [
                    {
                        type: 0,
                        name: "minecraft:enchanted_golden_apple",
                        amount: 1,
                    },
                    {
                        type: 1,
                        amount: 175,
                    }
                ],
                unlock: {
                    /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                    check: (itemStack) => {
                        if (!(itemStack instanceof ItemStack))
                            return false;

                        return itemStack.typeId == "minecraft:dragon_egg";
                    },
                    sound: "epic_quest",
                    title: "bob.toast;quests.7.7"
                },
            },
        ],
    },
];


export const secret = {
    name: "%bob.quests.secret",
    icon: "textures/items/record/broken_stellar",
    property: "secret",
    quests: [
        {
            name: "%bob.quests.secret.1.name.1",
            icon: "textures/items/record/record_stellar",
            description: "%bob.quests.secret.1.desc.1",
            default: 0,
            rewards: [
                {
                    type: 0,
                    name: "minecraft:netherite_ingot",
                    amount: 3,
                },
                {
                    type: 0,
                    name: "minecraft:enchanted_golden_apple",
                    amount: 1,
                }
            ],
            /** @param {import("@minecraft/server").ItemStack} itemStack */ 
            display: (itemStack) => {
                if (!(itemStack instanceof ItemStack))
                    return false;

                return itemStack.typeId == "better_on_bedrock:broken_stellar";
            },
            unlock: {
                /** @param {import("@minecraft/server").ItemStack} itemStack */ 
                check: (itemStack) => {
                    if (!(itemStack instanceof ItemStack))
                        return false;

                    return itemStack.typeId == "better_on_bedrock:stellar_crystals";
                },
                sound: "epic_quest",
                title: "bob.toast;quests.secret.1"
            },
        },
    ],
};

function openTier(player, isSecret, tierId) {
    const tier = isSecret ? secret : tiers[tierId];
    if (player.getDynamicProperty(tier.property) == undefined) {
        const quests = tier.quests.map((q, index) => ([index, q.default ?? 0]));
        player.setDynamicProperty(
            tier.property,
            JSON.stringify(quests),
        );
    };

    let savedQuests = JSON.parse(player.getDynamicProperty(tier.property));
    for (const savedQuest of savedQuests) {
        if (!tier.quests.find((q, index) => index == savedQuest[0])) {
            savedQuests = savedQuests.filter((q, index) => index != savedQuest[0]);
        };
    };

    for (let i = 0; i < tier.quests.length; i++) {
        const quest = tier.quests[i];
        const questExists = savedQuests.find((q, index) => index == i) !== undefined;
        if (!questExists) {
            savedQuests[i] = [i, quest.default ?? 0];
        };
    };

    player.setDynamicProperty(tier.property, JSON.stringify(savedQuests));
    

    const form = new ActionFormData();
    form.title(tier.name);
    if (!isSecret)
        form.body({ translate: "bob.gui.quests.tier" });

    let questsCount = 0;
    for (let i = 0; i < tier.quests.length; i++) {
        const quest = tier.quests[i];
        const savedQuest = savedQuests.find((q, index) => index == i);
        if (isSecret && savedQuest[1] == 0)
            continue;

        questsCount++;

        const questStatus = getFormattedStatus(savedQuest[1]);
        form.button(quest.name.concat(" - ", questStatus), quest.icon);
    };

    if (questsCount == 0) {
        form.body({ translate: "bob.gui.nothing" });
    };

    form.button("§c< %gui.goBack§r");
    form.show(player).then(
        (response) => {
            if (response.canceled)
                return;

            if (response.selection == tier.quests.length) {
                regularScreen(player);
                return;
            };

            const savedQuest = savedQuests.find((q, index) => index == response.selection);
            switch (savedQuest[1]) {
                case 0: {
                    const previousQuest = tier.quests[response.selection - 1];
                    player.sendMessage([
                        { text: "§c[!] §r" },
                        {
                            translate: "bob.message.quests.lockedQuest",
                            with: [ previousQuest.name ]
                        },
                    ]);
                    break;
                };
                case 1: {
                    functions.start(player, isSecret, response.selection, tierId);
                    break;
                };
                case 2: {
                    functions.about(player, isSecret, response.selection, tierId);
                    break;
                };
                case 3: {
                    functions.claim(player, isSecret, response.selection, tierId);
                    break;
                };
                case 4: {
                    player.sendMessage([
                        { text: "§c[!] §r" },
                        { translate: "bob.message.quests.alreadyClaimed" },
                    ]);
                    break;
                };
            };
        },
    );
};

const functions = {
    about: (player, isSecret, questId, tierId) => {
        const tier = isSecret ? secret : tiers[tierId];
        const quest = tier.quests[questId];

        const form = new ActionFormData();
        form.title(quest.name);
        form.body({ rawtext: [
            { text: quest.description + "\n\n§e§l%bob.gui.rewards§r\n" },
            ...getRewards(quest.rewards),
        ] });
        //form.body({ translate: quest.description + "\n\n§e§l%bob.gui.rewards§r\n" + getRewards(quest.rewards) });
        form.button("§c< %gui.goBack§r");
        form.show(player).then(() => openTier(player, isSecret, tierId));
    },
    start: (player, isSecret, questId, tierId) => {
        const tier = isSecret ? secret : tiers[tierId];
        const quest = tier.quests[questId];
        const savedQuests = JSON.parse(player.getDynamicProperty(tier.property));

        const form = new ActionFormData();
        form.title(quest.name);
        form.body({ rawtext: [
            { text: quest.description + "\n\n§e§l%bob.gui.rewards§r\n" },
            ...getRewards(quest.rewards),
        ] });
        //form.body({ translate: quest.description + "\n\n§e§l%bob.gui.rewards§r\n" + getRewards(quest.rewards) });
        form.button({ translate: "%bob.gui.startQuest" });
        form.button("§c< %gui.goBack§r");
        form.show(player).then(
            (response) => {
                switch (response?.selection) {
                    case 0: {
                        const savedQuest = savedQuests.find((q, index) => index == questId);
                        savedQuest[1] = 2; // Busy
                        player.setDynamicProperty(tier.property, JSON.stringify(savedQuests));

                        player.sendMessage([
                            { text: "§a[!] §r" },
                            { translate: "bob.message.quests.started" },
                        ]);
                        break;
                    };
                    case 1: openTier(player, isSecret, tierId); break;
                };
            },
        );
    },
    claim: (player, isSecret, questId, tierId) => {
        const tier = isSecret ? secret : tiers[tierId];
        const quest = tier.quests[questId];
        const savedQuests = JSON.parse(player.getDynamicProperty(tier.property));

        const form = new ActionFormData();
        form.title(quest.name);
        form.body({ rawtext: [
            { text: "%bob.gui.quests.completed\n\n§e§l%bob.gui.rewards§r\n" },
            ...getRewards(quest.rewards),
        ] });
        //form.body({ translate: "%bob.gui.quests.completed\n\n§e§l%bob.gui.rewards§r\n" + getRewards(quest.rewards) });
        form.button({ translate: "%bob.gui.claim" });
        form.button("§c< %gui.goBack§r");
        form.show(player).then(
            (response) => {
                switch (response?.selection) {
                    case 0: {
                        const savedQuest = savedQuests.find((q, index) => index == questId);
                        savedQuest[1] = 4; // Claimed
                        player.setDynamicProperty(tier.property, JSON.stringify(savedQuests));

                        giveRewards(player, quest.rewards);
                        openTier(player, isSecret, tierId);
                        break;
                    };
                    case 1: openTier(player, isSecret, tierId); break;
                };
            },
        );
    },
};

/** @param { import("@minecraft/server").Player } player  */
export function regularScreen(player) {
    const tiersCompleted = player.getDynamicProperty("tiersCompleted") ?? 0;

    const form = new ActionFormData()
    .title("§u%bob.gui.quests.regular.title§r")
    .body({ translate: "bob.gui.quests.regular.desc" });

    for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        const isUnlocked = tiersCompleted >= i;

        form.button(tier.name.concat("\n", isUnlocked ? "" : "§c[LOCKED]§r"), tier.icon);
    };

    let shouldClaimAll = false;
    for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        let savedQuests = JSON.parse(player.getDynamicProperty(tier.property) ?? "[]");
        for (let j = 0; j < tier.quests.length; j++) {
            const quest = tier.quests[j];
            const savedQuest = savedQuests.find((q, index) => index == j);
            if (savedQuest == undefined)
                continue;

            if (savedQuest[1] == 3) { // Completed
                shouldClaimAll = true;
                break;
            };
        };
    };
    

    const secretQuests = JSON.parse(player.getDynamicProperty(secret.property) ?? "[]");
    const hasSecretQuests = secretQuests.some((q) => q[1] !== 0);
    if (hasSecretQuests)
        form.button(secret.name, secret.icon);

    if (shouldClaimAll)
        form.button("§q> %bob.gui.claimAll§r");

    form.button("§c< %gui.goBack§r");
    form.show(player).then(
        (response) => {
            if (response.canceled)
                return;

            if (shouldClaimAll) {
                switch (response.selection) {
                    case (hasSecretQuests ? tiers.length + 1 : tiers.length): {
                        for (let i = 0; i < tiers.length; i++) {
                            const tier = tiers[i];
                            let savedQuests = JSON.parse(player.getDynamicProperty(tier.property) ?? "[]");
                            for (let j = 0; j < tier.quests.length; j++) {
                                const quest = tier.quests[j];
                                const savedQuest = savedQuests.find((q, index) => index == j);
                                if (savedQuest == undefined)
                                    continue;

                                if (savedQuest[1] == 3) {
                                    giveRewards(player, quest.rewards);

                                    savedQuest[1] = 4; // Claimed
                                };
                            };
                            
                            player.setDynamicProperty(
                                tier.property,
                                JSON.stringify(savedQuests),
                            );
                        };

                        player.playSound("random.orb");
                        player.sendMessage([
                            { text: "§a[!] §r" },
                            { translate: "bob.message.quests.claimedAll" },
                        ]);

                        mainScreen(player);
                        return;
                    };
                    case (hasSecretQuests ? tiers.length + 2 : tiers.length + 1): {
                        mainScreen(player);
                        return;
                    };
                    default:
                        break;
                };
            }
            else {
                if (hasSecretQuests) {
                    if (response.selection == tiers.length) {
                        openTier(player, true);
                        return;
                    }
                    else if (response.selection == tiers.length + 1) {
                        mainScreen(player);
                        return;
                    };
                }
                else {
                    if (response.selection == tiers.length) {
                        mainScreen(player);
                        return;
                    };
                };
            };

            const tiersCompleted = player.getDynamicProperty("tiersCompleted") ?? 0;
            if (tiersCompleted < response.selection) {
                const previousQuest = tiers[response.selection - 1];
                player.sendMessage([
                    { text: "§c[!] §r" },
                    {
                        translate: "bob.message.quests.lockedTier",
                        with: [ previousQuest.name ]
                    },
                ]);
                return;
            };


            openTier(player, false, response.selection);
        },
    );
};