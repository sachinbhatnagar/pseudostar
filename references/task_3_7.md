Problem:
A door lock allows 3 attempts. The correct password is stored in password and starts as LOCKED.

Write sub-routines:

- checkPassword() asks the user to enter a password. If it matches LOCKED, it sets unlocked to "yes", otherwise it sets unlocked to "no"
- showResult() outputs Access granted if unlocked is "yes", otherwise it outputs Access denied

The main algorithm should set unlocked to "no", then use a count-controlled loop to call checkPassword() up to 3 times. If the password is correct, the loop should still finish the remaining structure as written in the solution, but showResult() is only called after the loop. If the password is already correct, further attempts are skipped.

Solution:

<!-- prettier-ignore-start -->
SUB-ROUTINE checkPassword()
    OUTPUT "Enter the password"
    INPUT attempt
    IF attempt = password THEN
        unlocked = "yes"
    ELSE
        unlocked = "no"
    ENDIF
END SUB

SUB-ROUTINE showResult()
    IF unlocked = "yes" THEN
        OUTPUT "Access granted"
    ELSE
        OUTPUT "Access denied"
    ENDIF
END SUB

password = "LOCKED"
unlocked = "no"
FOR counter = 1 TO 3
    IF unlocked = "no" THEN
        checkPassword()
    ENDIF
NEXT counter
showResult()
<!-- prettier-ignore-end -->
