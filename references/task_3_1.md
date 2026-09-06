Problem:
A character in a computer game has an x position stored in xCoord and a y position stored in yCoord. Both positions must stay between 0 and 1024 inclusive.

The sub-routine moveRight() should add 1 to xCoord. If xCoord is then greater than 1024, it should be set to 1024.

The main algorithm should set the start position to x = 500 and y = 450, ask if the user wants to move right, call moveRight() if they do, then output the new position.

Solution:

<!-- prettier-ignore-start -->
SUB-ROUTINE moveRight()
    xCoord = xCoord + 1
    IF xCoord > 1024 THEN
        xCoord = 1024
    ENDIF
END SUB

xCoord = 500
yCoord = 450
OUTPUT "Do you want to move right?"
INPUT choice
IF choice = "YES" OR choice = "yes" OR choice = "Yes" THEN
    moveRight()
ENDIF
OUTPUT "New position is x=" & xCoord & " y= " & yCoord
<!-- prettier-ignore-end -->
