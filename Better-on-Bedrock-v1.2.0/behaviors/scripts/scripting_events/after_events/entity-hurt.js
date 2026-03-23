import { world, EntityEquippableComponent, EquipmentSlot } from "@minecraft/server";

import { amethystKnockback } from "../../functionality/armor_effects/amethyst";

world.afterEvents.entityHurt.subscribe(
    ({ damage, damageSource, hurtEntity }) => {
        amethystKnockback(damageSource, hurtEntity);

        if (damageSource.damagingEntity?.hasComponent(EntityEquippableComponent.componentId)) {
            const equippable = damageSource.damagingEntity.getComponent(EntityEquippableComponent.componentId);
            const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
            if (mainhand?.typeId === "better_on_bedrock:resin_dagger")
                hurtEntity.addEffect("slowness", 20 * 2, { amplifier: 255, showParticles: false });
        };
    },
);