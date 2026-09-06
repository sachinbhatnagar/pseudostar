Problem:
This pseudocode algorithm checks if a game user is able to purchase the Shield of Strength in a computer game. They can purchase the item if they already have the Emerald Stone, they have at least $100 and are on or above Level 3.

Solution:

<!-- prettier-ignore-start -->
OUTPUT "How much money do you have?"
INPUT money
OUTPUT "Do you have the Emerald Stone?"
INPUT stone
OUTPUT "What level are you on?"
INPUT level
IF level < 3 THEN
    OUTPUT "Your level is not high enough yet"
ELSEIF stone = "no" OR stone = "NO" OR stone = "No" THEN
    OUTPUT "You need to find the Emerald Stone"
ELSEIF money < 100 THEN
    OUTPUT "You don't have enough money yet"
ELSE
    OUTPUT "Congratulations, here is the Shield of Strength"
ENDIF
<!-- prettier-ignore-end -->
