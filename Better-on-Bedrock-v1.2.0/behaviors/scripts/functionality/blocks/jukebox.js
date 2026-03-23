import { Direction, world } from "@minecraft/server";

world.afterEvents.playerInteractWithBlock.subscribe(event => {
    const block = event.block
    const player = event.player
    const blockLoc = event.block.location

    if (block.typeId == 'minecraft:jukebox') {
        world.getDimension(player.dimension.id).runCommandAsync(`stopsound @a balloon.pop`)
        world.getDimension(player.dimension.id).runCommandAsync(`stopsound @a camera.take_picture`)
        world.getDimension(player.dimension.id).runCommandAsync(`stopsound @a sparkler.use`)
        world.getDimension(player.dimension.id).runCommandAsync(`stopsound @a elemconstruct`)
    }
})
world.afterEvents.playerBreakBlock.subscribe(event => {
    const block = event.block
    const player = event.player
    const blockLoc = event.block.location

    if (event.brokenBlockPermutation.type.id == 'minecraft:jukebox') {
        world.getDimension(player.dimension.id).runCommandAsync(`stopsound @a balloon.pop`)
        world.getDimension(player.dimension.id).runCommandAsync(`stopsound @a camera.take_picture`)
        world.getDimension(player.dimension.id).runCommandAsync(`stopsound @a sparkler.use`)
        world.getDimension(player.dimension.id).runCommandAsync(`stopsound @a elemconstruct`)
    }
})