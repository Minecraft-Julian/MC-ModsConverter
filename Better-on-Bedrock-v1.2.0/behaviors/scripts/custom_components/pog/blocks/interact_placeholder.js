import { EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, ItemStack } from "@minecraft/server";

const plants = {
    "better_on_bedrock:rose_bush": {
        value: "rose_bush",
        sound: "dig.grass_block",
    },
    "better_on_bedrock:sunflower": {
        value: "sunflower",
        sound: "dig.gravel",
    },
    "better_on_bedrock:syringa": {
        value: "syringa",
        sound: "dig.gravel",
    },
    "better_on_bedrock:paeonia": {
        value: "paeonia",
        sound: "dig.gravel",
    },
  
    "minecraft:allium": {
        value: "allium",
        sound: "dig.gravel",
    },
    "minecraft:cornflower": {
        value: "cornflower",
        sound: "dig.gravel",
    },
    "minecraft:blue_orchid": {
        value: "flower_blue",
        sound: "dig.gravel",
    },
    "minecraft:azure_bluet": {
        value: "houstonia",
        sound: "dig.gravel",
    },
    "minecraft:lily_of_the_valley": {
        value: "lilly",
        sound: "dig.gravel",
    },
    "minecraft:orange_tulip": {
        value: "orange_tulip",
        sound: "dig.gravel",
    },
    "minecraft:poppy": {
        value: "blue_rose",
        sound: "dig.gravel",
    },
    "minecraft:oxeye_daisy": {
        value: "oxeye",
        sound: "dig.gravel",
    },
    "minecraft:red_tulip": {
        value: "red_tulip",
        sound: "dig.gravel",
    },
    "minecraft:pink_tulip": {
        value: "pink_tulip",
        sound: "dig.gravel",
    },
    "minecraft:syringa": {
        value: "syringa",
        sound: "dig.gravel",
    },
    "minecraft:white_tulip": {
        value: "white_tulip",
        sound: "dig.gravel",
    },
};

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onPlayerDestroy: ({ block, dimension, destroyedBlockPermutation }) => {
        if (destroyedBlockPermutation.type.id !== "better_on_bedrock:hanging_pot_base")
            return;

        const plantValue = destroyedBlockPermutation.getState("pog:pot_plant");
        if (plantValue === "none")
            return;

        const itemId = Object.keys(plants).find((key) => plants[key].value === plantValue);
        if (itemId === undefined)
            return;

        const itemStack = new ItemStack(itemId);
        dimension.spawnItem(itemStack, block.location);
    },
    onPlayerInteract: ({ block, dimension, player }) => {
        if (block.typeId !== "better_on_bedrock:hanging_pot_base")
            return;

        const equippable = player.getComponent(EntityEquippableComponent.componentId);
        const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
        const plantValue = block.permutation.getState("pog:pot_plant");
        if (mainhand === undefined && plantValue !== "none")
        {
            const itemId = Object.keys(plants).find((key) => plants[key].value === plantValue);
            if (itemId === undefined)
                return;

            block.setPermutation(block.permutation.withState("pog:pot_plant", "none"));
            
            const itemStack = new ItemStack(itemId);
            const inventory = player.getComponent(EntityInventoryComponent.componentId).container;
            if (inventory.emptySlotsCount == 0) {
                player.dimension.spawnItem(itemStack, player.location);
            }
            else {
                inventory.addItem(itemStack);
            };
            return;
        };
        
        if (plants[mainhand?.typeId] === undefined || plantValue !== "none")
            return;

        const plant = plants[mainhand.typeId];
        block.setPermutation(block.permutation.withState("pog:pot_plant", plant.value));
        dimension.playSound(plant.sound, block.location);

        const mainhandSlot = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (mainhandSlot.amount - 1 == 0)
            mainhandSlot.setItem(undefined);
        else {
            mainhandSlot.amount--;
        };
    },
};