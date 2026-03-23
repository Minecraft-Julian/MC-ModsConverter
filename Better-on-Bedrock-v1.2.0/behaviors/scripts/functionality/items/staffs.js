import {
    system,

    Player,
    MolangVariableMap,
    ItemDurabilityComponent,
    EntityInventoryComponent,
    EntityProjectileComponent,

    GameMode,
    TicksPerSecond,
} from "@minecraft/server";

Player.prototype.aimingEntity = null;
Player.prototype.useSlots = [];
Player.prototype.staffUses = 0;
Player.prototype.isUsingStaff = false;

/**
 * @param { import("@minecraft/server").Player } player
 * @param { string } particle
 * @param { function } effect
 * @param { function } shouldStop
 */
function staffEffect(player, particle, effect, shouldStop) {
    player.isUsingStaff = true;
            
    let ticks = 0;
    const run = system.runInterval(() => {
        if (shouldStop()) {
            system.clearRun(run);
            return;
        };

        system.runJob(function* () {
            const map = new MolangVariableMap();
            
            const rotation = player.getRotation();
            map.setFloat("rotation_x", rotation.x);
            map.setFloat("rotation_y", rotation.y);

            player.dimension.spawnParticle(particle, player.getHeadLocation(), map);
            yield;

            if (ticks % 20 == 0) {
                effect();
                player.staffUses++;
            };

            ticks++;
            yield;
        }());
    });
};

function staffSoundEffect(player, sound, shouldStop) {
    player.isUsingStaff = true;
            
    let ticks = 0;
    const run = system.runInterval(() => {
        if (shouldStop()) {
            system.clearRun(run);
            return;
        };

        system.runJob(function* () {
            if (ticks % 60 == 0) {
                player.dimension.playSound(sound, player.getHeadLocation());
                player.staffUses++;
            };

            ticks++;
            yield;
        }());
    });
};

/** @param { import("@minecraft/server").Player } player */
function getEntities(player) {
    const headLocation = player.getHeadLocation();
    const viewDirection = player.getViewDirection();
    const options = {
        maxDistance: 10,
    };

    return [
        ...player.dimension.getEntitiesFromRay({
            x: headLocation.x + viewDirection.x,
            y: headLocation.y + viewDirection.y,
            z: headLocation.z + viewDirection.z,
        }, { x: viewDirection.x - 0.025, y: viewDirection.y, z: viewDirection.z + 0.025 }, options)
        .map(({ entity }) => entity),
        ...player.dimension.getEntitiesFromRay({
            x: headLocation.x + viewDirection.x,
            y: headLocation.y + viewDirection.y,
            z: headLocation.z + viewDirection.z,
        }, viewDirection, options)
        .map(({ entity }) => entity),
        ...player.dimension.getEntitiesFromRay({
            x: headLocation.x + viewDirection.x,
            y: headLocation.y + viewDirection.y,
            z: headLocation.z + viewDirection.z,
        }, { x: viewDirection.x + 0.025, y: viewDirection.y, z: viewDirection.z - 0.025 }, options)
        .map(({ entity }) => entity),
    ];
};

/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
export function staffs(itemStack, player) {
    if (!itemStack.hasTag("better_on_bedrock:staff"))
        return;

    function shouldStop() {
        if (itemStack.hasComponent(ItemDurabilityComponent.componentId)) {
            const durability = itemStack.getComponent(ItemDurabilityComponent.componentId);
            if (durability.damage + player.staffUses == durability.maxDurability) {
                player.sendMessage([
                    { text: "§c[!] §r" },
                    { translate: "bob.message.staffs.outOfMana" },
                ]);
            };

            return (
                !player.isUsingStaff
                || durability.damage + player.staffUses == durability.maxDurability
            );
        };

        return !player.isUsingStaff;
    };

    if (!player.isSneaking)
        player.useSlots.push(player.selectedSlotIndex);

    switch (itemStack.typeId) {
        case "better_on_bedrock:staff": {
            if (player.isSneaking)
                return;

            staffEffect(player, "pog:staff_beam", () => {
                const entities = getEntities(player);
                for (const entity of entities) {
                    entity.addEffect("levitation", 2.5 * TicksPerSecond, {
                        amplifier: 2,
                        showParticles: false
                    });
                };
            }, shouldStop);
            staffSoundEffect(player, "staff.basic.use", shouldStop);
            break;
        };
        case "better_on_bedrock:ice_staff": {
            player.isUsingStaff = true;
            if (shouldStop())
                return;
            player.dimension.playSound("staff.ice.use", player.getHeadLocation());
        
            const entity = player.dimension.spawnEntity("better_on_bedrock:wand_iceologer_iceblock", {
                x: player.location.x,
                y: player.location.y + 3.5,
                z: player.location.z
            });
    
            const projectile = entity.getComponent(EntityProjectileComponent.componentId);
            projectile.owner = player;

            entity.addTag("staff_entity");
            entity.addTag(player.id);
            
            const run = system.runInterval(() => {
                if (shouldStop()) {
                    system.clearRun(run);
                    return;
                };

                const headLocation = player.getHeadLocation();
                const viewDirection = player.getViewDirection();
                const aimingEntity = player.dimension.getEntitiesFromRay({
                    x: headLocation.x + viewDirection.x,
                    y: headLocation.y + viewDirection.y,
                    z: headLocation.z + viewDirection.z,
                }, viewDirection, {
                    maxDistance: 15,
                    excludeTypes: [ "minecraft:item", entity.typeId ],
                })
                .map(({ entity }) => entity)[0];

                system.runJob(function* () {
                    try {
                        if (aimingEntity?.isValid()) {
                            player.aimingEntity = aimingEntity;
                            entity.teleport({
                                x: aimingEntity.location.x,
                                y: aimingEntity.location.y + 3.5,
                                z: aimingEntity.location.z
                            });
                        }
                        else {
                            player.aimingEntity = null;
                            entity.teleport({
                                x: player.location.x,
                                y: player.location.y + 3.5,
                                z: player.location.z
                            });
                        };
                    } catch {};
                    yield;
                }());
            });
            break;
        };
        case "better_on_bedrock:flender_staff": {
            player.isUsingStaff = true;
            if (shouldStop())
                return;
            player.dimension.playSound("staff.flender.use", player.getHeadLocation());
        
            const headLocation = player.getHeadLocation();
            const viewDirection = player.getViewDirection();
            const spawnLocation = {
                x: headLocation.x + viewDirection.x,
                y: headLocation.y + viewDirection.y,
                z: headLocation.z + viewDirection.z,
            };
            
            const entity = player.dimension.spawnEntity("better_on_bedrock:flender_fireball", spawnLocation);
            entity.applyImpulse({
                x: viewDirection.x * 1.4,
                y: viewDirection.y * 1.2,
                z: viewDirection.z * 1.4,
            });
            break;
        };
        case "better_on_bedrock:flame_staff": {
            if (player.isSneaking)
                return;
            player.dimension.playSound("staff.fire.use", player.getHeadLocation());
            
            staffEffect(player, "pog:flame_beam", () => {
                const entities = getEntities(player);

                for (const entity of entities) {
                    entity.setOnFire(2.5, true);
                };
            }, shouldStop);
            staffSoundEffect(player, "staff.fire.breath", shouldStop);
            break;
        };
    };
};

/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
function manaCheck(itemStack, player, sendMessage = false) {
    const slot = player.useSlots[0];
    if (slot === void 0)
        return;

    if (itemStack.hasComponent(ItemDurabilityComponent.componentId)) {
        const durability = itemStack.getComponent(ItemDurabilityComponent.componentId);
        if (durability.damage + 25 > durability.maxDurability) {
            if (sendMessage) {
                player.sendMessage([
                    { text: "§c[!] §r" },
                    { translate: "bob.message.staffs.notEnoughMana" },
                ]);
            };
            
            return true;
        };

        if (player.getGameMode() !== GameMode.creative)
            durability.damage += 25;

        const inventory = player.getComponent(EntityInventoryComponent.componentId).container;
        inventory.setItem(slot, itemStack);
        player.useSlots.pop();
    };
};

/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
export function useStaff(itemStack, player) {
    if (!itemStack.hasTag("better_on_bedrock:staff") || !player.isSneaking)
        return;

    const headLocation = player.getHeadLocation();
    const viewDirection = player.getViewDirection();
    const spawnLocation = {
        x: headLocation.x + viewDirection.x,
        y: headLocation.y + viewDirection.y,
        z: headLocation.z + viewDirection.z,
    };

    switch (itemStack.typeId) {
        case "better_on_bedrock:staff": {
            if (
                (player.getItemCooldown("better_on_bedrock:staff") / TicksPerSecond) < 0.95
                || manaCheck(itemStack, player, true)
            ) return;
            
            const entity = player.dimension.spawnEntity("minecraft:shulker_bullet", spawnLocation);
            entity.applyImpulse(viewDirection);

            player.dimension.playSound("mob.shulker.shoot", player.getHeadLocation());

            const projectile = entity.getComponent(EntityProjectileComponent.componentId);
            projectile.owner = player;
            break;
        };
        case "better_on_bedrock:flame_staff": {
            if (
                (player.getItemCooldown("better_on_bedrock:staff") / TicksPerSecond) < 9.9
                || manaCheck(itemStack, player, true)
            ) return;
            
            const entity = player.dimension.spawnEntity("better_on_bedrock:fireballinit", spawnLocation);
            entity.applyImpulse(viewDirection);

            player.dimension.playSound("mob.ghast.fireball", player.getHeadLocation());
            break;
        };
    };
};

/**
 * @param { import("@minecraft/server").ItemStack } itemStack
 * @param { import("@minecraft/server").Player } player
 */
export function releaseStaffs(itemStack, player) {
    if (!player.isUsingStaff)
        return;

    player.isUsingStaff = false;

    switch (itemStack.typeId) {
        case "better_on_bedrock:ice_staff": {
            if (manaCheck(itemStack, player))
                return;
            
            const viewDirection = player.getViewDirection();
            system.runTimeout(() => {
                if (!player.aimingEntity) {
                    const staffEntities = player.dimension.getEntities({ tags: [ "staff_entity", player.id ] });
                    for (const entity of staffEntities) {
                        entity.applyImpulse({
                            x: viewDirection.x * 2,
                            y: viewDirection.y * 1.5,
                            z: viewDirection.z * 2,
                        });
                    };
                };
            }, 2);
            return;
        };
        case "better_on_bedrock:flender_staff": {
            manaCheck(itemStack, player)
            return;
        };

        default: break;
    };

    const inventory = player.getComponent(EntityInventoryComponent.componentId).container;
    const slot = player.useSlots[0];
    player.useSlots.pop();

    const lastItemStack = inventory.getItem(slot);
    if (
        lastItemStack?.hasTag("better_on_bedrock:staff")
        && itemStack.hasComponent(ItemDurabilityComponent.componentId)
    ) {
        const durability = itemStack.getComponent(ItemDurabilityComponent.componentId);

        if (player.getGameMode() !== GameMode.creative)
            durability.damage = Math.min(durability.damage + player.staffUses, durability.maxDurability);

        inventory.setItem(slot, itemStack);
    };
    player.staffUses = 0;
    player.aimingEntity = null;
};