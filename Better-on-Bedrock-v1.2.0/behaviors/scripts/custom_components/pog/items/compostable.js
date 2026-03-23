function incrementValue(block, itemStack) {
    const currentLevel = block.permutation.getState("composter_fill_level");
    const tiers = {
        lowTier: { chance: 0.3, tag: "pog:compost_low" },
        medLowTier: { chance: 0.5, tag: "pog:compost_medlow" },
        mediumTier: { chance: 0.65, tag: "pog:compost_medium" },
        highTier: { chance: 0.85, tag: "pog:compost_high" },
        mythicTier: { chance: 1, tag: "pog:compost_mythic" },
    };

    const chanceToIncrease = Object.entries(tiers).find(([tierName, tier]) =>
        itemStack.getTags().includes(tier.tag))?.chance ?? tiers.lowTier.chance;

    const newValue = Math.min(currentLevel + (Math.random() < chanceToIncrease ? 1 : 0), 7);
    if (currentLevel <= 7) {
        block.setPermutation(BlockPermutation.resolve("composter").withState("composter_fill_level", newValue));
    };

    if (newValue > currentLevel)
        block.dimension.playSound("block.composter.fill_success", block.location);
    else
        block.dimension.playSound("block.composter.fill", block.location);
    return newValue > currentLevel;
};

/** @type { import("@minecraft/server").ItemCustomComponent } */
export const events = {
    onUseOn: ({ block, itemStack, source, usedOnBlockPermutation }) => {
        if (!itemStack.hasTag("pog:compostable"))
            return;

        const { x, y, z } = block.location;
        const fillLevel = usedOnBlockPermutation.getState("composter_fill_level");
        if (fillLevel === undefined)
            return;
        
        if (fillLevel <= 6) {
            source.runCommandAsync(`clear @s ${itemStack.typeId} 0 1`);
            block.dimension.spawnParticle("better_on_bedrock:composter_insert_success", {
                x: x + 0.5,
                y: y + 0.5,
                z: z + 0.5
            });
            
            incrementValue(block, itemStack);
        }
        else {
            source.dimension.runCommand(`setblock ${x} ${y} ${z} air [] destroy`);
            block.dimension.playSound("block.composter.fill_success", block.location);
            block.dimension.getEntities({ type: "minecraft:item", name: "composter" })
            .forEach((entity) => entity.kill());
        };
    },
};