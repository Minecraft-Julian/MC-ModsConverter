import {
    EntityEquippableComponent,
    EquipmentSlot,
    Direction,
    GameMode
} from "@minecraft/server";

/** @type { import("@minecraft/server").BlockCustomComponent } */
export const events = {
    onPlayerInteract: ({ block, player, face }) => {
        const equippable = player.getComponent(EntityEquippableComponent.componentId);
        const itemStack = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (itemStack === void 0)
            return;

        const isDouble = block.permutation.getState("kai:double");
        if (block.typeId !== itemStack.typeId || isDouble)
            return;

        const verticalHalf = block.permutation.getState("minecraft:vertical_half");
        const isBottomUp = (verticalHalf === "bottom") && (face === Direction.Up);
        const isTopDown = (verticalHalf === "top") && (face === Direction.Down);
        if (!isBottomUp && !isTopDown)
            return;

        if (player.getGameMode() !== GameMode.creative) {
            if (itemStack.amount == 1) {
                itemStack.setItem(void 0);
            }
            else itemStack.amount--;
        };

        block.setPermutation(
            block.permutation.withState("kai:double", true),
        );
        player.playSound("use.stone");
    },
};