import { world, system, Player, EntityInventoryComponent } from "@minecraft/server";
import { giveRewards } from "../util";

export const items = {
    "better_on_bedrock:vein_miner_book": {
        id: 0,
        rarity: 2,
        name: "%bob.quests.bought.name.1",
        description: "%bob.quests.bought.desc.1",
        requiredAmount: 1,
        rewards: [
            {
                type: 0,
                name: "better_on_bedrock:rare_lootbag",
                amount: 1,
            },
            {
                type: 0,
                name: "minecraft:amethyst_shard",
                amount: 3,
            },
            {
                type: 1,
                amount: 1000,
            }
        ],
    },
    "better_on_bedrock:willager_hat": {
        id: 1,
        rarity: 0,
        name: "%bob.quests.bought.name.2",
        description: "%bob.quests.bought.desc.2",
        requiredAmount: 1,
        rewards: [
            {
                type: 0,
                name: "minecraft:emerald",
                amount: 5,
            },
            {
                type: 1,
                amount: 500,
            }
        ],
    },
    "better_on_bedrock:quetzacaw_egg": {
        id: 2,
        rarity: 1,
        name: "%bob.quests.bought.name.3",
        description: "%bob.quests.bought.desc.3",
        requiredAmount: 5,
        rewards: [
            {
                type: 0,
                name: "better_on_bedrock:rare_lootbag",
                amount: 5,
            },
            {
                type: 1,
                amount: 250,
            }
        ],
    },
    "better_on_bedrock:ghost_necklace_fragment": {
        id: 4,
        rarity: 2,
        name: "%bob.quests.bought.name.4",
        description: "%bob.quests.bought.desc.4",
        requiredAmount: 4,
        rewards: [
            {
                type: 0,
                name: "minecraft:totem_of_undying",
                amount: 5,
            },
            {
                type: 1,
                amount: 2000,
            }
        ],
    },
    "minecraft:heart_of_the_sea": {
        id: 5,
        rarity: 1,
        name: "%bob.quests.bought.name.5",
        description: "%bob.quests.bought.desc.5",
        requiredAmount: 1,
        rewards: [
            {
                type: 0,
                name: "minecraft:golden_apple",
                amount: 2,
            },
            {
                type: 1,
                amount: 500,
            }
        ],
    },
    "better_on_bedrock:deepslate_stardust_ore": {
        id: 7,
        rarity: 3,
        name: "%bob.quests.bought.name.7",
        description: "%bob.quests.bought.desc.7",
        requiredAmount: 1,
        rewards: [
            {
                type: 0,
                name: "better_on_bedrock:stardust_ingot",
                amount: 3,
            },
            {
                type: 1,
                amount: 269,
            }
        ],
    },
    "minecraft:ghast_tear": {
        id: 9,
        rarity: 1,
        name: "%bob.quests.bought.name.9",
        description: "%bob.quests.bought.desc.9",
        requiredAmount: 2,
        rewards: [
            {
                type: 0,
                name: "minecraft:phantom_membrane",
                amount: 2,
            },
            {
                type: 1,
                amount: 232,
            }
        ],
    },
    "better_on_bedrock:quetzacaw_feather": {
        id: 11,
        rarity: 3,
        name: "%bob.quests.bought.name.11",
        description: "%bob.quests.bought.desc.11",
        requiredAmount: 1,
        rewards: [
            {
                type: 1,
                amount: 496,
            }
        ],
    },
    "minecraft:arrow": {
        id: 13,
        rarity: 1,
        name: "%bob.quests.bought.name.13",
        description: "%bob.quests.bought.desc.13",
        requiredAmount: 1,
        rewards: [
            {
                type: 1,
                amount: 150,
            }
        ],
    },
    "better_on_bedrock:bounty_paper_open": {
        id: 14,
        rarity: 0,
        name: "%bob.quests.bought.name.14",
        description: "%bob.quests.bought.name.14",
        requiredAmount: 1,
        rewards: [
            {
                type: 0,
                name: "minecraft:iron_sword",
                amount: 1,
            },
            {
                type: 1,
                amount: 200,
            }
        ],
    },
};

export const entities = {
    "minecraft:ender_dragon": {
        id: 3,
        rarity: 3,
        name: "%bob.quests.bought.name.6",
        description: "%bob.quests.bought.desc.6",
        rewards: [
            {
                type: 0,
                name: "minecraft:netherite_ingot",
                amount: 5,
            },
            {
                type: 1,
                amount: 8000,
            }
        ],
    },
    "better_on_bedrock:inferior": {
        id: 8,
        rarity: 2,
        name: "%bob.quests.bought.name.8",
        description: "%bob.quests.bought.desc.8",
        rewards: [
            {
                type: 0,
                name: "better_on_bedrock:firey_ingot",
                amount: 2,
            },
            {
                type: 0,
                name: "better_on_bedrock:combined_elements",
                amount: 3,
            },
            {
                type: 1,
                amount: 496,
            }
        ],
    },
};

export const dimensions = {
    "minecraft:the_end": {
        id: 16,
        rarity: 3,
        name: "%bob.quests.bought.name.16",
        description: "%bob.quests.bought.desc.16",
        rewards: [
            {
                type: 0,
                name: "minecraft:ender_pearl",
                amount: 3,
            },
            {
                type: 0,
                name: "minecraft:prismarine_shard",
                amount: 5,
            },
            {
                type: 1,
                amount: 1000,
            }
        ],
    },
};

world.afterEvents.entityDie.subscribe(
    ({ damageSource, deadEntity }) => {
        if (!(damageSource.damagingEntity instanceof Player))
            return;

        if (entities[deadEntity.typeId] == undefined)
            return;

        const quest = entities[deadEntity.typeId];
        const player = damageSource.damagingEntity;
        const unlockedQuests = JSON.parse(player.getDynamicProperty("unlockedQuests"));
        const q = unlockedQuests.find((q) => q[0] == quest.id);
        const isUnlocked = q !== undefined;
        if (!isUnlocked || q[2] == 1)
            return;

        q[2] = 1;
        giveRewards(player, quest.rewards);
        player.playSound(q[1] > 1 ? "epic_quest" : "normal_quest");
        player.sendMessage([
            { text: "§a[!] " },
            { translate: "bob.message.questComplete" },
            { text: " §r§8- §r" },
            {
                translate: "bob.message.quests.completeQuest",
                with: [ quest.name ]
            },
        ]);
        player.setDynamicProperty("unlockedQuests", JSON.stringify(unlockedQuests));
    },
);

export const extras = {
    veinMiner: {
        id: 10,
        rarity: 0,
        name: "%bob.quests.bought.name.10",
        description: "%bob.quests.bought.desc.10",
        requiredAmount: 1,
        rewards: [
            {
                type: 0,
                name: "minecraft:diamond",
                amount: 3,
            },
            {
                type: 1,
                amount: 231,
            }
        ],
    },
    trophies: {
        id: 12,
        rarity: 2,
        name: "%bob.quests.bought.name.12",
        description: "%bob.quests.bought.desc.12",
        requiredAmount: 1,
        rewards: [
            {
                type: 1,
                amount: 2000,
            }
        ],
    },
    stone: {
        id: 15,
        rarity: 3,
        name: "%bob.quests.bought.name.15",
        description: "%bob.quests.bought.desc.15",
        requiredAmount: 1,
        rewards: [
            {
                type: 0,
                name: "minecraft:nether_star",
                amount: 2,
            },
            {
                type: 1,
                amount: 1000,
            }
        ],
    },
};

system.runInterval(() => {
    system.runJob(function* () {
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const container = player.getComponent(EntityInventoryComponent.componentId).container;
            for (let k = 0; k < container.size; k++) {
                const itemStack = container.getItem(k);
                if (itemStack == undefined)
                    continue;

                const lore = itemStack.getLore();
                let quest;
                if (itemStack.typeId.includes("pickaxe") && lore.includes("§r§7Vein Miner I")) {
                    quest = extras["veinMiner"];
                }
                else if (itemStack.typeId.includes("trophy")) {
                    quest = extras["trophies"];
                }
                else if (itemStack.hasTag("better_on_bedrock:nether_stone")) {
                    quest = extras["stone"];
                }
                else quest = items[itemStack.typeId];

                if (quest == undefined)
                    continue;

                const unlockedQuests = JSON.parse(player.getDynamicProperty("unlockedQuests") ?? "[]");
                let q = unlockedQuests.find((q) => q[0] == quest.id);
                const isUnlocked = q !== undefined;
                if (!isUnlocked || q[2] == 1 || quest.requiredAmount > itemStack.amount)
                    continue;

                q[2] = 1;
                yield giveRewards(player, quest.rewards);
                player.playSound(q[1] > 1 ? "epic_quest" : "normal_quest");
                player.sendMessage([
                    { text: "§a[!] " },
                    { translate: "bob.message.questComplete" },
                    { text: " §r§8- §r" },
                    {
                        translate: "bob.message.quests.completeQuest",
                        with: [ quest.name ]
                    },
                ]);
                player.setDynamicProperty("unlockedQuests", JSON.stringify(unlockedQuests));
            };
        };
    }());
}, 20);

world.afterEvents.playerDimensionChange.subscribe(
    ({ player, toDimension }) => {
        if (dimensions[toDimension.id] == undefined)
            return;

        const quest = dimensions[toDimension.id];
        const unlockedQuests = JSON.parse(player.getDynamicProperty("unlockedQuests"));
        const q = unlockedQuests.find((q) => q[0] == quest.id);
        const isUnlocked = q !== undefined;
        if (!isUnlocked || q[2] == 1)
            return;

        q[2] = 1;
        giveRewards(player, quest.rewards);
        player.playSound(q[1] > 1 ? "epic_quest" : "normal_quest");
        player.sendMessage([
            { text: "§a[!] " },
            { translate: "bob.message.questComplete" },
            { text: " §r§8- §r" },
            {
                translate: "bob.message.quests.completeQuest",
                with: [ quest.name ]
            },
        ]);
        player.setDynamicProperty("unlockedQuests", JSON.stringify(unlockedQuests));
    },
);