Problem:
The following pseudocode algorithm should calculate and output the cost of a hotel stay for a customer.

There are two types of room:

- an elite room costs $100 a night
- a basic room costs $50 a night.

Some customers are members. If they are a Gold member, they get a 20% discount. If they are a Silver member, they get a 10% discount. If they are a Bronze member, they get a 5% discount. If the membership level is not recognised, then an error message is output.

Solution:

<!-- prettier-ignore-start -->
OUTPUT "Enter the room type"
INPUT room
OUTPUT "Enter the number of nights"
INPUT nights
IF room == "elite" OR room == "Elite" THEN
    cost = 100 * nights
ELSE
    cost = 50 * nights
ENDIF
OUTPUT "Are you a member?"
INPUT member
IF member == "Yes" OR member == "yes" THEN
    OUTPUT "What level?"
    INPUT level
    IF level == "gold" OR level == "Gold" THEN
        cost = cost * 0.8
    ELSEIF level == "silver" OR level == "Silver" THEN
        cost = cost * 0.9
    ELSEIF level == "bronze" OR level == "Bronze" THEN
        cost = cost * 0.95
    ELSE
        OUTPUT "Membership level not recognised"
    ENDIF
ENDIF
OUTPUT "Total cost is ", cost
<!-- prettier-ignore-end -->
