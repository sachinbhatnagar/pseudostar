Problem:
This pseudocode algorithm should ask the user to enter a number. It should then output the multiplication table for that number from 1 to 12.

Solution:

<!-- prettier-ignore-start -->
OUTPUT "Enter a number"
INPUT number
FOR counter = 1 TO 12
    result = number * counter
    OUTPUT number, " x ", counter, " = ", result
NEXT counter
<!-- prettier-ignore-end -->
