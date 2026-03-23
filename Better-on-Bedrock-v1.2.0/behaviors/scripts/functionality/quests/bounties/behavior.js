import { world, Player } from "@minecraft/server";
import { bounties } from "./bounties.js";

world.afterEvents.entityDie.subscribe(
    ({ deadEntity, damageSource: { damagingEntity } }) => {
        if (!(damagingEntity instanceof Player))
            return;
        
        const bountyEntity = bounties.find((bounty) =>
            bounty.entity == deadEntity.typeId
            || bounty.entities?.includes(deadEntity.typeId)
        );
        
        if (bountyEntity !== undefined) {
            const savedBounties = JSON?.parse(damagingEntity?.getDynamicProperty("bounties") ?? "[]");
            const savedBounty = savedBounties.find((q) => q[0] == bountyEntity.id);
            if (!savedBounty)
                return;
            
            if (savedBounty[2] == 1) {
                savedBounty[1]++;
                let amount = bountyEntity.amount;
                if (savedBounty[1] >= amount) {
                    damagingEntity.playSound("bob.bounty.complete", damagingEntity.location);
                    damagingEntity.sendMessage([
                        { text: "§a[!] §r" },
                        { translate: "bob.message.bounty.complete" },
                    ]);
                    damagingEntity.sendMessage("bob.toast;bounty.complete");

                    savedBounty[1] = 0; // Set progress to 0
                    savedBounty[2] = 2; // Completed
                    if (bountyEntity.id === 19) {
                        damagingEntity.sendMessage([
                            { text: "§a[!] §r" },
                            { translate: "bob.message.bounty.completedAll" },
                        ]);
                    }
                    else {
                        savedBounties.find((q) => q[0] == bountyEntity.id + 1)[2] = 0; // Open
                    };
                };

                damagingEntity.setDynamicProperty("bounties", JSON.stringify(savedBounties));
            };
        };
    },
);