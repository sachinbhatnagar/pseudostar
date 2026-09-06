Problem:
A shop records the number of items sold on each of 7 days. This pseudocode algorithm should:

- Ask the user to enter the number of items sold each day.
- Add the daily totals to find the weekly total.
- Count how many days had more than 50 items sold.
- Output the weekly total and the number of days with more than 50 items sold.

Solution:

<!-- prettier-ignore-start -->
weeklyTotal = 0
busyDays = 0
FOR day IN RANGE(0, 7):
    OUTPUT "Enter items sold"
    INPUT sold
    weeklyTotal = weeklyTotal + sold
    IF sold > 50 THEN
        busyDays = busyDays + 1
    ENDIF
OUTPUT "Weekly total is ", weeklyTotal
OUTPUT "Busy days: ", busyDays
<!-- prettier-ignore-end -->
