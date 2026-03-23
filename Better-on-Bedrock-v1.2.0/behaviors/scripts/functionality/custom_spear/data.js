import { world } from "@minecraft/server";
import { RiptideEnvironment } from "./interfaces";
export const waitTicks = 3;
export const CustomTridents = [

    {
        itemID: "better_on_bedrock:stardust_spear",
        projectile: {
            entityID: "better_on_bedrock:thrown_stardust_spear",
            thrownVelocity: 3,
            returnSpeed: 1,
            onReturn: (trident, dimension, owner, level) => {
                world.sendMessage(`${owner.nameTag} is returning ${trident.typeId} with a level of ${level}`);
            },
            returnSound: {
                id: "item.trident.return",
                volume: 1,
                pitch: 1
            },
            thrownSound: {
                id: "item.trident.throw",
                volume: 1,
                pitch: 1
            }
        },
        riptide: {
            environment: RiptideEnvironment.Water,
            velocity: 2.40,
            onRiptide: (player, level) => {
                world.sendMessage(`${player.name} is riptiding with a level of ${level}`);
            },
            sound: {
                ids: ["item.trident.riptide_1", "item.trident.riptide_2", "item.trident.riptide_3"],
                volume: 1
            }
        }
    },
    {
        itemID: "better_on_bedrock:wooden_spear",
        projectile: {
            entityID: "better_on_bedrock:thrown_wooden_spear",
            thrownVelocity: 3,
            returnSpeed: 1,
            onReturn: (trident, dimension, owner, level) => {
                world.sendMessage(`${owner.nameTag} is returning ${trident.typeId} with a level of ${level}`);
            },
            returnSound: {
                id: "item.trident.return",
                volume: 1,
                pitch: 1
            },
            thrownSound: {
                id: "item.trident.throw",
                volume: 1,
                pitch: 1
            }
        },
        riptide: {
            environment: RiptideEnvironment.Water,
            velocity: 2.40,
            onRiptide: (player, level) => {
                world.sendMessage(`${player.name} is riptiding with a level of ${level}`);
            },
            sound: {
                ids: ["item.trident.riptide_1", "item.trident.riptide_2", "item.trident.riptide_3"],
                volume: 1
            }
        }
    }, {
        itemID: "better_on_bedrock:stone_spear",
        projectile: {
            entityID: "better_on_bedrock:thrown_stone_spear",
            thrownVelocity: 3,
            returnSpeed: 1,
            onReturn: (trident, dimension, owner, level) => {
                world.sendMessage(`${owner.nameTag} is returning ${trident.typeId} with a level of ${level}`);
            },
            returnSound: {
                id: "item.trident.return",
                volume: 1,
                pitch: 1
            },
            thrownSound: {
                id: "item.trident.throw",
                volume: 1,
                pitch: 1
            }
        },
        riptide: {
            environment: RiptideEnvironment.Water,
            velocity: 2.40,
            onRiptide: (player, level) => {
                world.sendMessage(`${player.name} is riptiding with a level of ${level}`);
            },
            sound: {
                ids: ["item.trident.riptide_1", "item.trident.riptide_2", "item.trident.riptide_3"],
                volume: 1
            }
        }
    },
    {
        itemID: "better_on_bedrock:iron_spear",
        projectile: {
            entityID: "better_on_bedrock:thrown_iron_spear",
            thrownVelocity: 3,
            returnSpeed: 1,
            onReturn: (trident, dimension, owner, level) => {
                world.sendMessage(`${owner.nameTag} is returning ${trident.typeId} with a level of ${level}`);
            },
            returnSound: {
                id: "item.trident.return",
                volume: 1,
                pitch: 1
            },
            thrownSound: {
                id: "item.trident.throw",
                volume: 1,
                pitch: 1
            }
        },
        riptide: {
            environment: RiptideEnvironment.Water,
            velocity: 2.40,
            onRiptide: (player, level) => {
                world.sendMessage(`${player.name} is riptiding with a level of ${level}`);
            },
            sound: {
                ids: ["item.trident.riptide_1", "item.trident.riptide_2", "item.trident.riptide_3"],
                volume: 1
            }
        }
    },
    {
        itemID: "better_on_bedrock:golden_spear",
        projectile: {
            entityID: "better_on_bedrock:thrown_golden_spear",
            thrownVelocity: 3,
            returnSpeed: 1,
            onReturn: (trident, dimension, owner, level) => {
                world.sendMessage(`${owner.nameTag} is returning ${trident.typeId} with a level of ${level}`);
            },
            returnSound: {
                id: "item.trident.return",
                volume: 1,
                pitch: 1
            },
            thrownSound: {
                id: "item.trident.throw",
                volume: 1,
                pitch: 1
            }
        },
        riptide: {
            environment: RiptideEnvironment.Water,
            velocity: 2.40,
            onRiptide: (player, level) => {
                world.sendMessage(`${player.name} is riptiding with a level of ${level}`);
            },
            sound: {
                ids: ["item.trident.riptide_1", "item.trident.riptide_2", "item.trident.riptide_3"],
                volume: 1
            }
        }
    },
    {
        itemID: "better_on_bedrock:diamond_spear",
        projectile: {
            entityID: "better_on_bedrock:thrown_diamond_spear",
            thrownVelocity: 3,
            returnSpeed: 1,
            onReturn: (trident, dimension, owner, level) => {
                world.sendMessage(`${owner.nameTag} is returning ${trident.typeId} with a level of ${level}`);
            },
            returnSound: {
                id: "item.trident.return",
                volume: 1,
                pitch: 1
            },
            thrownSound: {
                id: "item.trident.throw",
                volume: 1,
                pitch: 1
            }
        },
        riptide: {
            environment: RiptideEnvironment.Water,
            velocity: 2.40,
            onRiptide: (player, level) => {
                world.sendMessage(`${player.name} is riptiding with a level of ${level}`);
            },
            sound: {
                ids: ["item.trident.riptide_1", "item.trident.riptide_2", "item.trident.riptide_3"],
                volume: 1
            }
        }
    },
    {
        itemID: "better_on_bedrock:amethyst_spear",
        projectile: {
            entityID: "better_on_bedrock:thrown_amethyst_spear",
            thrownVelocity: 3,
            returnSpeed: 1,
            onReturn: (trident, dimension, owner, level) => {
                world.sendMessage(`${owner.nameTag} is returning ${trident.typeId} with a level of ${level}`);
            },
            returnSound: {
                id: "item.trident.return",
                volume: 1,
                pitch: 1
            },
            thrownSound: {
                id: "item.trident.throw",
                volume: 1,
                pitch: 1
            }
        },
        riptide: {
            environment: RiptideEnvironment.Water,
            velocity: 2.40,
            onRiptide: (player, level) => {
                world.sendMessage(`${player.name} is riptiding with a level of ${level}`);
            },
            sound: {
                ids: ["item.trident.riptide_1", "item.trident.riptide_2", "item.trident.riptide_3"],
                volume: 1
            }
        }
    }
];
