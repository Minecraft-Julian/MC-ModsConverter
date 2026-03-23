import { world, system, TicksPerSecond, EntityIsTamedComponent } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { dimensionNames } from "../../../functionality/util";

const warpRegex = /(?:Warp:)(.*?)-((?:-|)\d+)\|((?:-|)\d+)\|((?:-|)\d+)\|(minecraft:.+)/;

/**
 * @param { import("@minecraft/server").Player } player 
 * @param { import("@minecraft/server").Block } block 
 */
function addNew(player, block) {
    const { x, y, z } = block.location;
    const isTopBit = block.permutation.getState("pog:tobBit");
    const location = { x: x + 0.5, y: isTopBit ? (y - 1) : y, z: z + 0.5 };
    const warps = player.getTags().filter((v) => v.startsWith("Warp:"));
    const globalWarps = world.getDynamicPropertyIds().filter((v) => v.startsWith("Warp:"));
    const maxWarps = world.getDynamicProperty("maxWarps") ?? 25;
    const maxGlobalWarps = world.getDynamicProperty("maxGlobalWarps") ?? 14;

    new ModalFormData()
        .title({ translate: "bob.gui.waystone.add.title" })
        .textField({
            rawtext: [
                { translate: "bob.gui.waystone.add.desc.1" }, { text: "\n\n" },
                { translate: "bob.gui.waystone.add.desc.2" }, { text: "\n\n" },
                { translate: "bob.gui.waystone.add.desc.3" }, { text: "\n\n" },
                { translate: "bob.gui.waystone.add.desc.4", with: [ warps.length.toString(), maxWarps.toString() ] },
                { text: "\n" },
                { translate: "bob.gui.waystone.add.desc.5", with: [ globalWarps.length.toString(), maxGlobalWarps.toString() ] },
            ]
        }, { translate: "bob.gui.waystone.add.placeholder" })
        .toggle({ translate: "bob.gui.waystone.add.globalToggle" })
        .submitButton({ translate: "bob.gui.waystone.add.title" })
        .show(player).then((response) => {
            if (response.canceled)
                return;

            let [name, isGlobal] = response.formValues;
            if (name.trim().length == 0)
                name = "Default"
            else if (name.toLowerCase() == "warp")
                name = name.concat(" #", warps.length);

            const warpValue = "Warp:".concat(name, "-", location.x - 0.5, "|", location.y, "|", location.z - 0.5, "|", block.dimension.id);

            if (true == isGlobal) {
                const globalWarps = world.getDynamicPropertyIds().filter((v) => v.startsWith("Warp:"));
                if (globalWarps.length > maxGlobalWarps - 1) {
                    player.sendMessage([
                        { text: "§c[!] §r" },
                        { translate: "bob.message.waystone.maxGlobalWarps" }
                    ]);
                    player.playSound("beacon.activate", {
                        location,
                        pitch: 0.5
                    });

                    return;
                };

                const w = globalWarps.find((v) => {
                    const warpName = v.match(/(?<=Warp:).*?(?=-)/)[0];
                    return warpName == name;
                });

                if (w !== undefined)
                    world.setDynamicProperty(w, undefined);

                world.setDynamicProperty("Warp:".concat(name, "-", block.dimension.id), {
                    x: location.x - 0.5,
                    y: location.y,
                    z: location.z - 0.5,
                });
            }
            else {
                const warps = player.getTags().filter((v) => v.startsWith("Warp:"));
                if (warps.length > maxWarps - 1) {
                    player.sendMessage([
                        { text: "§c[!] §r" },
                        { translate: "bob.message.waystone.maxWarps" }
                    ]);
                    player.playSound("beacon.activate", {
                        location,
                        pitch: 0.5
                    });

                    return;
                };

                const w = warps.find((v) => {
                    const warpName = v.match(/(?<=Warp:).*?(?=-)/)[0];
                    return warpName == name;
                });

                if (w !== undefined)
                    player.removeTag(w);

                player.addTag(warpValue);
            };


            const b = isTopBit ? block.below() : block.above();
            if (b.typeId == block.typeId) {
                const permutation = b.permutation;
                b.setPermutation(permutation
                    .withState("pog:activated", !isGlobal)
                    .withState("pog:activatedAsGlobal", isGlobal));
            };
            block.setPermutation(block.permutation
                .withState("pog:activated", !isGlobal)
                .withState("pog:activatedAsGlobal", isGlobal));

            player.sendMessage([
                { text: "§a[!] §r" },
                { translate: "bob.message.waystone.added" },
            ]);
            player.playSound("block.better_on_bedrock:waystone.activate", { location });
            block.dimension.spawnParticle(isGlobal ? "pog:waystone_activate_global" : "pog:waystone_activate", location);
        });
};

/*function getBlockDirection(dimension, location) {
    const volume = new BlockVolume(location, location);
    const directions = [ "north", "south", "east", "west" ];

    system.runJob(function* () {
        for (const direction of directions) {
            const permutation = BlockPermutation.resolve(
                "better_on_bedrock:waystone_block", {
                    "minecraft:cardinal_direction": direction,
                },
            );
    
            const blockList = dimension.getBlocks(volume, {
                includePermutations: [ permutation ]
            }, true);
            const locations = [ ...blockList.getBlockLocationIterator() ];
            if (locations.length <= 0)
                continue;

            console.warn(direction);
        };
    }());
};*/

/**
 * @param { import("@minecraft/server").Player } player 
 * @param { string } warpTag
 */
function warpMenu(player, warpTag) {
    let isGlobal = false;
    let warpName, xCord, yCord, zCord, dimensionName, isPinned = player.getDynamicProperty("better_on_bedrock:waystone.pinned") === warpTag ?? false;
    if (/(?:Warp:)(.*?)-(minecraft:.+)/.test(warpTag)) {
        isGlobal = true;

        const [_, name, dimension] = warpTag.match(/(?:Warp:)(.*?)-(minecraft:.+)/);
        const { x, y, z } = world.getDynamicProperty(warpTag);
        warpName = name, xCord = x, yCord = y, zCord = z, dimensionName = dimension;
    }
    else {
        const [_, name, x, y, z, dimension] = warpTag.match(warpRegex);
        warpName = name, xCord = x, yCord = y, zCord = z, dimensionName = dimension;
    };

    const warpXp = world.getDynamicProperty("warpXp") ?? 3;
    const dimensionWarpXp = world.getDynamicProperty("dimensionWarpXp") ?? 6;

    const form = new ActionFormData()
        .title({ translate: "bob.gui.waystone.info.title", with: [ warpName ] })
        .body({
            rawtext: [
                { translate: "bob.message.waystone.location" },
                {
                    translate: "bob.message.dimensionLocation",
                    with: [ xCord.toString(), yCord.toString(), zCord.toString(), dimensionNames[dimensionName] ],
                }, { text: "\n\n" },
                { translate: "bob.gui.waystone.info.desc.1" }, { text: "\n\n" },
                { translate: "bob.gui.waystone.info.desc.2", with: [ warpXp.toString() ] },
                { text: "\n\n" },
                { translate: "bob.gui.waystone.info.desc.3", with: [ dimensionWarpXp.toString() ] },
            ]
        })
        .button("§u%bob.gui.waystone.info.teleport");

    if (!isPinned)
        form.button("§q%bob.gui.waystone.info.pin")
    else form.button("§c%bob.gui.waystone.info.unpin")

    form.button("§c%bob.gui.waystone.info.remove")
        .button("§c< %gui.goBack§r");

    form.show(player).then((response) => {
        if (response.canceled)
            return;

        switch (response.selection) {
            case 0: {
                const requiredLevel = dimensionName !== player.dimension.id ? dimensionWarpXp : warpXp;
                if (player.level < requiredLevel) {
                    player.sendMessage([
                        { text: "§c[!] §r" },
                        { translate: "bob.message.notEnoughLevels" },
                    ]);
                    return;
                };

                player.camera.fade({
                    fadeColor: { red: 0, green: 0, blue: 0 },
                    fadeTime: {
                        fadeInTime: 0,
                        holdTime: 0.25,
                        fadeOutTime: 0.25,
                    },
                });

                const dimension = world.getDimension(dimensionName);
                const teleportLocation = {
                    x: Number(xCord) + 0.5,
                    y: Number(yCord),
                    z: Number(zCord) + 0.5
                };

                //getBlockDirection(dimension, teleportLocation);

                {
                    // Get tamed entities and then teleport them
                    const entities = player.dimension.getEntities({
                        location: player.location,
                        maxDistance: 10,
                    }).filter((entity) => {
                        const isTamed = entity.getComponent(EntityIsTamedComponent.componentId);
                        return isTamed != void 0;
                    });

                    for (let i = 0; i < entities.length; i++) {
                        const entity = entities[i];
                        entity.teleport(teleportLocation, { dimension });
                    };

                    // Teleport the player
                    player.teleport(teleportLocation, { dimension });
                };
                system.runTimeout(() => player.playSound("block.better_on_bedrock:waystone.teleport"), 2);
                system.runTimeout(() => player.playAnimation(`animation.waystone_teleport`), 2)
                player.sendMessage([
                    { text: "§u[!] §r" },
                    {
                        translate: "bob.message.waystone.teleporting",
                        with: [ warpName ]
                    },
                ]);
                player.startItemCooldown("marker", TicksPerSecond * 30);
                player.addLevels(-requiredLevel);
                break;
            };
            case 1: {
                if (isPinned) {
                    player.setDynamicProperty("better_on_bedrock:waystone.pinned", undefined);
                    player.sendMessage([
                        { text: "§c[!] §r" },
                        {
                            translate: "bob.message.waystone.unpinned",
                            with: [ warpName ]
                        },
                    ]);
                }
                else {
                    player.setDynamicProperty("better_on_bedrock:waystone.pinned", warpTag);
                    player.sendMessage([
                        { text: "§a[!] §r" },
                        {
                            translate: "bob.message.waystone.pinned",
                            with: [ warpName ]
                        },
                    ]);
                };

                break;
            };
            case 2: {
                if (isGlobal)
                    world.setDynamicProperty(warpTag);
                else
                    player.removeTag(warpTag);

                player.playSound(`block.better_on_bedrock:waystone.remove`)
                player.sendMessage([
                    { text: "§c[!] §r" },
                    { translate: "bob.message.waystone.removed" },
                    { text: "\n §8- §r" }, {
                        translate: (isGlobal ? "bob.message.waystone.nameGlobal" : "bob.message.waystone.name"),
                        with: [ warpName ]
                    },
                    { text: "\n §8- §r" }, { translate: "bob.message.waystone.location" },
                    {
                        translate: "bob.message.dimensionLocation",
                        with: [ xCord.toString(), yCord.toString(), zCord.toString(), dimensionNames[dimensionName] ],
                    },
                ]);
                break;
            };
            case 3:
                waystoneMenu(player);
                break;
        };
    });
};

/**
 * @param { import("@minecraft/server").Player } player 
 * @param { import("@minecraft/server").Block } block 
 */
export function waystoneMenu(player, block) {
    const globals = world.getDynamicPropertyIds().filter((v) => v.startsWith("Warp:"));
    const warps = player.getTags().filter((v) => v.startsWith("Warp:"));
    if (warps.length < 1 && globals.length < 1) {
        if (block === undefined)
            player.sendMessage([
                { text: "§c[!] §r" },
                { translate: "bob.message.waystone.zeroWaystones" }
            ]);
        else
            addNew(player, block);
        return false;
    };

    const menu = new ActionFormData()
        .title({ translate: "bob.gui.waystone.main.title" })
        .body({ translate: "bob.gui.waystone.main.desc" })

    const warpTags = [];
    const pinned = player.getDynamicProperty("better_on_bedrock:waystone.pinned");
    const pinnedWarp = [ ...globals, ...warps ].find((tag) => pinned === tag);
    if (pinnedWarp !== undefined) {
        warpTags.push(pinnedWarp);

        if (/(?:Warp:)(.*?)-(minecraft:.+)/.test(pinnedWarp)) {
            menu.button(" Waystone: §q".concat(pinnedWarp.match(/(?<=Warp:).*?(?=-)/)[0]));
        }
        else {
            menu.button(" Waystone: §v".concat(pinnedWarp.match(/(?<=Warp:).*?(?=-)/)[0]));
        };
    };

    for (const tag of globals.reverse()) {
        if (tag === pinnedWarp)
            continue;

        warpTags.push(tag);
        menu.button("Waystone: §q".concat(tag.match(/(?<=Warp:).*?(?=-)/)[0]));
    };

    for (const tag of warps.reverse()) {
        if (tag === pinnedWarp)
            continue;

        warpTags.push(tag);
        menu.button("Waystone: §v".concat(tag.match(/(?<=Warp:).*?(?=-)/)[0]));
    };

    menu.show(player).then((response) => {
        if (response.canceled)
            return;

        const selectedTag = warpTags[response.selection];
        warpMenu(player, selectedTag);
    });

    return true;
};

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    beforeOnPlayerPlace: (data) => {
        const { block, permutationToPlace } = data;
        const above = block.above();
        if (!above.isAir) {
            data.cancel = true;
            return;
        };

        system.run(() => {
            above.setPermutation(permutationToPlace.withState("pog:tobBit", true));
        });
    },
    onPlayerDestroy: ({ block, destroyedBlockPermutation, player }) => {
        const below = block.below();
        //if (below.typeId == destroyedBlockPermutation.type.id)
        //    below.setType("minecraft:air");

        const { x, y, z } = block.location;
        const isTopBit = destroyedBlockPermutation.getState("pog:tobBit");
        const location = { x, y: isTopBit ? (y - 1) : y, z };

        const other = block.dimension.getBlock(location);
        if (other.typeId == destroyedBlockPermutation.type.id)
            other.setType("minecraft:air");

        // Global warps
        const globals = world.getDynamicPropertyIds().filter((v) => v.startsWith("Warp:"));
        const g = globals.filter((v) => {
            const { x, y, z } = world.getDynamicProperty(v);
            return (
                location.x == x
                && location.y == y
                && location.z == z
            );
        });

        for (let tag of g) {
            const { x, y, z } = world.getDynamicProperty(tag);
            const [_, warpName, dimensionName] = tag.match(/(?:Warp:)(.*?)-(minecraft:.+)/);
            player.playSound(`block.better_on_bedrock:waystone.remove`)
            world.setDynamicProperty(tag, undefined);
            player.sendMessage([
                { text: "§c[!] §r" },
                { translate: "bob.message.waystone.removed" },
                { text: "\n §8- §r" }, { translate: "bob.message.waystone.name", with: [ warpName ] },
                { text: "\n §8- §r" }, { translate: "bob.message.waystone.location" },
                {
                    translate: "bob.message.dimensionLocation",
                    with: [ x.toString(), y.toString(), z.toString(), dimensionNames[dimensionName] ],
                },
            ]);
        };

        // Player warps
        const warps = player.getTags().filter((v) => v.startsWith("Warp:"));
        const w = warps.filter((v) => {
            const [_, warpName, xCord, yCord, zCord, dimensionName] = v.match(warpRegex);
            return (
                location.x == Number(xCord)
                && location.y == Number(yCord)
                && location.z == Number(zCord)
            );
        });

        for (let tag of w) {
            const [_, warpName, xCord, yCord, zCord, dimensionName] = tag.match(warpRegex);

            player.removeTag(tag);
            player.playSound(`block.better_on_bedrock:waystone.remove`)
            player.sendMessage([
                { text: "§c[!] §r" },
                { translate: "bob.message.waystone.removed" },
                { text: "\n §8- §r" }, { translate: "bob.message.waystone.name", with: [ warpName ] },
                { text: "\n §8- §r" }, { translate: "bob.message.waystone.location" },
                {
                    translate: "bob.message.dimensionLocation",
                    with: [ xCord, yCord, zCord, dimensionNames[dimensionName] ],
                },
            ]);
        };
    },
    onPlayerInteract: ({ block, dimension, player }) => {
        const isGlobal = block.permutation.getState("pog:activatedAsGlobal");
        const isActivated = block.permutation.getState("pog:activated");
        if ((isActivated || isGlobal) && !player.isSneaking) {
            waystoneMenu(player, block);
        }
        else {
            addNew(player, block);
        };
    },
};