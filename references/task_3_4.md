Problem:
A shop calculates the cost of a stay. An elite room costs $100 a night and a basic room costs $50 a night. Gold members get 20% off, silver members get 10% off and bronze members get 5% off. Any other membership level is not valid.

Write sub-routines:

- setRoomCost() asks for the room type and number of nights, then sets cost. If the room is elite it uses $100 a night, otherwise it uses $50 a night
- applyDiscount() asks for the membership level and updates cost. If the level is not gold, silver or bronze, it outputs an error and does not change cost
- showTotal() outputs the total cost

The main algorithm should call setRoomCost(), then ask if the customer is a member. If they answer yes, it should call applyDiscount(). It should then call showTotal().

Solution:

<!-- prettier-ignore-start -->
SUB-ROUTINE setRoomCost()
    OUTPUT "Enter the room type"
    INPUT room
    OUTPUT "Enter the number of nights"
    INPUT nights
    IF room = "elite" OR room = "Elite" THEN
        cost = 100 * nights
    ELSE
        cost = 50 * nights
    ENDIF
END SUB

SUB-ROUTINE applyDiscount()
    OUTPUT "What level?"
    INPUT level
    IF level = "gold" OR level = "Gold" THEN
        cost = cost * 0.8
    ELSEIF level = "silver" OR level = "Silver" THEN
        cost = cost * 0.9
    ELSEIF level = "bronze" OR level = "Bronze" THEN
        cost = cost * 0.95
    ELSE
        OUTPUT "Membership level not recognised"
    ENDIF
END SUB

SUB-ROUTINE showTotal()
    OUTPUT "Total cost is " & cost
END SUB

setRoomCost()
OUTPUT "Are you a member?"
INPUT member
IF member = "Yes" OR member = "yes" THEN
    applyDiscount()
ENDIF
showTotal()
<!-- prettier-ignore-end -->
