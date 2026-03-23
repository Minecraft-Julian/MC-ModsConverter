import { world, system, EquipmentSlot } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

import { mainScreen } from "../main.js";
import { createDistribution, randomItem, getRewards } from "../util.js";
import { items, entities, dimensions, extras } from "./behavior.js";
const rarities = {
	0: "§8%bob.gui.quests.bought.rarity.common§r",
	1: "§a%bob.gui.quests.bought.rarity.uncommon§r",
	2: "§u%bob.gui.quests.bought.rarity.rare§r",
	3: "§6%bob.gui.quests.bought.rarity.legendary§r",
};

const quests = [];
for (let key in items)
    quests.push(items[key]);
for (let key in entities)
    quests.push(entities[key]);
for (let key in dimensions)
    quests.push(dimensions[key]);
for (let key in extras)
    quests.push(extras[key]);

function getIcon(rarity) {
    let icon;
    switch (rarity) {
        case 1: icon = "textures/ui/icons/acquired_quests/uncommon"; break;
        case 2: icon = "textures/ui/icons/acquired_quests/rare"; break;
        case 3: icon = "textures/ui/icons/acquired_quests/legendary"; break;
        default: icon = "textures/ui/icons/acquired_quests/common"; break;
    };

    return icon;
};

/** @param { import("@minecraft/server").Player } player */
export function boughtScreen(player, ui = -1) {
    const unlockedQuests = JSON.parse(player.getDynamicProperty("unlockedQuests"));
	const form = new ActionFormData();
	form.title("§q%bob.gui.quests.bought.title§r");

    quests.sort((a, b) => a.rarity - b.rarity);
    let buttons = [];
    switch (ui) {
        case -1:
            form.button({ translate: "bob.gui.unlocked" });
            form.button({ translate: "bob.gui.available" });
            form.button({ translate: "bob.gui.completed" });
        break;
        case 0: {
            for (const quest of quests) {
                const rarityUnlockedQuests = unlockedQuests.filter((q) => q[1] == quest.rarity);
        
                const isUnlocked = rarityUnlockedQuests.find((q) => q[0] == quest.id && q[1] == quest.rarity) !== undefined;
                const isCompleted = unlockedQuests.find((q) => q[0] == quest.id && q[2] == 1) !== undefined;
                
                if (!isUnlocked || isCompleted)
                    continue;
        
                const name = /*quest.name.length > 16 ? quest.name.slice(0, 13).concat("...") :*/ quest.name;
                form.button(name + " - " + rarities[quest.rarity], getIcon(quest.rarity));
                buttons.push({ quest, isUnlocked, isCompleted });
            };
            break;
        };
        case 1: {
            for (const quest of quests) {
                const rarityUnlockedQuests = unlockedQuests.filter((q) => q[1] == quest.rarity);
        
                const isUnlocked = rarityUnlockedQuests.find((q) => q[0] == quest.id && q[1] == quest.rarity) !== undefined;
                const isCompleted = unlockedQuests.find((q) => q[0] == quest.id && q[2] == 1) !== undefined;
                
                if (isUnlocked || isCompleted)
                    continue;
        
                const name = /*quest.name.length > 16 ? quest.name.slice(0, 13).concat("...") :*/ quest.name;
                form.button(name + " - " + rarities[quest.rarity] + "\n§c[Locked]", getIcon(quest.rarity));
                buttons.push({ quest, isUnlocked, isCompleted });
            };
            break;
        };
        case 2: {
            for (const quest of quests) {
                const rarityUnlockedQuests = unlockedQuests.filter((q) => q[1] == quest.rarity);
        
                const isUnlocked = rarityUnlockedQuests.find((q) => q[0] == quest.id && q[1] == quest.rarity) !== undefined;
                const isCompleted = unlockedQuests.find((q) => q[0] == quest.id && q[2] == 1) !== undefined;
                
                if (!isCompleted)
                    continue;
        
                const name = /*quest.name.length > 16 ? quest.name.slice(0, 13).concat("...") :*/ quest.name;
                form.button(name + " - " + rarities[quest.rarity] + "\n§a§l[Done]", getIcon(quest.rarity));
                buttons.push({ quest, isUnlocked, isCompleted });
            };
            break;
        };
    };

    if (ui !== -1 && buttons.length == 0)
        form.body({ translate: "bob.gui.nothing" });

	form.button("§c< %gui.goBack§r");
	form.show(player).then((response) => {
		if (response.canceled)
            return;

		if (ui === -1) {
            if (response.selection == 3) {
                mainScreen(player);
            } else boughtScreen(player, response.selection);
            return;
        }
        else if (response.selection == buttons.length) {
            boughtScreen(player);
            return;
        };
        
        const quest = buttons[response.selection];
        if (!quest.isUnlocked) {
            player.sendMessage([
                { text: "§c[!] §r" },
                { translate: "bob.message.quests.bought.locked" },
            ]);
            return;
        };

        new ActionFormData()
        .title(quest.quest.name)
        .body({ rawtext: [
            { text: quest.quest.description + "\n\n§e§l%bob.gui.rewards§r\n" },
            ...getRewards(quest.quest.rewards),
        ] })
        //.body({ translate: quest.quest.description + "\n\n§e§l%bob.gui.rewards§r\n" + getRewards(quest.quest.rewards) })
        .button("§c< %gui.goBack§r")
        .show(player).then((response) => {
            if (response.canceled)
                return;

            boughtScreen(player, ui);
        });
    });
};

system.runInterval(() => {
	system.runJob(function* () {
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (player.getDynamicProperty("unlockedQuests") == undefined) {
                player.setDynamicProperty("unlockedQuests", JSON.stringify([]));
            };

            const inventory = player.getComponent("inventory").container;
            for (let i = 0; i < inventory.size; i++) {
                const item = inventory.getItem(i);
                if (item?.typeId !== "better_on_bedrock:bought_quest") continue;
                if (item.getLore().length > 0) continue;

                const rarities = [0, 1, 2, 3]; // 0 = Common, 1 = Uncommon, 2 = Rare, 3 = Legendary
                const weights = [0.45, 0.3, 0.125, 0.125];
                const distribution = createDistribution(weights);
                const rarity = randomItem(rarities, distribution);
                const rarityQuests = quests.filter((q) => q.rarity == rarity);
                const data = {
                    rarity,
                    quest: rarityQuests[Math.floor(Math.random() * rarityQuests.length)].id,
                };

                item.setLore([JSON.stringify(data)]);
                yield inventory.setItem(i, item);
            };
        };
    }());
}, 20);

world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
	if (itemStack.typeId !== "better_on_bedrock:bought_quest" || !itemStack.getLore().length)
        return;
	
    const data = JSON.parse(itemStack.getLore());
	const quest = quests.find((q) => q.id == data.quest && q.rarity == data.rarity);
	if (!quest)
        return;

	const unlockedQuests = JSON.parse(player.getDynamicProperty("unlockedQuests"));
	const isUnlocked = unlockedQuests.find((q) => q[0] == quest.id && q[1] == quest.rarity) !== undefined;

	if (isUnlocked) {
		player.sendMessage([
            { text: "§c[!] §r" },
            { translate: "bob.message.quests.bought.alreadyUnlocked" },
        ]);
		player.addExperience(50)
		player.getComponent("equippable").setEquipment(EquipmentSlot.Mainhand);
		return;
	};

	unlockedQuests.push([ quest.id, quest.rarity, 0 ]);
	player.setDynamicProperty("unlockedQuests", JSON.stringify(unlockedQuests));

	player.sendMessage([
        { text: "§a[!] " },
        { translate: "bob.message.questComplete" },
        { text: " §r§8- §r" },
        {
            translate: "bob.message.quests.bought.unlocked",
            with: [
                quest.name,
                rarities[quest.rarity],
            ],
        },
    ]);
	player.getComponent("equippable").setEquipment(EquipmentSlot.Mainhand);
});