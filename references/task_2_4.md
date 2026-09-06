Problem:
This pseudocode algorithm should ask the user to enter 10 whole numbers. It should count how many of the numbers are even and how many are odd, then output both totals.

Solution:

<!-- prettier-ignore-start -->
evenCount = 0
oddCount = 0
FOR counter = 1 TO 10
    OUTPUT "Enter a whole number"
    INPUT number
    IF number MOD 2 == 0 THEN
        evenCount = evenCount + 1
    ELSE
        oddCount = oddCount + 1
    ENDIF
NEXT counter
OUTPUT "Even numbers: ", evenCount
OUTPUT "Odd numbers: ", oddCount
<!-- prettier-ignore-end -->
