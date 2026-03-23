import { world, system, Player } from "@minecraft/server"


system.runInterval(() => {
    const players = world.getAllPlayers();
    for (let i = 0; i < players.length; i++) {
        const player = players[i];

        const entity = player.dimension.getEntities({
            type: "better_on_bedrock:seeker",
            location: player.location,
            closest: 1
        })[0];
        if (!entity)
            continue;

        entity?.teleport({
            x: Math.floor(Math.random() * (entity.location.x + 7 - entity.location.x  -7 + 1)) + entity.location.x + 7,
            y: Math.floor(Math.random() * (entity.location.y + 0 - entity.location.y + 0 + 1)) + entity.location.y + 0,
            z: Math.floor(Math.random() * (entity.location.z + 7 - entity.location.z  -7 + 1)) + entity.location.z + 7
        })
    }
}, Math.floor(Math.random() * (10 * 20 - 5 * 20 + 1)) + 5 * 20)

system.runInterval(() => {
    system.runJob(function* () {
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const entityLauncher = player.dimension.getEntities({
                type: "better_on_bedrock:seeker_launcher",
                location: player.location,
                closest: 1
            })[0];
            yield;

            if (!entityLauncher)
                continue;

            const dx = entityLauncher?.location.x - player?.location.x;
            const dy = entityLauncher?.location.y - player?.location.y;
            const dz = entityLauncher?.location.z - player?.location.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < 3) {
                yield player.applyKnockback(4, 0, 0, 1);
            }
        }
    }());
}, 10)

system.runInterval(() => {
    system.runJob(function* () {
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const entityLauncher = player.dimension.getEntities({
                type: "better_on_bedrock:player_dummy_seeker",
                location: player.location,
                closest: 1
            })[0];

            if (!entityLauncher)
                continue;
           
            yield entityLauncher?.teleport({ x: player.location.x - player.getViewDirection().x, y: player.location.y, z: player.location.z - player.getViewDirection().z })
        }
    }());
}, 3)