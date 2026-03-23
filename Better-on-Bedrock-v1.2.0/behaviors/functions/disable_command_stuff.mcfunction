
execute if entity @p[tag=!disableCommands, c=1] run gamerule commandblockoutput false
execute if entity @p[tag=!disableCommands, c=1] run gamerule sendcommandfeedback true
execute if entity @p[tag=!disableCommands, c=1] run tag @p add disableCommands