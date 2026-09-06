Problem:
This pseudocode algorithm should:

- Ask the user to input their name and two numbers.
- Ask the user to input what the two numbers equal when added together.
- Ask the user to input what the two numbers equal when multiplied together.
- Output whether each answer input was correct.
- Output a message saying how many answers the user got correct.

Solution:

<!-- prettier-ignore-start -->
OUTPUT "Enter your name"
INPUT name
OUTPUT "Enter two numbers"
INPUT number1
INPUT number2
OUTPUT "What is ", number1, " + ", number2, "?"
INPUT answer
correct = 0
IF answer == (number1 + number2) THEN
    OUTPUT "Correct"
    correct = correct + 1
ELSE
    OUTPUT "Incorrect"
ENDIF
OUTPUT "What is ", number1, " * ", number2, "?"
INPUT answer
IF answer == (number1 * number2) THEN
    OUTPUT "Correct"
    correct = correct + 1
ELSE
    OUTPUT "Incorrect"
ENDIF
OUTPUT name, " you got ", correct, " correct"
<!-- prettier-ignore-end -->
