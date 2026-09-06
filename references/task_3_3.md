Problem:
A game character has health stored in health. Health must stay between 0 and 100 inclusive.

Write sub-routines:

- takeDamage() asks the user how much damage to apply, subtracts that amount from health, then sets health to 0 if it falls below 0
- heal() asks the user how much to heal, adds that amount to health, then sets health to 100 if it goes above 100
- showHealth() outputs the current health

The main algorithm should start health at 80. It should ask the user to enter attack or heal, call the matching sub-routine, then call showHealth(). If the choice is not recognised, it should output an error message.

Solution:

<!-- prettier-ignore-start -->
SUB-ROUTINE takeDamage()
    OUTPUT "Enter damage"
    INPUT damage
    health = health - damage
    IF health < 0 THEN
        health = 0
    ENDIF
END SUB

SUB-ROUTINE heal()
    OUTPUT "Enter heal amount"
    INPUT amount
    health = health + amount
    IF health > 100 THEN
        health = 100
    ENDIF
END SUB

SUB-ROUTINE showHealth()
    OUTPUT "Health is " & health
END SUB

health = 80
OUTPUT "Enter attack or heal"
INPUT choice
IF choice = "attack" OR choice = "Attack" THEN
    takeDamage()
ELSEIF choice = "heal" OR choice = "Heal" THEN
    heal()
ELSE
    OUTPUT "Choice not recognised"
ENDIF
showHealth()
<!-- prettier-ignore-end -->
