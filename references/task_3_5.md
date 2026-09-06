Problem:
A player can buy the Shield of Strength only if they have the Emerald Stone, have at least $100 and are on Level 3 or above.

Write a sub-routine checkPurchase() that:

- asks for money, whether they have the Emerald Stone, and their level
- outputs why the purchase fails if any rule is not met
- outputs a congratulations message if all rules are met

The main algorithm should call checkPurchase().

Solution:

<!-- prettier-ignore-start -->
SUB-ROUTINE checkPurchase()
    OUTPUT "How much money do you have?"
    INPUT money
    OUTPUT "Do you have the Emerald Stone?"
    INPUT stone
    OUTPUT "What level are you on?"
    INPUT level
    IF level < 3 THEN
        OUTPUT "Your level is not high enough yet"
    ELSEIF stone = "no" OR stone = "NO" OR stone = "No" THEN
        OUTPUT "You need to find the Emerald Stone"
    ELSEIF money < 100 THEN
        OUTPUT "You don't have enough money yet"
    ELSE
        OUTPUT "Congratulations, here is the Shield of Strength"
    ENDIF
END SUB

checkPurchase()
<!-- prettier-ignore-end -->
