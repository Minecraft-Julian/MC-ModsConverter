import { EntityEquippableComponent, EntityItemComponent, EquipmentSlot, GameMode, ItemDurabilityComponent, ItemEnchantableComponent, ItemStack } from "@minecraft/server";
const instantMineableBlocks = [
    "minecraft:azalea",
    "minecraft:flowering_azalea",
    "minecraft:beetroot",
    "minecraft:cave_vines_body_with_berries",
    "minecraft:cave_vines_head_with_berries",
    "minecraft:tube_coral",
    "minecraft:tube_coral_fan",
    "minecraft:dead_tube_coral",
    "minecraft:dead_tube_coral_fan",
    "minecraft:brain_coral",
    "minecraft:brain_coral_fan",
    "minecraft:dead_brain_coral",
    "minecraft:dead_brain_coral_fan",
    "minecraft:bubble_coral",
    "minecraft:bubble_coral_fan",
    "minecraft:dead_bubble_coral",
    "minecraft:dead_bubble_coral_fan",
    "minecraft:horn_coral",
    "minecraft:horn_coral_fan",
    "minecraft:dead_horn_coral",
    "minecraft:dead_horn_coral_fan",
    "minecraft:fire_coral",
    "minecraft:fire_coral_fan",
    "minecraft:dead_fire_coral",
    "minecraft:dead_fire_coral_fan",
    "minecraft:deadbush",
    "minecraft:decorated_pot",
    "minecraft:end_rod",
    "minecraft:fern",
    "minecraft:large_fern",
    "minecraft:short_grass_block",
    "minecraft:tall_grass_block",
    "minecraft:sunflower",
    "minecraft:poppy",
    "minecraft:blue_orchid",
    "minecraft:allium",
    "minecraft:azure_bluet",
    "minecraft:orange_tulip",
    "minecraft:pink_tulip",
    "minecraft:red_tulip",
    "minecraft:white_tulip",
    "minecraft:oxeye_daisy",
    "minecraft:cornflower",
    "minecraft:lily_of_the_valley",
    "minecraft:yellow_flower",
    "minecraft:torchflower",
    "minecraft:wither_rose",
    "minecraft:lilac",
    "minecraft:peony",
    "minecraft:pitcher_plant",
    "minecraft:rose_bush",
    "minecraft:flower_pot",
    "minecraft:frog_spawn",
    "minecraft:crimson_fungus",
    "minecraft:warped_fungus",
    "minecraft:hanging_roots",
    "minecraft:honey_block",
    "minecraft:waterlily",
    "minecraft:melon_stem",
    "minecraft:brown_mushroom",
    "minecraft:red_mushroom",
    "minecraft:nether_wart",
    "minecraft:pink_petals",
    "minecraft:potatoes",
    "minecraft:pumpkin_stem",
    "minecraft:unpowered_repeater",
    "minecraft:powered_repeater",
    "minecraft:unpowered_comparator",
    "minecraft:powered_comparator",
    "minecraft:redstone_torch",
    "minecraft:redstone_wire",
    "minecraft:crimson_roots",
    "minecraft:warped_roots",
    "minecraft:oak_sapling",
    "minecraft:spruce_sapling",
    "minecraft:birch_sapling",
    "minecraft:jungle_sapling",
    "minecraft:acacia_sapling",
    "minecraft:dark_oak_sapling",
    "minecraft:cherry_sapling",
    "minecraft:scaffolding",
    "minecraft:seagrass_block",
    "minecraft:slime",
    "minecraft:small_dripleaf",
    "minecraft:soul_torch",
    "minecraft:spore_blossom",
    "minecraft:reeds",
    "minecraft:sweet_berry_bush",
    "minecraft:tnt",
    "minecraft:torch",
    "minecraft:trip_wire",
    "minecraft:tripwire_hook",
    "minecraft:twisting_vines",
    "minecraft:weeping_vines",
    "minecraft:wheat",
    "minecraft:carrots"
];

function shouldDamageItem(level) {
    const unbreakingLevel = level ?? 0;
    return 1 / (1 + unbreakingLevel) >= Math.random();
};

function reduceDurability(entity, itemStack, damageAmount = 1) {
    const durability = itemStack.getComponent(ItemDurabilityComponent.componentId);
    const equippable = entity.getComponent(EntityEquippableComponent.componentId);
    if (durability.damage + damageAmount >= durability.maxDurability) {
        equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
        entity.dimension.playSound("random.break", entity.location);
        return;
    };

    durability.damage += damageAmount;
    equippable.setEquipment(EquipmentSlot.Mainhand, itemStack);
};

/** @type { import("@minecraft/server").ItemCustomComponent } */
export const events = {
    onBeforeDurabilityDamage: (data) => {
        if (data.durabilityDamage > 1)
            data.durabilityDamage = 1;
    },
    onMineBlock: ({ block, minedBlockPermutation, source, itemStack }) => {
        if (source.matches({ gameMode: GameMode.creative }) || itemStack == undefined)
            return;

        const enchantable = itemStack.getComponent(ItemEnchantableComponent.componentId);
        if (enchantable.hasEnchantment("silk_touch")) {
            reduceDurability(source, itemStack);
        };

        if (!enchantable.hasEnchantment("unbreaking") && !instantMineableBlocks.includes(minedBlockPermutation.type.id)) {
            reduceDurability(source, itemStack);
            return;
        };

        const unbreaking = enchantable.getEnchantment("unbreaking");
        if (unbreaking && shouldDamageItem(unbreaking.level))
            reduceDurability(source, itemStack);
    },
};