export const advancedReference = `SET stores or updates a value. No separate declaration is needed.
SET count = 0
SET count = count + 1
SET count TO 2 is also accepted. Format changes it to SET count = 2.
Existing count = 2 instructions still work. In a condition, = compares values.

Lists store several values. Indexes start at 1.
SET items = [4, 7, 9]
OUTPUT items[2]
SET items[1] = 6
SET count = LENGTH(items)
OUTPUT LENGTH(items)
Use a function inside SET, OUTPUT, conditions, loop bounds, or another function call.
The Function result block stores a function result. Enter its name and inputs.
For a calculation such as LENGTH(items) + 1, enter it in the SET block value field.
CALL runs a function without storing or showing its result. Use SET or OUTPUT when you need the result.

Read a list with INPUT JSON items. Enter [4, 7, 9]. Never use plain INPUT for a list: it reads the brackets as text, and LENGTH then counts characters instead of items.
Normal INPUT still reads a number or text.

WHILE count < 5
    SET count = count + 1
ENDWHILE
Give count a value before the loop. Make sure the condition can become false.

FUNCTION double(number)
    RETURN number * 2
END FUNCTION
OUTPUT double(4)
A function gets its own variables and copies of its inputs. RETURN sends a result back. A recursive function calls itself; it needs a stopping condition. Subroutines keep their existing shared-variable behaviour.

LENGTH(items) counts items. LENGTH(text) counts text positions.
CALL APPEND(items, value) adds a copy at the end.
CALL REMOVE(items, position) removes a list item.
SLICE(items, first, last) copies a non-empty range, including both ends. It also works on text.
Text indexes use UTF-16 positions. Emoji may use two positions.

SET scores = MAP()
CALL PUT(scores, "Ada", 8)
OUTPUT GET(scores, "Ada")
HAS(scores, "Ada") checks for a key before GET. KEYS(scores) and VALUES(scores) return lists.

SET seen = SET()
SET at the start stores a variable. SET() creates an empty collection of unique values.
CALL ADD(seen, 4)
HAS(seen, 4) checks membership. Repeated values are stored once.
CALL REMOVE(seen, 4) removes a value. REMOVE also removes a map key.
Keys and set values must be numbers, text, or true/false values.

NUMBER("12"), TEXT(12), FLOOR(2.7), ABS(-3), MIN(2, 5), MAX(2, 5) convert or calculate values.
Use = and <> to compare scalar values. Collections are separate values; compare their items.
Nested lists represent matrices: grid = [[1, 2], [3, 4]]. grid[2][1] is 3.
If a source problem asks for zero-based result indexes, subtract 1 from the result index. Keep internal list indexes one-based.`;
