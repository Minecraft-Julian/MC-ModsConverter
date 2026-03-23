/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onTick: ({ block, dimension }) => {
        const isGlobal = block.permutation.getState("pog:activatedAsGlobal");
        const isActivated = block.permutation.getState("pog:activated");
        let particle;
        if (isGlobal) {
            particle = "pog:waystone_activate_global";
        }
        else if (isActivated) {
            particle = "pog:waystone_activate";
        }
        else return;

        dimension.spawnParticle(particle, {
            x: block.location.x + 0.5,
            y: block.location.y + 0.5,
            z: block.location.z + 0.5
        });
        dimension.playSound("block.waystone.ambient", block.location);
    },
};