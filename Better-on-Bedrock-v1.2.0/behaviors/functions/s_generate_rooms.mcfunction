scoreboard objectives add rgen dummy rgen
scoreboard players random @s rgen 1 156
execute at @s[scores={rgen=1..24}] run structure load dungeon:smith_room_s ~-5 ~ ~1
execute at @s[scores={rgen=25..32}] run structure load dungeon:potion_room_s ~-5 ~ ~1
execute at @s[scores={rgen=33..56}] run structure load dungeon:4_door_room_s ~-5 ~ ~1
execute at @s[scores={rgen=57..80}] run structure load dungeon:library_roon_s ~-5 ~ ~1
execute at @s[scores={rgen=81..92}] run structure load dungeon:horse_room_s ~-3 ~ ~1
execute at @s[scores={rgen=93..104}] run structure load dungeon:boiler_room_s ~-3 ~ ~1
execute at @s[scores={rgen=105..116}] run structure load dungeon:weapon_test_room_s ~-3 ~ ~1
execute at @s[scores={rgen=117..155}] run function s_generate_halls
execute at @s[scores={rgen=156}] run structure load dungeon:rare_s ~-5 ~ ~1