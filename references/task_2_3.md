Problem:
A teacher records a test mark out of 100 for each of 5 students. This pseudocode algorithm should:

- Ask the user to enter the 5 marks.
- Add the marks together to find the total.
- Output the total and the average mark.

Solution:

<!-- prettier-ignore-start -->
total = 0
FOR counter IN RANGE(1, 6):
    OUTPUT "Enter mark"
    INPUT mark
    total = total + mark
average = total / 5
OUTPUT "The total is ", total
OUTPUT "The average is ", average
<!-- prettier-ignore-end -->
