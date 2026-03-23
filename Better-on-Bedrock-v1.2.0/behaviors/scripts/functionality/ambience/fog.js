import { world, system, Player, MinecraftDimensionTypes } from "@minecraft/server";

const END_FOG_TAGS = [
    "void",
    "vacant",
    "chorus",
    "abyssal",
    "wastes",
    "shroom"
];

/**
 * Replaces the fog tag on a player.
 * @param {Player} player The player to set the fog tag on.
 * @param {string} tag The unique fog tag to give the player.
 */
function SetFogTag(player, tag) {
    for (const fogTag of END_FOG_TAGS)
        player.removeTag(fogTag);
    player.runCommand("fog @p remove bob:end_fog")
    player.addTag(tag);
}

const theEnd = world.getDimension(MinecraftDimensionTypes.theEnd);

system.runInterval(() => {
    system.runJob(function* () {   
        for (const player of theEnd.getPlayers({tags: ["endFog"]})) {
            const floorBlock = theEnd.getBlockFromRay({x: player.location.x, y: player.location.y + 1, z: player.location.z}, {x: 0, y: -1, z: 0})?.block;
            if (floorBlock === undefined) continue;
            if (floorBlock.typeId == 'better_on_bedrock:shrub_nylium' && !player.hasTag('vacant')) {
                player.runCommand("fog @p remove bob:end_fog")
                player.runCommand("fog @p push pog:vacant_dusk bob:end_fog")
                player.playMusic("ambient.vacant", { volume: 1, fade: 1, loop: true })
                //SetFogTag(player, "vacant");
            }
            if (floorBlock.typeId == 'better_on_bedrock:void_grass' && !player.hasTag('void')) {
                player.runCommand("fog @p remove bob:end_fog")
                player.runCommand("fog @p push pog:voiding_plains bob:end_fog")
                player.playMusic("ambient.voiding_plains", { volume: 1, fade: 1, loop: true })
                //SetFogTag(player, "void");
            }
            if (floorBlock.typeId == 'better_on_bedrock:shroom_nylium' && !player.hasTag('shroom')) {
                player.runCommand("fog @p remove bob:end_fog")
                player.runCommand("fog @p push pog:fungal_grove bob:end_fog")
                player.playMusic("ambient.fungal_grove", { volume: 1, fade: 1, loop: true })
                //SetFogTag(player, "shroom");
            }
            if (floorBlock.typeId == 'better_on_bedrock:fall_nylium' && !player.hasTag('abyssal')) {
                player.runCommand("fog @p remove bob:end_fog")
                player.runCommand("fog @p push pog:voided_abyssal bob:end_fog")
                player.playMusic("ambient.voided_abyss", { volume: 1, fade: 1, loop: true })
                //SetFogTag(player, "abyssal");
            }
            if (floorBlock.typeId == 'better_on_bedrock:chorus_grass' && !player.hasTag('chorus')) {
                player.runCommand("fog @p remove bob:end_fog")
                player.runCommand("fog @p push pog:chorus_forest bob:end_fog")
                player.playMusic("ambient.chorus_forest", { volume: 1, fade: 1, loop: true })
                //SetFogTag(player, "chorus");
            }
            if (floorBlock.typeId == 'minecraft:end_stone' && !player.hasTag('wastes')) {
                player.runCommand("fog @p remove bob:end_fog")
                player.playMusic("ambient.end_wastes", { volume: 1, fade: 1, loop: true })
                //SetFogTag(player, "wastes");
            };
        };
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
           if(player.dimension.id != "minecraft:the_end" || !player.hasTag("endFog")) {
                player.runCommand("fog @p remove bob:end_fog")
           }
        }
    }());
}, 30);
