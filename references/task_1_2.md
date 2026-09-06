Problem:
A board game uses a pack of cards. Each card has a number or a shape in a different color:

- The colours are red, green, blue and yellow.
- The card has either a number from 1 to 9 on it or a shape to represent a number:
  - a circle = 10
  - a diamond = 11
  - a square = 12.

The pseudocode should ask the user for the colour (red, green, blue and yellow) and the number (1,2,3,4,5,6,7,8,9) or shape (circle, diamond or square) of two playing cards. It will output whether the two cards have the same colour. It will output which card has the highest number.

Solution:

<!-- prettier-ignore-start -->
OUTPUT "Enter the first colour"
INPUT colour1
OUTPUT "Enter the first number or shape"
INPUT number1
IF number1 == "circle" OR number1 == "Circle" THEN
    number1 = 10
ELSEIF number1 == "diamond" OR number1 == "Diamond" THEN
    number1 = 11
ELSEIF number1 == "square" OR number1 == "Square" THEN
    number1 = 12
ENDIF
OUTPUT "Enter the second colour"
INPUT colour2
OUTPUT "Enter the second number or shape"
INPUT number2
IF number2 == "circle" OR number2 == "Circle" THEN
    number2 = 10
ELSEIF number2 == "diamond" OR number2 == "Diamond" THEN
    number2 = 11
ELSEIF number2 == "square" OR number2 == "Square" THEN
    number2 = 12
ENDIF

IF colour1 == colour2 THEN
    OUTPUT "The cards have the same colour"
ELSE
    OUTPUT "The cards have different colours"
ENDIF

IF number1 > number2 THEN
    OUTPUT "First number is larger"
ELSEIF number2 > number1 THEN
    OUTPUT "Second number is larger"
ELSE
    OUTPUT "The numbers are equal"
ENDIF
<!-- prettier-ignore-end -->
