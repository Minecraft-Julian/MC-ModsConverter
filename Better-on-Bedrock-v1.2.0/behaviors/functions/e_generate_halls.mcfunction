scoreboard objectives add rgen dummy rgen
scoreboard players random @s rgen 1 29
execute at @s[scores={rgen=1..18}] run structure load dungeon:mpassage_e ~1 ~ ~-5
execute at @s[scores={rgen=19..24}] run structure load dungeon:hall_trap_e ~1 ~-5 ~-6
execute at @s[scores={rgen=25..29}] run structure load dungeon:hall_room_e ~1 ~ ~-9