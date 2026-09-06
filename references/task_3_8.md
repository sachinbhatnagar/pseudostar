Problem:
A game character starts with health 100 and energy 50. Health must stay between 0 and 100. Energy must stay between 0 and 50.

Write sub-routines:

- attack() uses 10 energy. If energy is at least 10, subtract 10 from energy and subtract 15 from the enemy's health. If energy is below 10, output Not enough energy and do not change any values. Enemy health must not go below 0
- rest() adds 10 to energy, but energy must not go above 50
- showStatus() outputs the character's health, energy and the enemy's health

The enemy starts with health 60. The main algorithm should use a count-controlled loop 4 times. Each time it should ask the user to enter attack or rest, call the matching sub-routine, then call showStatus(). If the choice is not recognised, it should output an error message.

Solution:

<!-- prettier-ignore-start -->
SUB-ROUTINE attack()
    IF energy < 10 THEN
        OUTPUT "Not enough energy"
    ELSE
        energy = energy - 10
        enemyHealth = enemyHealth - 15
        IF enemyHealth < 0 THEN
            enemyHealth = 0
        ENDIF
    ENDIF
END SUB

SUB-ROUTINE rest()
    energy = energy + 10
    IF energy > 50 THEN
        energy = 50
    ENDIF
END SUB

SUB-ROUTINE showStatus()
    OUTPUT "Health is " & health
    OUTPUT "Energy is " & energy
    OUTPUT "Enemy health is " & enemyHealth
END SUB

health = 100
energy = 50
enemyHealth = 60
FOR turn = 1 TO 4
    OUTPUT "Enter attack or rest"
    INPUT choice
    IF choice = "attack" OR choice = "Attack" THEN
        attack()
    ELSEIF choice = "rest" OR choice = "Rest" THEN
        rest()
    ELSE
        OUTPUT "Choice not recognised"
    ENDIF
    showStatus()
NEXT turn
<!-- prettier-ignore-end -->
