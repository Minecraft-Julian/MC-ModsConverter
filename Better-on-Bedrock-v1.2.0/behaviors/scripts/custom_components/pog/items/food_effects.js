/** @type { import("@minecraft/server").ItemCustomComponent } */
export const events = {
    onConsume: ({ itemStack, source }) => {
        switch (itemStack.typeId) {
            case "better_on_bedrock:healthy_carrot":
                source.addEffect("regeneration", 100, {
                    amplifier: 3,
                    showParticles: true
                });
            break;
            case "better_on_bedrock:resin_candy":
                source.addEffect("night_vision", 20 * 15, { showParticles: true });
            break;
        };
    },
};