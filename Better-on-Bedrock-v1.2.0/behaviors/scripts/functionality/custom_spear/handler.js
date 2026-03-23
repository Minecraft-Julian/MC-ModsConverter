import { EntityEquippableComponent, EntityInventoryComponent, EntityProjectileComponent, EquipmentSlot, GameMode, ItemDurabilityComponent, ItemEnchantableComponent, system, world } from "@minecraft/server";
import { CustomTridents, waitTicks } from "./data";
import { TridentManager } from "./manager";
import { hasFamilies } from "../entity/manager";
world.afterEvents.itemReleaseUse.subscribe((data) => {
    const { source, useDuration } = data;
    if (!data.itemStack)
        return;

    const mainhand = source.getComponent(EntityEquippableComponent.componentId).getEquipmentSlot(EquipmentSlot.Mainhand);
    if (!mainhand)
        return;

    const item = mainhand.getItem();
    if (item?.typeId != data.itemStack.typeId)
        return;

    const tridentData = CustomTridents.find((f) => f.itemID == item.typeId);
    if (!tridentData)
        return;

    if (-useDuration + (2147483647 * 20) < 13)
        return;

    const enchComp = item.getComponent(ItemEnchantableComponent.componentId);
    if (tridentData.riptide && enchComp?.hasEnchantment("riptide")) {
        const level = enchComp.getEnchantment("riptide")?.level;
        if (level === undefined)
            return;

        const riptide = tridentData.riptide;
        if (TridentManager.isInEnvironment(riptide.environment, source)) {
            const viewDir = source.getViewDirection();
            source.applyKnockback(viewDir.x, viewDir.z, (((Math.abs(viewDir.x) + Math.abs(viewDir.z)) * 1.5) * (riptide.velocity + ((riptide.velocity / 6) * level))), viewDir.y * (riptide.velocity + ((riptide.velocity / 6) * level)));
            if (riptide.sound) {
                source.dimension.playSound(riptide.sound.ids[level - 1], source.location);
            }
            if (riptide.onRiptide)
                riptide.onRiptide(source, level);

            return;
        }

        return;
    }

    const durComp = item.getComponent(ItemDurabilityComponent.componentId);
    if (!tridentData.projectile || durComp?.damage == durComp?.maxDurability)
        return;

    const projectileData = tridentData.projectile;
    const headLoc = source.getHeadLocation();
    const projectile = source.dimension.spawnEntity(projectileData.entityID, { x: headLoc.x, y: 100, z: headLoc.z });
    projectile.teleport(headLoc);
    projectile.setDynamicProperty("item", JSON.stringify(TridentManager.getTridentItem(item)));
    
    if (source.getGameMode() != GameMode.creative)
        mainhand.setItem();

    projectile.setDynamicProperty("ownerID", source.id);
    
    const projectileComp = projectile.getComponent(EntityProjectileComponent.componentId);
    if (enchComp?.getEnchantments()[0])
        projectile.setProperty('better_on_bedrock:enchanted', true);
    
    if (!projectileComp)
        return;
    
    projectileComp.owner = source;
    
    const viewDir = source.getViewDirection();
    projectileComp.shoot({ x: viewDir.x * projectileData.thrownVelocity, y: viewDir.y * projectileData.thrownVelocity, z: viewDir.z * projectileData.thrownVelocity });
    
    const sound = projectileData.thrownSound;
    if (!sound)
        return;
    
    source.dimension.playSound(sound.id, source.location, { volume: sound.volume, pitch: sound.pitch });
});

world.afterEvents.projectileHitBlock.subscribe((data) => {
    const { projectile } = data;
    system.runTimeout(() => {
        if (!projectile || !projectile.isValid())
            return;

        let itemData = projectile.getDynamicProperty("item");
        if (!itemData)
            return;

        itemData = JSON.parse(itemData);
        if (!itemData.enchantments)
            return;

        const loyalty = itemData.enchantments.find((f) => f.id == "loyalty");
        if (!loyalty)
            return;

        projectile.triggerEvent("better_on_bedrock:returning");
    }, waitTicks);
});
world.afterEvents.projectileHitEntity.subscribe((data) => {
    const { projectile } = data;
    if (!projectile || !projectile.isValid())
        return;

    let itemData = projectile.getDynamicProperty("item");
    if (!itemData)
        return;

    itemData = JSON.parse(itemData);

    const entity = data.getEntityHit()?.entity;
    const entityLoc = entity?.location;
    const projLoc = projectile.location;
    if (itemData.enchantments) {
        for (const enchant of itemData.enchantments) {
            switch (enchant.id) {
                case "fire_aspect":
                    if (entity?.isValid())
                        try {
                            entity.setOnFire(4 * enchant.lvl, true);
                        }
                        catch { }
                    break;
                case "knockback":
                    if (entity?.isValid() && entityLoc)
                        try {
                            entity.applyKnockback(entityLoc.x - projLoc.x, entityLoc.z - projLoc.z, 1.25 * enchant.lvl, 0.2 * enchant.lvl);
                        }
                        catch { }
                    break;
                case "sharpness":
                    system.runTimeout(() => {
                        if (entity && entity.isValid() && projectile && projectile.isValid())
                            entity.applyDamage(enchant.lvl, { damagingProjectile: projectile });
                    }, 7);
                    break;
                case "smite":
                    if (!entity)
                        break;

                    if (!hasFamilies(entity, ["undead"]))
                        break;

                    system.runTimeout(() => {
                        if (entity && entity.isValid() && projectile && projectile.isValid())
                            entity.applyDamage(2 * enchant.lvl, { damagingProjectile: projectile });
                    }, 7);
                    break;
                case "bane_of_arthropods":
                    if (!entity)
                        break;

                    if (!hasFamilies(entity, ["arthropod"]))
                        break;

                    entity.addEffect("slowness", 10 + ((10 * enchant.lvl) + (Math.random() * 0.5)), { amplifier: 3, showParticles: false });
                    system.runTimeout(() => {
                        if (entity && entity.isValid() && projectile && projectile.isValid())
                            entity.applyDamage(2.5 * enchant.lvl, { damagingProjectile: projectile });
                    }, 7);
                    break;
            }
        }
    }

    system.runTimeout(() => {
        if (!projectile.isValid())
            return;
        
        if (itemData.durabilityDamage === undefined)
            return;

        if (!TridentManager.reduceDurability(itemData))
            return;

        itemData.durabilityDamage += 1;
        projectile.setDynamicProperty("item", JSON.stringify(itemData));
        if (!itemData.enchantments)
            return;

        const loyalty = itemData.enchantments.find((f) => f.id == "loyalty");
        if (!loyalty)
            return;

        projectile.triggerEvent("better_on_bedrock:returning");
    }, waitTicks);
});

system.runInterval(() => {
    system.runJob(function* () {
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (!player || !player.isValid())
                continue;
    
            const { x, y, z } = player.location;
            const tridents = player.dimension.getEntities({ location: { x: x, y: y + 1, z: z }, maxDistance: 2, excludeTypes: ["minecraft:player", "minecraft:item", "minecraft:zombie", "minecraft:skeleton", "minecraft:chicken"] });
            const inv = player.getComponent(EntityInventoryComponent.componentId);
            if (!inv.container || inv.container.emptySlotsCount == 0)
                continue;
    
            const container = inv.container;
            for (let i = 0; i < tridents.length; i++) {
                if (!tridents[i] || !tridents[i].isValid())
                    continue;
    
                if (container.emptySlotsCount <= 0)
                    continue;
    
                const found = CustomTridents.find((f) => f.projectile?.entityID == tridents[i].typeId);
                if (!found)
                    continue;
    
                const tridentEntity = tridents[i];
                if (!TridentManager.canPickUp(tridentEntity))
                    continue;
    
                const ownerID = tridentEntity.getDynamicProperty("ownerID");
                if (!ownerID)
                    continue;
    
                if (ownerID != player.id)
                    continue;
    
                const itemData = tridentEntity.getDynamicProperty("item");
                if (!itemData)
                    continue;
    
                const gameMode = player.getGameMode();
                if (gameMode != GameMode.creative && gameMode != GameMode.spectator) {
                    const item = TridentManager.getItem(JSON.parse(itemData));
                    container.addItem(item);
                }
    
                player.dimension.playSound("random.pop", tridentEntity.location, { pitch: 1 + Math.random(), volume: 0.5 });
                tridentEntity.remove();
            }
        }
    }());
}, 15);
system.afterEvents.scriptEventReceive.subscribe((data) => {
    if (data.id != "better_on_bedrock:trident_return" && data.id != "better_on_bedrock:trident_tick")
        return;

    const tridentEntity = data.sourceEntity;
    if (!tridentEntity || !tridentEntity.isValid())
        return;

    const tridentData = CustomTridents.find((f) => f.projectile?.entityID == tridentEntity.typeId);
    if (!tridentData)
        return;

    if (data.id == "better_on_bedrock:trident_return") {
        let itemData = tridentEntity.getDynamicProperty("item");
        if (!itemData)
            return;

        itemData = JSON.parse(itemData);

        if (!itemData.enchantments)
            return;

        const loyalty = itemData.enchantments.find((f) => f.id == "loyalty");
        if (!loyalty)
            return;

        const ownerID = tridentEntity.getDynamicProperty("ownerID");
        if (!ownerID)
            return;

        const owner = TridentManager.getOwner(ownerID);
        if (!owner)
            return;

        if (!tridentEntity || !tridentEntity.isValid() || !owner || !owner.isValid())
            return;

        const loc = tridentEntity.location;
        let velocity = tridentData.projectile?.returnSpeed;
        if (velocity === undefined)
            velocity = 1;

        if (!loyalty)
            return;

        velocity *= 1 + (loyalty.lvl * 0.25);
        const ownerLoc = owner.location;
        tridentEntity.teleport(loc, { facingLocation: { x: ownerLoc.x, y: ownerLoc.y + 1, z: ownerLoc.z } });

        const viewDir = tridentEntity.getViewDirection();
        tridentEntity.teleport({ x: loc.x + viewDir.x + (viewDir.x * velocity), y: loc.y + viewDir.y + (viewDir.y * velocity), z: loc.z + (viewDir.z * velocity) });

        {
            if (tridentEntity.getDynamicProperty("returning"))
                return;

            tridentEntity.setDynamicProperty("returning", true);

            if (tridentData.projectile?.onReturn)
                tridentData.projectile.onReturn(tridentEntity, tridentEntity.dimension, owner, loyalty.lvl);

            if (tridentData.projectile?.returnSound) {
                const sound = tridentData.projectile.returnSound;
                if (owner.typeId == "minecraft:player")
                    owner.playSound(sound.id, { volume: sound.volume, pitch: sound.pitch });
            }
        }
    }
    else if (tridentEntity.location.y < -64) {
        tridentEntity.runCommand("scriptevent better_on_bedrock:trident_return");
    }

    return;
});
