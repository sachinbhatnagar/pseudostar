Problem:
This pseudocode algorithm should take three numbers as input, multiply the two largest numbers and output the result.

Solution:

<!-- prettier-ignore-start -->
INPUT first
INPUT second
INPUT third
IF first <= second AND first <= third THEN
    result = second * third
ELSEIF second < third THEN
    result = first * third
ELSE
    result = first * second
ENDIF
PRINT "The result is " + result
<!-- prettier-ignore-end -->
