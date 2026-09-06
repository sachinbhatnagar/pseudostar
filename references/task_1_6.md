Problem:
This pseudocode algorithm asks a user to enter the x-coordinate and y-coordinate of a character in a game. The character is off the screen if either value is less than 0 or more than 1024.

Solution:

<!-- prettier-ignore-start -->
OUTPUT "Enter the x-coordinate"
INPUT xCoord
OUTPUT "Enter the y-coordinate"
INPUT yCoord
IF xCoord < 0 OR yCoord < 0 OR xCoord > 1024 OR yCoord > 1024
THEN
    OUTPUT "Your character is off the screen"
ELSE
    OUTPUT "Your character is still on screen"
ENDIF
<!-- prettier-ignore-end -->
