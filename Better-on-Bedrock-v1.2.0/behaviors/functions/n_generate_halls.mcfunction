scoreboard objectives add rgen dummy rgen
scoreboard players random @s rgen 1 29


execute at @s[scores={rgen=1..18}] run structure load dungeon:mpassage_n ~-5 ~ ~-15
execute at @s[scores={rgen=19..24}] run structure load dungeon:hall_trap_n ~-6 ~-5 ~-15
execute at @s[scores={rgen=25..29}] run structure load dungeon:hall_room_n ~-9 ~ ~-15