import { world, system, GameMode } from "@minecraft/server";
system.runInterval(() => {
    const players = world.getAllPlayers();
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (!player.hasTag("pog:ambientSounds"))
            continue;

        switch (player.dimension.id) {
            case "minecraft:the_end": {
                player.playSound("ambient.random.end");
                break;
            };
        };
    };
}, Math.random() * (880 - 480) + 480);

system.runInterval(() => {
    const players = world.getAllPlayers();
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (
            !player.hasTag("pog:ambientSounds")
            || !player.matches({ gameMode: GameMode.survival })
        ) continue;

        switch (player.dimension.id) {
            case "minecraft:overworld": {
                player.playSound("confused_and_deeds_and_prelude");
                break;
            };
        };
    };
}, 20 * 320)

function removeAmbienceTags(entity) {
    entity.removeTag("night");
    entity.removeTag("swamps");
    entity.removeTag("swamp");
    entity.removeTag("taigas");
    entity.removeTag("taiga");
    entity.removeTag("jungles");
    entity.removeTag("jungle");
    entity.removeTag("plain");
    entity.removeTag("plains");
    entity.removeTag("forest");
    entity.removeTag("forests");
    entity.removeTag("birch");
    entity.removeTag("birchs");
    entity.removeTag("cherrygrove");
    entity.removeTag("cherrygroves");
    entity.removeTag("ocean");
    entity.removeTag("oceans");
    entity.removeTag("cold");
    entity.removeTag("colds");
    entity.removeTag("desert");
    entity.removeTag("deserts");
};

function removeAmbience(player) {
    const { location, dimension, id: playerId } = player;
    const ambienceEntities = dimension.getEntities({
        type: "better_on_bedrock:ambiententity", location
    });

    for (let j = 0; j < ambienceEntities.length; j++) {
        const entity = ambienceEntities[j];
        if (entity.getTags().includes(playerId))
            system.run(() => entity.remove());
    };
};

world.beforeEvents.playerLeave.subscribe(
    ({ player }) => removeAmbience(player),
);

world.afterEvents.playerSpawn.subscribe(
    ({ player }) => removeAmbience(player),
);

world.afterEvents.playerDimensionChange.subscribe(({ player, toDimension }) => {
    if (!player.hasTag("pog:ambientSounds"))
        return;

    if(toDimension.id == 'minecraft:the_end' || toDimension.id == 'minecraft:nether') {
        player.stopMusic();

        const playerId = player.id;
        const ambienceEntities = toDimension.getEntities({ type: "better_on_bedrock:ambiententity"});
        for (let j = 0; j < ambienceEntities.length; j++) {
            const entity = ambienceEntities[j];
            if (entity.getTags().includes(playerId))
                entity.remove();
        };
    }
})

export function ambience(player) {
    if (!player.hasTag("pog:ambientSounds")) {
        removeAmbience(player);
        removeAmbienceTags(player);
        return;
    };

    const ambienceEntities = player.dimension.getEntities({
        type: "better_on_bedrock:ambiententity",
        location: player.location
    });

    let playerAmbienceEntity;
    for (let j = 0; j < ambienceEntities.length; j++) {
        const entity = ambienceEntities[j];
        if (!entity.getTags().some((tag) => {
            try {
                return world.getEntity(tag) !== undefined
            } catch {};
        })) {
            entity.remove();
            continue;
        };

        if (entity.getTags().includes(player.id))
            playerAmbienceEntity = entity;
    };

    switch (player.dimension.id) {
        case "minecraft:the_end":
        case "minecraft:nether": {
            if (player.hasTag("overworld"))
                return;
            player.addTag("overworld");
            break;
        };
        case "minecraft:overworld": {

            if (player.location.y <= 60) {

                if (playerAmbienceEntity !== undefined)
                    playerAmbienceEntity.triggerEvent("despawn");

                player.removeTag("night");
                return;
            };

            if (world.getTimeOfDay() >= 12500 && world.getTimeOfDay() <= 23500) {
                if (player.hasTag("night"))
                    return;

                if (playerAmbienceEntity !== undefined)
                    playerAmbienceEntity.triggerEvent("despawn");

                player.addTag("night");
                player.playMusic("ambient.night", {
                    loop: true,
                    fade: 1.2,
                    volume: 0.1
                });
            }
            else {
                if (player.hasTag("night"))
                    player.removeTag("night");


                if (playerAmbienceEntity == undefined) {
                    if (!player.isValid())
                        return;
                    
                    try {
                        const entity = player.dimension.spawnEntity("better_on_bedrock:ambiententity", player.location);
                        entity.addTag(player.id);
                    } catch {};
                    return;
                };

                const head = player.getHeadLocation()
                const view = player.getViewDirection();

                playerAmbienceEntity.teleport({
                    x: head.x - view.x * 0.5,
                    y: head.y - view.y * 0.5,
                    z: head.z - view.z * 0.5
                });

                if (playerAmbienceEntity.hasTag("plains")) {
                    if (playerAmbienceEntity.hasTag("plain"))
                        return;

                    removeAmbienceTags(playerAmbienceEntity);
                    playerAmbienceEntity.addTag("plain");
                    
                    player.playMusic("ambient.plains", {
                        loop: true,
                        fade: 1.2,
                        volume: 0.4
                    });
                }
                if (playerAmbienceEntity.hasTag("forests")) {
                    if (playerAmbienceEntity.hasTag("forest"))
                        return;

                    removeAmbienceTags(playerAmbienceEntity);
                    playerAmbienceEntity.addTag("forest");

                    player.playMusic("ambient.bird", {
                        loop: true,
                        fade: 1.2,
                        volume: 0.15
                    });
                }
                if (playerAmbienceEntity.hasTag("birchs")) {
                    if (playerAmbienceEntity.hasTag("birch"))
                        return;

                    removeAmbienceTags(playerAmbienceEntity);
                    playerAmbienceEntity.addTag("birch");
                    
                    player.playMusic("ambient.birch_bird", {
                        loop: true,
                        fade: 1.2,
                        volume: 0.3
                    });
                }
                if (playerAmbienceEntity.hasTag("oceans")) {
                    if (playerAmbienceEntity.hasTag("ocean"))
                        return;

                    removeAmbienceTags(playerAmbienceEntity);
                    playerAmbienceEntity.addTag("ocean");
                    
                    player.playMusic("ambient.ocean", {
                        loop: true,
                        fade: 1.2,
                        volume: 1.2
                    });
                }
                if (playerAmbienceEntity.hasTag("cherrygroves")) {
                    if (playerAmbienceEntity.hasTag("cherrygrove"))
                        return;

                    removeAmbienceTags(playerAmbienceEntity);
                    playerAmbienceEntity.addTag("cherrygrove");
                    
                    player.playMusic("ambient.cherry", {
                        loop: true,
                        fade: 1.2,
                        volume: 0.7
                    });
                }
                if (playerAmbienceEntity.hasTag("deserts")) {
                    if (playerAmbienceEntity.hasTag("desert"))
                        return;

                    removeAmbienceTags(playerAmbienceEntity);
                    playerAmbienceEntity.addTag("desert");
                    
                    player.playMusic("ambient.desert", {
                        loop: true,
                        fade: 1.2,
                        volume: 0.6
                    });
                }
                if (playerAmbienceEntity.hasTag("taigas")) {
                    if (playerAmbienceEntity.hasTag("taiga"))
                        return;

                    removeAmbienceTags(playerAmbienceEntity);
                    playerAmbienceEntity.addTag("taiga");

                    player.playMusic("ambient.taiga_bird", {
                        loop: true,
                        fade: 1.2,
                        volume: 0.07
                    });
                }
                if (playerAmbienceEntity.hasTag("swamps")) {
                    if (playerAmbienceEntity.hasTag("swamp"))
                        return;

                    removeAmbienceTags(playerAmbienceEntity);
                    playerAmbienceEntity.addTag("swamp");
                    
                    player.playMusic("ambient.taiga_bird", {
                        loop: true,
                        fade: 1.2,
                        volume: 0.07
                    });
                }
                if (playerAmbienceEntity.hasTag("jungles")) {
                    if (playerAmbienceEntity.hasTag("jungle"))
                        return;

                    removeAmbienceTags(playerAmbienceEntity);
                    playerAmbienceEntity.addTag("jungle");
                    
                    player.playMusic("ambient.taiga_bird", {
                        loop: true,
                        fade: 1.2,
                        volume: 0.07
                    });
                }
                if (playerAmbienceEntity.hasTag("colds")) {
                    if (playerAmbienceEntity.hasTag("cold"))
                        return;

                    removeAmbienceTags(playerAmbienceEntity);
                    playerAmbienceEntity.addTag("cold");
                    
                    player.playMusic("ambient.snow", {
                        loop: true,
                        fade: 1.2,
                        volume: 0.3
                    });
                }
               
            };
            break;
        };
    };
};