import { world, system, EntityInventoryComponent, Dimension, ItemStack, ItemTypes, BlockPermutation, BlockInventoryComponent, MinecraftDimensionTypes, EquipmentSlot, EntityEquippableComponent } from "@minecraft/server";
function portalNearby(player) {
	const { x, y, z } = player.location;

	// Define the check area corners
	const corner1 = { x: x + 1, y: y + 1, z: z + 1 };
	const corner2 = { x: x - 1, y, z: z - 1 };

	// Iterate through individual block positions within the area
	for (let checkX = corner1.x; checkX >= corner2.x; checkX--) {
		for (let checkY = corner1.y; checkY >= corner2.y; checkY--) {
			for (let checkZ = corner1.z; checkZ >= corner2.z; checkZ--) {
				const location = { x: checkX, y: checkY, z: checkZ };
				const block = player.dimension.getBlock(location);

				if (
					block?.typeId === "minecraft:portal" ||
					block?.typeId === "minecraft:end_portal" ||
					block?.typeId === "better_on_bedrock:waystone"
				) return true;
			}
		}
	}

	return false;
};
//function loads structure with backpack entity

class structure_Manager {
    /**
     * @param {string} ID
     * @param {import("@minecraft/server").Vector3} location
     * @param {import("@minecraft/server").Vector3} location2
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {{includeEntities: boolean, saveLocation: "disk" | "memory", includeBlocks: boolean}} structureOptions
     */
    static save(ID, location, location2, dimension, structureOptions) {
        return dimension.runCommand("structure save " + ID + " " + location.x + " " + location.y + " " + location.z + " " + location2.x + " " + location2.y + " " + location2.z + " " + structureOptions.includeEntities + " " + structureOptions.saveLocation + " " + structureOptions.includeBlocks)
    }
    /**
     * @param {string} ID
     * @param {import("@minecraft/server").Vector3} location
     * @param {import("@minecraft/server").Dimension} dimension
     */
    static load(ID, location, dimension) {
        return dimension.runCommand("structure load " + ID + " " + location.x + " " + location.y + " " + location.z)
    }
}

class block_Manager {
    /**
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {import("@minecraft/server").Vector3} location
     * @param {string} blockID
     */
    static setBlock(dimension, location, blockID) {
        dimension.runCommand("setblock " + location.x + " " + location.y + " " + location.z + " " + blockID)
    }
}

const backpackIDs = [
    "better_on_bedrock:backpack",
    "better_on_bedrock:backpack_medium",
    "better_on_bedrock:backpack_large"
]

const unallowedItems = backpackIDs.concat([
    "minecraft:undyed_shulker_box",
    "minecraft:white_shulker_box",
    "minecraft:orange_shulker_box",
    "minecraft:magenta_shulker_box",
    "minecraft:light_blue_shulker_box",
    "minecraft:yellow_shulker_box",
    "minecraft:lime_shulker_box",
    "minecraft:pink_shulker_box",
    "minecraft:gray_shulker_box",
    "minecraft:silver_shulker_box",
    "minecraft:cyan_shulker_box",
    "minecraft:purple_shulker_box",
    "minecraft:blue_shulker_box",
    "minecraft:brown_shulker_box",
    "minecraft:green_shulker_box",
    "minecraft:red_shulker_box",
    "minecraft:black_shulker_box"
])

const backpackData = {
    "better_on_bedrock:backpack": {
        count: 1,
        name: "Backpack"
    },
    "better_on_bedrock:backpack_medium": {
        count: 2,
        name: "Medium Backpack"
    },
    "better_on_bedrock:backpack_large": {
        count: 2,
        name: "Large Backpack"
    }
}
/**
 * @param {import("@minecraft/server").Entity} entity
 */
function saveBackpack(entity) {
    const dim = entity.dimension
    const entityLoc = entity.location
    const id = entity.getDynamicProperty("backpack_id")
    const maxCount = backpackData[entity.typeId].count
    const block = dim.getBlock({ x: entityLoc.x, y: 100, z: entityLoc.z })
    const lastBlock = block.permutation
    let block2 = undefined
    let lastBlock2 = undefined
    if (maxCount > 1) {
        block2 = dim.getBlock({ x: entityLoc.x, y: 101, z: entityLoc.z })
        lastBlock2 = block2.permutation
        block2.setPermutation(BlockPermutation.resolve("barrel"))
    }
    block.setPermutation(BlockPermutation.resolve("barrel"))
    const entityInv = entity.getComponent(EntityInventoryComponent.componentId)
    const blockInv = block.getComponent(BlockInventoryComponent.componentId)
    if (block2 != undefined) {
        const blockInv2 = block2.getComponent(BlockInventoryComponent.componentId)
        transferInventory(entityInv.container, blockInv2.container, dim, entityLoc, 27, 0, entityInv.container.size)
        structure_Manager.save("backpack" + id + "_2", block2.location, block2.location, block2.dimension, { includeEntities: false, saveLocation: "disk", includeBlocks: true })
        emptyInventory(blockInv2)
        block_Manager.setBlock(dim, block2.location, "air")
        block2.setPermutation(lastBlock2)
    }
    transferInventory(entityInv.container, blockInv.container, dim, entityLoc, 0, 0, 27)
    structure_Manager.save("backpack" + id, block.location, block.location, block.dimension, { includeEntities: false, saveLocation: "disk", includeBlocks: true })
    emptyInventory(blockInv)
    block_Manager.setBlock(dim, block.location, "air")
    block.setPermutation(lastBlock)
    entity.remove()
}
/** 
* @param {string} entityTypeID
* @param {import("@minecraft/server").Player} player
* @param {import("@minecraft/server").ItemStack} item
*/
function loadBackpack(entityTypeID, player, item) {
    const dim = player.dimension
    const id = item.getDynamicProperty("backpack_id")
    const maxCount = backpackData[entityTypeID].count
    try {
        let block2 = undefined
        const block = dim.getBlock({ x: player.location.x, y: 100, z: player.location.z })
        if (maxCount > 1) block2 = dim.getBlock({ x: player.location.x, y: 101, z: player.location.z })
        const lastBlock = block.permutation
        let lastBlock2 = undefined
        if (maxCount > 1) {
            lastBlock2 = block2.permutation
            if (structure_Manager.load("backpack" + id + "_2", block2.location, dim).successCount < 1) {
                block2.setPermutation(BlockPermutation.resolve("barrel"))
                structure_Manager.save("backpack" + id + "_2", block2.location, block2.location, dim, { includeBlocks: true, includeEntities: false, saveLocation: "disk" })
            }
            structure_Manager.load("backpack" + id + "_2", block2.location, dim)
        }
        if (structure_Manager.load("backpack" + id, block.location, dim).successCount < 1) {
            block.setPermutation(BlockPermutation.resolve("barrel"))
            structure_Manager.save("backpack" + id, block.location, block.location, block.dimension, { includeBlocks: true, includeEntities: false, saveLocation: "disk" })
        }
        structure_Manager.load("backpack" + id, block.location, dim)
        const viewDir = player.getViewDirection()
        const headLoc = player.getHeadLocation()
        const backPack = spawnEntityAnywhere(entityTypeID, { x: headLoc.x + (viewDir.x * 1), y: headLoc.y + (viewDir.y * 1), z: headLoc.z + (viewDir.z * 1) }, dim)
        const entityInv = backPack.getComponent(EntityInventoryComponent.componentId)
        if (maxCount > 1) {
            const blockInv2 = block2.getComponent(BlockInventoryComponent.componentId)
            transferInventory(blockInv2.container, entityInv.container, dim, block2.location, 0, 27, entityInv.container.size)
            emptyInventory(blockInv2)
            block_Manager.setBlock(dim, block2.location, "air")
            block2.setPermutation(lastBlock2)
        }
        const blockInv = dim.getBlock(block.location).getComponent(BlockInventoryComponent.componentId)
        transferInventory(blockInv.container, entityInv.container, dim, block.location, 0, 0, 27)
        emptyInventory(blockInv)
        block_Manager.setBlock(dim, block.location, "air")
        block.setPermutation(lastBlock)
        backPack.setDynamicProperty("backpack_id", id)
        backPack.setDynamicProperty("playerID", player.id)
        //console.warn(JSON.stringify(backPack))
        backPack.nameTag = backpackData[backPack.typeId].name
        backPack.setDynamicProperty("playerID", player.id)
        return backPack
    } catch {
        //console.warn("block returned undefined")
        return undefined
    }
}

/**
 * @param {import("@minecraft/server").Container} container1
 * @param {import("@minecraft/server").Container} container2
 * @param {import("@minecraft/server").Dimension} dimension
 */
function transferInventory(container1, container2, dimension, fromInvLocation, FromInvStartingSlot, ToInvStartingSlot, maxSlot) {
    let itemSlotNum = FromInvStartingSlot
    for (let i = 0; (i < container1.size); i++) {
        if (itemSlotNum < maxSlot) {
            const item = container1.getItem(itemSlotNum)
            if (item != undefined) {
                if (!unallowedItems.includes(item.typeId)) {
                    container2.setItem(i + ToInvStartingSlot, item)
                } else {
                    spawnItemAnywhere(item, fromInvLocation, dimension)
                    container1.setItem(i + FromInvStartingSlot, undefined)
                }
            } itemSlotNum = itemSlotNum + 1
        }
    }
}

/**
 * @param {import("@minecraft/server").Container} container
 */
function emptyInventory(container) {
    for (let i = 0; i < container.size; i++) {
        container.setItem(i, undefined)
    }
}

function spawnItemAnywhere(item, location, dimension) {
    const itemEntity = dimension.spawnItem(item, { x: location.x, y: 100, z: location.z })
    itemEntity.teleport(location)
    return itemEntity
}

/** 
 * @param {string} entityID
 * @param {import("@minecraft/server").Vector3} location
* @param {import("@minecraft/server").Dimension} dimension
*/
function spawnEntityAnywhere(entityID, location, dimension) {
    const entity = dimension.spawnEntity(entityID, { x: location.x, y: 100, z: location.z })
    entity.teleport(location)
    return entity
}

const dims = [
    world.getDimension(MinecraftDimensionTypes.overworld),
    world.getDimension(MinecraftDimensionTypes.nether),
    world.getDimension(MinecraftDimensionTypes.theEnd)
]

function generateRandomID(length) {
    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
    let id = ""
    for (let i = 0; i < length; i++) try { id = id + characters[Math.floor(Math.random() * characters.length)] } catch { }
    return id
}

/**
* @param {import("@minecraft/server").Entity} entity
* @param {import("@minecraft/server").Player} player
*/
function backpackTick(entity, player) {
    function tick() {
        if (player.isValid() && entity.isValid()) {
            if (portalNearby(player) == false) {
                const headLoc = player.getHeadLocation()
                const viewDir = player.getViewDirection()
                entity.teleport({ x: headLoc.x + (viewDir.x * 1), y: headLoc.y + (viewDir.y * 1), z: headLoc.z + (viewDir.z * 1) })
                system.runTimeout(() => {
                    tick()
                }, 2)
            } else {
                saveBackpack(entity)
            }
        } else if (entity.isValid()) {
            saveBackpack(entity)
        }
    }
    tick()
}
/**
 * @param {import("@minecraft/server").Player} player
 * @param {string} besidesTag
 */
function removeAllIDTags(player, besidesTag) {
    const allTags = player.getTags()
    for (const tag of allTags) {
        if (tag.startsWith("holdingbackpack.") && tag != besidesTag) player.removeTag(tag)
    }
}

system.runInterval(() => {
    system.runJob(function* () {
        for (const player of world.getAllPlayers()) {
            const equipment = player.getComponent(EntityEquippableComponent.componentId)
            let slot = equipment.getEquipmentSlot(EquipmentSlot.Mainhand)
            /*if (player.isSneaking) {
                const offhand = equipment.getEquipmentSlot(EquipmentSlot.Offhand);
                const offhandItem = offhand.getItem();
                if (offhandItem && backpackIDs.includes(offhandItem.typeId))
                    slot = offhand;
            };*/
    
            const item = slot.getItem()
            if (item) {
                if (backpackIDs.includes(item.typeId)) {
                    if (portalNearby(player) == false) {
                        player.removeTag("!holding")
                        let id = item.getDynamicProperty("backpack_id")
                        if (id == undefined) {
                            const random = generateRandomID(100)
                            item.setDynamicProperty("backpack_id", random)
                            slot.setItem(item)
                            id = random
                        }
                        const tag = "holdingbackpack." + id
                        if (!player.hasTag(tag)) {
                            const backpacks = player.dimension.getEntities({ tags: [player.id, "backpack"] })
                            for (const backpack of backpacks) {
                                saveBackpack(backpack)
                            }
                            removeAllIDTags(player, tag)
                            player.addTag(tag)
                            const backpack = loadBackpack(item.typeId, player, item)
                            backpackTick(backpack, player)
                            backpack.addTag(player.id)
                            backpack.addTag("backpack")
                        }
                    } else {
                        if (!player.hasTag("!holding")) {
                            removeAllIDTags(player, "")
                            const backpacks = player.dimension.getEntities({ tags: [player.id, "backpack"] })
                            for (const backpack of backpacks) {
                                yield saveBackpack(backpack);
                            }
                            player.addTag("!holding")
                        }
                    }
                } else for (const id of backpackIDs) {
                    if (!player.hasTag("!holding")) {
                        removeAllIDTags(player, "")
                        const backpacks = player.dimension.getEntities({ tags: [player.id, "backpack"] })
                        for (const backpack of backpacks) {
                            yield saveBackpack(backpack);
                        }
                        player.addTag("!holding")
                    }
                }
            } else if (!player.hasTag("!holding")) {
                removeAllIDTags(player, "")
                for (const id of backpackIDs) {
                    removeAllIDTags(player)
                }
                const backpacks = player.dimension.getEntities({ tags: [player.id, "backpack"] })
                for (const backpack of backpacks) {
                    yield saveBackpack(backpack);
                }
                player.addTag("!holding")
            }
        }
    }());
}, 5)
world.afterEvents.playerJoin.subscribe((data) => {
    const player = world.getEntity(data.playerId)
    removeAllIDTags(player)
})

system.runInterval(() => {
    system.runJob(function* () {
        for (const dim of dims) {
            const backpacks = dim.getEntities({ tags: ["backpack"] })
            for (const backpack of backpacks) {
                const itemid = backpack.getDynamicProperty("backpack_id")
                const id = backpack.getDynamicProperty("playerID")
                if (id != undefined)
                    if (world.getEntity(id) == undefined || !world.getEntity(id).hasTag("holdingbackpack." + itemid))
                        yield saveBackpack(backpack);
            }
        }
    }());
}, 20)