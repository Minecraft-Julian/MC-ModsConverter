import { blocks } from "../main.js";
import { translations } from "./utils/translations.js";

export const dimensionNames = {
	"minecraft:overworld": "§a%dimension.dimensionName0",
	"minecraft:nether": "§c%dimension.dimensionName1",
	"minecraft:the_end": "§5%dimension.dimensionName2"
};

/**
 * @param { import("@minecraft/server").Entity } entity
 * @param { number } distance
 */
export function getClosestEntityFromViewDirection(entity, distance) {
    const entityRaycastHit_list = entity.getEntitiesFromViewDirection({ maxDistance: distance, });
    if (entityRaycastHit_list.length === 0)
        return undefined;
    let entityClosest = undefined;
    let maxDistance = distance;
    entityRaycastHit_list.forEach((entityRaycastHit) => {
        if (entityRaycastHit.distance < maxDistance) {
            maxDistance = entityRaycastHit.distance;
            entityClosest = entityRaycastHit.entity;
        };
    });
    return entityClosest;
};

export function getTranslation(name) {
    const isBlock = blocks.includes(name);
    const hasMinecraftNamespace = name.split(":")[0] === "minecraft";
    const identifier = hasMinecraftNamespace ? name.split(":")[1] : name;

    return (
        isBlock ? (translations.blocks[name] || "tile.".concat(identifier).concat(".name"))
        : (translations.items[name] || "item.".concat(identifier).concat(".name"))
    );
};