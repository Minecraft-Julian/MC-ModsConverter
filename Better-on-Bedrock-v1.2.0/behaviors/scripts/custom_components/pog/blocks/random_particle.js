/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onTick: ({ block, dimension }) => {
        dimension.spawnParticle("better_on_bedrock:paper_lantern_particle", {
            x: block.location.x + 0.5,
            y: block.location.y + 0.2,
            z: block.location.z + 0.5
        });
    },
};