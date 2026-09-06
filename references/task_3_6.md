Problem:
A teacher asks 5 students a multiplication question. The two numbers for the question are stored in number1 and number2.

Write a sub-routine askQuestion() that:

- outputs the multiplication question
- inputs the student's answer
- outputs Correct or Incorrect
- adds 1 to score if the answer is right

The main algorithm should set number1 to 7 and number2 to 8, set score to 0, then use a count-controlled loop to call askQuestion() 5 times. It should then output the final score.

Solution:

<!-- prettier-ignore-start -->
SUB-ROUTINE askQuestion()
    OUTPUT "What is " & number1 & " * " & number2 & "?"
    INPUT answer
    IF answer = (number1 * number2) THEN
        OUTPUT "Correct"
        score = score + 1
    ELSE
        OUTPUT "Incorrect"
    ENDIF
END SUB

number1 = 7
number2 = 8
score = 0
FOR counter = 1 TO 5
    askQuestion()
NEXT counter
OUTPUT "Final score is " & score
<!-- prettier-ignore-end -->
