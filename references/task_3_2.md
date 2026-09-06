Problem:
A character in a computer game has an x position stored in xCoord and a y position stored in yCoord. Both positions must stay between 0 and 1024 inclusive.

Write sub-routines:

- moveRight() adds 1 to xCoord, but must not go above 1024
- moveLeft() subtracts 1 from xCoord, but must not go below 0
- moveUp() subtracts 1 from yCoord, but must not go below 0
- moveDown() adds 1 to yCoord, but must not go above 1024

The main algorithm should start the character at x = 500 and y = 450. It should ask the user for a direction (left, right, up or down), call the matching sub-routine, then output the new position. If the direction is not recognised, it should output an error message and not move the character.

Solution:

<!-- prettier-ignore-start -->
SUB-ROUTINE moveRight()
    xCoord = xCoord + 1
    IF xCoord > 1024 THEN
        xCoord = 1024
    ENDIF
END SUB

SUB-ROUTINE moveLeft()
    xCoord = xCoord - 1
    IF xCoord < 0 THEN
        xCoord = 0
    ENDIF
END SUB

SUB-ROUTINE moveUp()
    yCoord = yCoord - 1
    IF yCoord < 0 THEN
        yCoord = 0
    ENDIF
END SUB

SUB-ROUTINE moveDown()
    yCoord = yCoord + 1
    IF yCoord > 1024 THEN
        yCoord = 1024
    ENDIF
END SUB

xCoord = 500
yCoord = 450
OUTPUT "Enter a direction"
INPUT direction
IF direction = "right" OR direction = "Right" THEN
    moveRight()
ELSEIF direction = "left" OR direction = "Left" THEN
    moveLeft()
ELSEIF direction = "up" OR direction = "Up" THEN
    moveUp()
ELSEIF direction = "down" OR direction = "Down" THEN
    moveDown()
ELSE
    OUTPUT "Direction not recognised"
ENDIF
OUTPUT "New position is x=" & xCoord & " y= " & yCoord
<!-- prettier-ignore-end -->
