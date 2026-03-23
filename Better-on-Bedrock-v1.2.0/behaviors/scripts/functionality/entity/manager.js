export function hasFamilies(entity, families) {
    if (entity.dimension.getEntities({ families: families, location: entity.location, maxDistance: 0.2 })[0]) {
        return true;
    }
    else
        return false;
}
