import { ActionFormData } from "@minecraft/server-ui";

import { getRewards, giveRewards } from "../util.js";
const getFormattedStatus = (status) => {
    if (status == 0) return "§8%bob.gui.bounty.status.open§r";
    else if (status == 1) return "§6%bob.gui.bounty.status.inProgress§r";
    else if (status == 2) return "§q%bob.gui.bounty.status.completed§r";
    else if (status == 3) return "§2%bob.gui.bounty.status.claimed§r";
    else if (status == 4) return "§c%bob.gui.bounty.status.locked§r";
};

const defaultBounties = [
    [ 0, 0, 0 ], // Cow
    [ 1, 0, 4 ], // Zombie
    [ 2, 0, 4 ], // Pig
    [ 3, 0, 4 ], // Sheep
    [ 4, 0, 4 ], // Ghast
    [ 5, 0, 4 ], // Phantom
    [ 6, 0, 4 ], // Deer
    [ 7, 0, 4 ], // Spider
    [ 8, 0, 4 ], // Skeleton
    [ 9, 0, 4 ], // Blaze
    [ 10, 0, 4 ], // Piglin
    [ 11, 0, 4 ], // Vex
    [ 12, 0, 4 ], // Enderman
    [ 13, 0, 4 ], // Vindicator
    [ 14, 0, 4 ], // Witch
    [ 15, 0, 4 ], // Evoker
    [ 16, 0, 4, ], // Ravager
    
    [ 17, 0, 4 ], // Willager
    [ 18, 0, 4 ], // Flender
    [ 19, 0, 4 ], // Enchanter
];

export const bounties = [
    {
        id: 0,
        name: "%bob.bounty.name.1",
        description: "bob.bounty.desc.1",
        entity: "minecraft:cow",
        amount: 3,
        rewards: [
            {
                type: 0,
                name: "minecraft:coal",
                amount: 24,
            },
            {
                type: 1,
                amount: 20,
            }
        ],
    },
    {
        id: 1,
        name: "%bob.bounty.name.2",
        description: "bob.bounty.desc.2",
        entity: "minecraft:zombie",
        amount: 8,
        rewards: [
            {
                type: 0,
                name: "minecraft:iron_ingot",
                amount: 3,
            },
            {
                type: 1,
                amount: 20,
            }
        ],
    },
    {
        id: 2,
        name: "%bob.bounty.name.3",
        description: "bob.bounty.desc.3",
        entity: "minecraft:pig",
        amount: 6,
        rewards: [
            {
                type: 0,
                name: "minecraft:carrot",
                amount: 8,
            },
            {
                type: 1,
                amount: 25,
            }
        ],
    },
    {
        id: 3,
        name: "%bob.bounty.name.4",
        description: "bob.bounty.desc.4",
        entities: [
            "minecraft:sheep",
            "better_on_bedrock:horned_sheep",
            "better_on_bedrock:dotted_sheep"
        ],
        amount: 6,
        rewards: [
            {
                type: 0,
                name: "minecraft:wheat",
                amount: 4,
            },
            {
                type: 1,
                amount: 35,
            }
        ],
    },
    {
        id: 4,
        name: "%bob.bounty.name.5",
        description: "bob.bounty.desc.5",
        entity: "minecraft:ghast",
        amount: 6,
        rewards: [
            {
                type: 0,
                name: "minecraft:iron_ingot",
                amount: 8,
            },
            {
                type: 1,
                amount: 50,
            }
        ],
    },
    {
        id: 5,
        name: "%bob.bounty.name.6",
        description: "bob.bounty.desc.6",
        entity: "minecraft:phantom",
        amount: 12,
        rewards: [
            {
                type: 0,
                name: "minecraft:arrow",
                amount: 16,
            },
            {
                type: 1,
                amount: 45,
            }
        ],
    },
    {
        id: 6,
        name: "%bob.bounty.name.7",
        description: "bob.bounty.desc.7",
        entity: "better_on_bedrock:deer",
        amount: 5,
        rewards: [
            {
                type: 0,
                name: "minecraft:cooked_beef",
                amount: 8,
            },
            {
                type: 1,
                amount: 35,
            }
        ],
    },
    {
        id: 7,
        name: "%bob.bounty.name.8",
        description: "bob.bounty.desc.8",
        entity: "minecraft:spider",
        amount: 5,
        rewards: [
            {
                type: 0,
                name: "minecraft:string",
                amount: 8,
            },
            {
                type: 1,
                amount: 25,
            }
        ],
    },
    {
        id: 8,
        name: "%bob.bounty.name.9",
        description: "bob.bounty.desc.9",
        entity: "minecraft:skeleton",
        amount: 5,
        rewards: [
            {
                type: 0,
                name: "minecraft:bone",
                amount: 6,
            },
            {
                type: 1,
                amount: 25,
            }
        ],
    },
    {
        id: 9,
        name: "%bob.bounty.name.10",
        description: "bob.bounty.desc.10",
        entity: "minecraft:blaze",
        amount: 13,
        rewards: [
            {
                type: 0,
                name: "minecraft:flint_and_steel",
                amount: 1,
            },
            {
                type: 1,
                amount: 25,
            }
        ],
    },
    {
        id: 10,
        name: "%bob.bounty.name.11",
        description: "bob.bounty.desc.11",
        entity: "minecraft:piglin_brute",
        amount: 7,
        rewards: [
            {
                type: 0,
                name: "minecraft:iron_sword",
                amount: 1,
            },
            {
                type: 1,
                amount: 50,
            }
        ],
    },
    {
        id: 11,
        name: "%bob.bounty.name.12",
        description: "bob.bounty.desc.12",
        entity: "minecraft:vex",
        amount: 5,
        rewards: [
            {
                type: 1,
                amount: 50,
            }
        ],
    },
    {
        id: 12,
        name: "%bob.bounty.name.13",
        description: "bob.bounty.desc.13",
        entity: "minecraft:enderman",
        amount: 16,
        rewards: [
            {
                type: 0,
                name: "minecraft:diamond",
                amount: 3,
            },
            {
                type: 1,
                amount: 65,
            }
        ],
    },
    {
        id: 13,
        name: "%bob.bounty.name.14",
        description: "bob.bounty.desc.14",
        entity: "minecraft:vindicator",
        amount: 4,
        rewards: [
            {
                type: 0,
                name: "minecraft:golden_apple",
                amount: 2,
            },
            {
                type: 1,
                amount: 25,
            }
        ],
    },
    {
        id: 14,
        name: "%bob.bounty.name.15",
        description: "bob.bounty.desc.15",
        entity: "minecraft:witch",
        amount: 5,
        rewards: [
            {
                type: 0,
                name: "minecraft:bucket",
                amount: 1,
            },
            {
                type: 1,
                amount: 35,
            }
        ],
    },
    {
        id: 15,
        name: "%bob.bounty.name.16",
        description: "bob.bounty.desc.16",
        entity: "minecraft:evocation_illager",
        amount: 10,
        rewards: [
            {
                type: 0,
                name: "minecraft:cobblestone",
                amount: 16,
            },
            {
                type: 1,
                amount: 25,
            }
        ],
    },
    {
        id: 16,
        name: "%bob.bounty.name.17",
        description: "bob.bounty.desc.17",
        entity: "minecraft:ravager",
        amount: 4,
        rewards: [
            {
                type: 0,
                name: "minecraft:golden_apple",
                amount: 2,
            },
            {
                type: 1,
                amount: 45,
            }
        ],
    },

    {
        id: 17,
        name: "%bob.bounty.name.18",
        description: "bob.bounty.desc.18",
        entity: "better_on_bedrock:willager",
        amount: 1,
        rewards: [
            {
                type: 0,
                name: "minecraft:totem_of_undying",
                amount: 1,
            },
            {
                type: 1,
                amount: 100,
            }
        ],
    },
    {
        id: 18,
        name: "%bob.bounty.name.19",
        description: "bob.bounty.desc.19",
        entity: "better_on_bedrock:flender",
        amount: 1,
        rewards: [
            {
                type: 0,
                name: "minecraft:golden_apple",
                amount: 2,
            },
            {
                type: 1,
                amount: 125,
            }
        ],
    },
    {
        id: 19,
        name: "%bob.bounty.name.20",
        description: "bob.bounty.desc.20",
        entity: "better_on_bedrock:enchantaegis",
        amount: 1,
        rewards: [
            {
                type: 0,
                name: "minecraft:enchanted_golden_apple",
                amount: 1,
            },
            {
                type: 1,
                amount: 150,
            }
        ],
    },
];

const functions = {
    about: (player, bounty) => {
        let savedBounties = JSON.parse(player.getDynamicProperty("bounties") ?? "[]");
        const quest = savedBounties.find((b) => b[0] == bounty.id);

        const form = new ActionFormData();
        form.title(bounty.name);
        form.body({ rawtext: [
            { translate: bounty.description, with: [ bounty.amount.toString() ] },
            { text: "\n\n§e§l" },
            { translate: "bob.gui.progress", with: [ quest[1].toString(), bounty.amount.toString() ] },
            { text: "§r\n§e§l%bob.gui.rewards§r\n" },
            ...getRewards(bounty.rewards),
        ] });
        //form.body({ translate: bounty.description + "\n\n§e§l%bob.gui.rewards§r\n" + getRewards(bounty.rewards) });
        form.button("§c< %gui.goBack§r");
        form.show(player).then(() => bountyPage(player));
    },
    start: (player, bounty) => {
        const savedBounties = JSON.parse(player.getDynamicProperty("bounties"));
        const form = new ActionFormData();
        form.title(bounty.name);
        form.body({ rawtext: [
            { translate: bounty.description, with: [ bounty.amount.toString() ] },
            { text: "\n\n§e§l%bob.gui.rewards§r\n" },
            ...getRewards(bounty.rewards),
        ] });
        //form.body({ translate: bounty.description + "\n\n§e§l%bob.gui.rewards§r\n" + getRewards(bounty.rewards) });
        form.button({ translate: "%bob.gui.startHunt" });
        form.button("§c< %gui.goBack§r");
        form.show(player).then(
            (response) => {
                switch (response?.selection) {
                    case 0: {
                        if (savedBounties.find((b) => b[2] == 1)) {
                            player.sendMessage([
                                { text: "§c[!] §r" },
                                { translate: "bob.message.bounty.alreadyStarted" },
                            ]);
                            return;
                        };

                        player.sendMessage([
                            { text: "§a[!] §r" },
                            { translate: "bob.message.bounty.accepted" },
                        ]);
                        savedBounties.find((b) => b[0] == bounty.id)[2] = 1;
                        player.setDynamicProperty(
                            "bounties",
                            JSON.stringify(savedBounties),
                        );
                        break;
                    };
                    case 1: bountyPage(player); break;
                };
            },
        );
    },
    claim: (player, bounty) => {
        const savedBounties = JSON.parse(player.getDynamicProperty("bounties"));
        const form = new ActionFormData();
        form.title(bounty.name);
        form.body({ rawtext: [
            { text: "%bob.gui.bounty.completed\n\n§e§l%bob.gui.rewards§r\n" },
            ...getRewards(bounty.rewards),
        ] });
        //form.body({ translate: "%bob.gui.bounty.completed\n\n§e§l%bob.gui.rewards§r\n" + getRewards(bounty.rewards) });
        form.button("§a%bob.gui.claim§r");
        form.button("§c< %gui.goBack§r");
        form.show(player).then(
            (response) => {
                switch (response?.selection) {
                    case 0: {
                        const savedBounty = savedBounties.find((b) => b[0] == bounty.id);
                        const b = bounties.find((b) => b.id == bounty.id);
                        if (savedBounty[2] != 3) {
                            giveRewards(player, b.rewards);

                            savedBounty[2] = 3; // Claimed
                            player.setDynamicProperty(
                                "bounties",
                                JSON.stringify(savedBounties),
                            );
                        };
                        
                        bountyPage(player);
                        break;
                    };
                    case 1: bountyPage(player); break;
                };
            },
        );
    },
};

const bountyPage = (player) => {
    let savedBounties = JSON.parse(player.getDynamicProperty("bounties") ?? "[]");
    for (const savedBounty of savedBounties) {
        if (!bounties.find((q) => q.id == savedBounty[0])) {
            savedBounties = savedBounties.filter((q) => q[0] != savedBounty[0]);
        };
    };

    player.setDynamicProperty(
        "bounties",
        JSON.stringify(savedBounties),
    );

    const form = new ActionFormData();
    form.title("§u%bob.gui.bounty.title§r");
    form.body("%bob.gui.bounty.desc.1\n%bob.gui.bounty.desc.2");

    const buttons = [];
    for (const questO of bounties) {
        const quest = savedBounties.find((b) => b[0] == questO.id);
        if (quest[2] === 3)
            continue;

        const questStatus = getFormattedStatus(quest[2]);
        form.button(questO.name + " - " + questStatus, questO.icon);
        buttons.push(quest);
    };

    for (const questO of bounties) {
        const quest = savedBounties.find((b) => b[0] == questO.id);
        if (quest[2] !== 3)
            continue;

        const questStatus = getFormattedStatus(quest[2]);
        form.button(questO.name + " - " + questStatus, questO.icon);
        buttons.push(quest);
    };

    form.button("§c< %gui.goBack§r");
    form.show(player).then(
        (response) => {
            if (response.canceled) return;

            if (response.selection === bounties.length) {
                bountiesScreen(player);
                return;
            };

            const bounty = buttons[response.selection];
            const b = bounties.find((b) => b.id == bounty[0]);

            if (bounty[2] == 0)
                functions.start(player, b);
            else if (bounty[2] == 1)
                functions.about(player, b);
            else if (bounty[2] == 2)
                functions.claim(player, b);
            else if (bounty[2] == 3) {
                player.sendMessage([
                    { text: "§c[!] §r" },
                    { translate: "bob.message.bounty.alreadyClaimed" },
                ]);
            }
            else if (bounty[2] == 4) {
                player.sendMessage([
                    { text: "§c[!] §r" },
                    { translate: "bob.message.bounty.locked" },
                ]);
            };
        },
    );
};

export function bountiesScreen(player) {
    if (!player.getDynamicProperty("bounties")) {
        player.setDynamicProperty("bounties", JSON.stringify(defaultBounties));
    };

    new ActionFormData()
    .title({ translate: "bob.gui.bounty.title" })
    .button({ translate: "bob.gui.available" })
    .button("§q> %bob.gui.claimAll§r")

    .show(player).then(
        (response) => {
            if (response.canceled)
                return;

            switch (response.selection) {
                case 0: bountyPage(player); break;
                case 1: {
                    let savedBounties = JSON.parse(player.getDynamicProperty("bounties") ?? "[]");
                    const unclaimedBounties = savedBounties.filter((b) => b[2] == 2);
                    if (unclaimedBounties.length === 0) {
                        player.sendMessage([
                            { text: "§c[!] §r" },
                            { translate: "bob.message.bounty.zeroCompleted" },
                        ]);
                        return;
                    };

                    for (let bounty of unclaimedBounties) {
                        const b = bounties.find((b) => b.id == bounty[0]);
                        giveRewards(player, b.rewards);
    
                        bounty[2] = 3; // Claimed
                        player.setDynamicProperty(
                            "bounties",
                            JSON.stringify(savedBounties),
                        );
                    };
    
                    player.sendMessage([
                        { text: "§a[!] §r" },
                        { translate: "bob.message.bounty.claimedAll" },
                    ]);
                    break;
                };
            };
        },
    );
};