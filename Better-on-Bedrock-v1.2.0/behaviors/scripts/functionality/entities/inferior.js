import { world, system, Player } from "@minecraft/server"

system.runInterval(() => {
    system.runJob(function* () {
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (!player?.isValid())
                continue;
            
            const entity = player.dimension.getEntities({
                type: "better_on_bedrock:inferior",
                location: player.location,
                closest: 1
            })[0];
            yield;
            if (entity === void 0)
                continue;

            const dx = entity?.location.x - player?.location.x;
            const dy = entity?.location.y - player?.location.y;
            const dz = entity?.location.z - player?.location.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            let entityProperty = entity?.getProperty('pog:is_on_ground')
            if (entity?.getVelocity().y >= 0.4 && entityProperty == 0) {
                entity.setProperty("pog:is_on_ground", 1)
            }
            if (entity?.isOnGround && entityProperty == 1 && distance < 9) {
                entity.setProperty("pog:is_on_ground", 0)
                player.applyDamage(5)
                yield player.applyKnockback(9, 0, 1, 1)
            }
        };
    }());
}, 2);