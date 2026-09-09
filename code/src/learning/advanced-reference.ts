export const advancedReference = `Lists store several values. Indexes start at 1.
items = [4, 7, 9]
OUTPUT items[2]
items[1] = 6

Read a list with INPUT JSON items. Enter [4, 7, 9]. Normal INPUT still reads a number or text.

WHILE count < 5
    count = count + 1
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

scores = MAP()
CALL PUT(scores, "Ada", 8)
OUTPUT GET(scores, "Ada")
HAS(scores, "Ada") checks for a key before GET. KEYS(scores) and VALUES(scores) return lists.

seen = SET()
CALL ADD(seen, 4)
HAS(seen, 4) checks membership. Repeated values are stored once.
CALL REMOVE(seen, 4) removes a value. REMOVE also removes a map key.
Keys and set values must be numbers, text, or true/false values.

NUMBER("12"), TEXT(12), FLOOR(2.7), ABS(-3), MIN(2, 5), MAX(2, 5) convert or calculate values.
Use = and <> to compare scalar values. Collections are separate values; compare their items.
Nested lists represent matrices: grid = [[1, 2], [3, 4]]. grid[2][1] is 3.
If a source problem asks for zero-based result indexes, subtract 1 from the result index. Keep internal list indexes one-based.`;
