import { ItemStack } from "@minecraft/server";
import { blocks } from "../main";
import { translations } from "./utils/translations";
import { enchantments as entityEnchantments } from "./utils/entity-enchants";

const crops = {
    "minecraft:cocoa": 3,
    "minecraft:wheat": 7,
    "minecraft:potatoes": 7,
    "minecraft:carrots": 7,
    "minecraft:beetroot": 7,
    "minecraft:pitcher_crop": 4,
    "minecraft:torchflower_crop": 7,
    "minecraft:pumpkin_stem": 7,
    "minecraft:melon_stem": 7,
    "minecraft:sweet_berry_bush": 3,
    "better_on_bedrock:tomato_crop": 2,
    "better_on_bedrock:barley_crop": 3,
    "better_on_bedrock:cabbage_crop": 4,
    "better_on_bedrock:onion_crop": 3,
    "better_on_bedrock:grape": 3,
    "better_on_bedrock:blueberry_block": 3,
    "better_on_bedrock:eggplant_crop": 2,
};

const maxDistance = 7.5;
function getIdentifier(id) {
    const name = id.split(":")[0];
    return name
        .replaceAll("_", " ")
        .replace(/(\b[a-z](?!\s))/g, (x) => x.toUpperCase());
};

function healthToText(currentHealth, maxHealth, split) {
    if (!maxHealth) return;
    if (maxHealth <= 40) {
        const max = Math.ceil(maxHealth / 2);
        const health = Math.floor(currentHealth / 2);
        const half = currentHealth % 2 === 1 && health < max;
        const empty = max - health - (half ? 1 : 0);
        const hearts = "".repeat(health).concat(half ? "" : "").concat("".repeat(empty));

        return splitHearts(hearts, split);
    }
    else return "§7%bob.gui.wawla.health:  ".concat(currentHealth, " / ", maxHealth);
};

function splitHearts(string, split = 10) {
    let result = "";
    for (let i = 0; i < string.length; i += split) {
        result += string.substr(i, split).concat("\n");
    };

    const data = result.split("\n");
    return data.filter((item) => item.trim().length != 0).join("\n");
};

/** @param { import("@minecraft/server").Player } player */
export function wawla(player) {
    const entity = player.getEntitiesFromViewDirection({
        maxDistance,
        excludeFamilies: ["wawla"]
    })[0]?.entity;
    if (entity !== undefined && entity.isValid()) {
        if (entity.hasComponent("minecraft:item")) {
            /** @type { ItemStack } */
            const itemStack = entity.getComponent("minecraft:item").itemStack;
            const isBlock = blocks.includes(itemStack.typeId);
            const hasMinecraftNamespace = itemStack.typeId.split(":")[0] === "minecraft";
            const identifier = hasMinecraftNamespace ? itemStack.typeId.split(":")[1] : itemStack.typeId;

            const name =
                translations.blocks[itemStack.typeId]
                || translations.items[itemStack.typeId]
                || (isBlock ? "tile." : "item.").concat(identifier).concat(".name");

            player.onScreenDisplay.setActionBar([
                { text: "wawla;§r" },
                {
                    translate: name/*(isBlock ? "tile." : "item.")
                        .concat(hasMinecraftNamespace ? itemStack.typeId.split(":")[1] : itemStack.typeId)
                        .concat(itemStack.hasComponent("minecraft:food") ? "" : ".name")*/
                },
                {
                    text: " §7x".concat(itemStack.amount)
                },
                {
                    translate: itemStack.nameTag !== undefined ?
                        "\n§7%bob.gui.wawla.displayName: ".concat(itemStack.nameTag)
                        : null
                },
                {
                    text: "\n§9§o".concat(getIdentifier(itemStack.typeId))
                }
            ]);

            return;
        };

        const hasMinecraftNamespace = entity.typeId.split(":")[0] === "minecraft";
        const health = entity.getComponent("minecraft:health");
        const maxFloat = 3.4028234663852886e+38;

        const isEnchanted = entity.getProperty("better_on_bedrock:enchanted") == true;
        let enchantmentType;
        if (isEnchanted) {
            const type = entity.getProperty("better_on_bedrock:enchantment_type");
            if (type !== void 0) {
                enchantmentType = entityEnchantments[type];
                if (type !== "none") {
                    const level = entity.getProperty("better_on_bedrock:enchantment_level");
                    enchantmentType = enchantmentType.concat(" %enchantment.level.", level);
                };
            };
        };

        player.onScreenDisplay.setActionBar([
            { text: "wawla;§r" },
            {
                translate: entity.hasComponent("minecraft:is_baby") ? "§7".concat("%bob.gui.wawla.isBaby", "§r ") : null
            },
            {
                translate: entity.typeId == "minecraft:player" ?
                    "entity.player.name" : ("entity."
                        .concat(hasMinecraftNamespace ? entity.typeId.split(":")[1] : entity.typeId)
                        .concat(".name")
                    )
            },
            {
                translate: entity.typeId == "minecraft:player" ? "\n§7%bob.gui.wawla.displayName: ".concat(entity.name) : null
            },
            {
                translate: entity.typeId !== "minecraft:player" && entity.nameTag.trim().length !== 0 ?
                    "\n§7%bob.gui.wawla.nameTag: ".concat(entity.nameTag) : null
            },
            {
                translate: entity.hasComponent("minecraft:tameable") ?
                    "\n§7%bob.gui.wawla.tameChance: ".concat(entity.getComponent("minecraft:tameable").probability.toFixed(2) * 100).concat("%") : null
            },
            {
                translate: enchantmentType !== void 0 ?
                    "\n§7%bob.gui.wawla.enchantmentType: ".concat(enchantmentType) : null
            },
            {
                translate: entity.hasComponent("minecraft:health") && health?.effectiveMax !== maxFloat
                    ? "\n".concat(healthToText(Math.round(health.currentValue), health.effectiveMax,
                        enchantmentType !== void 0 ? 15 : void 0))
                    : null
            },
            {
                text: "\n§9§o".concat(getIdentifier(entity.typeId))
            }
        ]);
    }
    else {
        const block = player.getBlockFromViewDirection({ maxDistance })?.block;
        if (block === undefined || !block.isValid())
            return;

        const toolInfo = getTool(block);

        const hasMinecraftNamespace = block.typeId.split(":")[0] === "minecraft";
        const identifier = hasMinecraftNamespace ? block.typeId.split(":")[1] : block.typeId;
        const name =
            translations.blocks[block.typeId]
            || translations.items[block.typeId]
            || "tile.".concat(identifier).concat(".name");

        //const namePart = block.typeId.split(":")[1].split(/\.+/)[0];
        //const blockName = translations.blocks[block.typeId] || "tile.".concat(block.typeId);// || namePart.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
        
        const honeyLevel = block.permutation.getState("honey_level");
        const compostLevel = block.permutation.getState("composter_fill_level");

        let growth;
        let fullyGrown = false;
        if (crops[block.typeId] !== undefined) {
            const maxGrowth = crops[block.typeId];
            const currentGrowth = ((
                block.permutation.getState("growth")
                || block.permutation.getState("age")
                || block.permutation.getState("better_on_bedrock:growth_stage")
            ) ?? 0) / maxGrowth;
            const percentage = Math.round((currentGrowth !== 0 ? Number(currentGrowth.toFixed(2)) : 0) * 100);
            fullyGrown = percentage == 100;
            growth = fullyGrown ?
                "§a%bob.gui.wawla.isGrown" : percentage.toString();
        };

        player.onScreenDisplay.setActionBar([
            { text: "wawla;§r" },
            {
                translate: name
            },
            {
                rawtext: growth !== undefined ? [
                    { translate: "\n§7%bob.gui.wawla.growth: ".concat(growth) },
                    { text: fullyGrown == false ? "%%" : null },
                ] : null
            },
            {
                translate: honeyLevel > 0 ? "\n§7%bob.gui.wawla.honey: ".concat(honeyLevel) : null
            },
            {
                translate: compostLevel > 0 ? "\n§7%bob.gui.wawla.compostLevel: ".concat(compostLevel).concat("/8") : null
            },
            {
                translate: toolInfo.tool !== undefined ?
                    "\n§7%bob.gui.wawla.correctTool: §3".concat(toolInfo.tool)
                        .concat("\n§7%bob.gui.wawla.canHarvest: ").concat(toolInfo.farmable ? "§a%gui.yes" : "§c%gui.no")
                    : null
            },
            {
                text: "\n§9§o".concat(getIdentifier(block.typeId))
            }
        ]);
    };
};

/** @param { import("@minecraft/server").Block } block */
function getTool(block) {
    let tool;
    let farmable = false;
    if (!block.isValid())
        return { tool, farmable };

    if (
        block.typeId != "minecraft:redstone_wire"
        && (
            block.typeId.includes("brick")
            || block.typeId.includes("spawner")
            || block.typeId.includes("lantern")
            || (block.typeId.includes("_wall") && !block.typeId.includes("wall_sign"))
            || block.typeId.includes("ore")
            || block.typeId.includes("stone")
            || block.typeId.includes("deepslate")
            || block.hasTag("metal")
            || block.hasTag("stone")
            || block.hasTag("diamond_pick_diggable")
        )
    ) tool = "%bob.gui.wawla.tool.pickaxe";
    else if (
        block.typeId.includes("log")
        || block.typeId.includes("chest")
        || block.typeId.includes("table")
        || block.typeId.includes("book")
        || block.typeId.includes("wall_banner")
        || block.typeId.includes("planks")
        || block.typeId.includes("fence")
        || block.typeId.includes("nut")
        || (
            block.typeId.includes("pumpkin")
            && !block.typeId.includes("stem")
        )
        || (
            block.typeId.includes("melon")
            && !block.typeId.includes("stem")
        )
        || block.hasTag("log")
        || block.hasTag("wood")
    ) tool = "%bob.gui.wawla.tool.axe";
    else if (
        block.typeId.includes("farm")
        || block.typeId.includes("dirt")
        || block.typeId.includes("path")
        || block.typeId.includes("podzol")
        || block.hasTag("dirt")
        || block.hasTag("grass_block")
    ) tool = "%bob.gui.wawla.tool.shovel";
    else if (
        block.typeId.includes("crop")
        || block.typeId.includes("grape")
        || block.typeId.includes("bush")
        || block.typeId.includes("wild")
        || block.typeId.includes("flower")
        || block.typeId.includes("stem")
        || block.hasTag("minecraft:crop")
    ) tool = "%gui.all";
    else if (
        block.typeId.includes("leaves")
        || block.typeId.includes("vine")
        || block.typeId.includes("grass_block")
        || block.typeId.includes("root")
        || block.typeId.includes("plant")
        || block.typeId.includes("flender")
    ) tool = "%item.shears.name", farmable = true;
    else if (block.typeId.includes("wool"))
        tool = "%item.shears.name";
    else if (block.typeId.includes("hat"))
        tool = "%bob.gui.wawla.tool.hand";

    return { tool, farmable };
};