import type { Problem } from '../types';

export const medium: Problem[] = [
  {
    id: 'ref-1-2',
    title: 'Card colour and rank',
    difficulty: 'Medium',
    referenceIds: ['task_1_2'],
    concepts: ['selection', 'OR', 'comparison'],
    statement:
      'Read colour and rank for card 1, then colour and rank for card 2. Colours are lowercase red, green, blue or yellow. Ranks are 1 to 9, circle/Circle (10), diamond/Diamond (11), or square/Square (12). First output "The cards have the same colour" or "The cards have different colours". Then output "First number is larger", "Second number is larger", or "The numbers are equal".',
    starter: 'INPUT colour1\nINPUT number1',
    hints: [
      'Colour and rank are independent results.',
      'How can a shape take part in a numerical comparison?',
      'Convert both shapes before comparing ranks, and include equality.',
    ],
    samples: [
      {
        inputs: ['red', 'circle', 'red', '9'],
        outputs: ['The cards have the same colour', 'First number is larger'],
      },
    ],
    cases: [
      {
        inputs: ['red', 'circle', 'red', '9'],
        expectedOutput: ['The cards have the same colour', 'First number is larger'],
      },
      {
        inputs: ['blue', '1', 'yellow', 'Square'],
        expectedOutput: ['The cards have different colours', 'Second number is larger'],
      },
      {
        inputs: ['green', 'diamond', 'blue', 'Diamond'],
        expectedOutput: ['The cards have different colours', 'The numbers are equal'],
      },
      {
        inputs: ['red', '9', 'blue', '2'],
        expectedOutput: ['The cards have different colours', 'First number is larger'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-1-3',
    title: 'Multiply the largest pair',
    difficulty: 'Medium',
    referenceIds: ['task_1_3'],
    concepts: ['selection', 'comparison', 'arithmetic'],
    statement:
      'Read three numbers, which can be negative or equal. Multiply the two largest values by numerical order, not the pair with the greatest product. Output "The result is " followed by the product.',
    starter: 'INPUT first\nINPUT second\nINPUT third',
    hints: [
      'One value must be left out.',
      'Which value is no larger than either of the others?',
      'Find the smallest value and multiply the other two; allow tied values.',
    ],
    samples: [
      {
        inputs: ['2', '4', '3'],
        outputs: ['The result is 12'],
      },
    ],
    cases: [
      {
        inputs: ['2', '4', '3'],
        expectedOutput: ['The result is 12'],
      },
      {
        inputs: ['4', '2', '3'],
        expectedOutput: ['The result is 12'],
      },
      {
        inputs: ['4', '3', '2'],
        expectedOutput: ['The result is 12'],
      },
      {
        inputs: ['2', '3', '4'],
        expectedOutput: ['The result is 12'],
      },
      {
        inputs: ['3', '2', '4'],
        expectedOutput: ['The result is 12'],
      },
      {
        inputs: ['3', '4', '2'],
        expectedOutput: ['The result is 12'],
      },
      {
        inputs: ['5', '5', '1'],
        expectedOutput: ['The result is 25'],
      },
      {
        inputs: ['-5', '-2', '-3'],
        expectedOutput: ['The result is 6'],
      },
      {
        inputs: ['2', '2', '2'],
        expectedOutput: ['The result is 4'],
      },
      {
        inputs: ['5', '1', '5'],
        expectedOutput: ['The result is 25'],
      },
      {
        inputs: ['1', '5', '5'],
        expectedOutput: ['The result is 25'],
      },
      {
        inputs: ['-5', '-4', '2'],
        expectedOutput: ['The result is -8'],
      },
      {
        inputs: ['0', '0', '-1'],
        expectedOutput: ['The result is 0'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-1-4',
    title: 'Two-question score',
    difficulty: 'Medium',
    referenceIds: ['task_1_4'],
    concepts: ['input', 'selection', 'accumulator'],
    statement:
      'Read a name, two numbers, an answer to their sum, and an answer to their product, in that order. After each answer output "Correct" or "Incorrect". Finally output "<name> you got <score> correct", with score from 0 to 2.',
    starter: 'INPUT name\nINPUT number1\nINPUT number2',
    hints: [
      'Score counts correct answers, not questions asked.',
      'Should a wrong first answer prevent checking the second?',
      'Check the answers independently and update one shared score.',
    ],
    samples: [
      {
        inputs: ['Asha', '3', '4', '7', '12'],
        outputs: ['Correct', 'Correct', 'Asha you got 2 correct'],
      },
    ],
    cases: [
      {
        inputs: ['Asha', '3', '4', '7', '12'],
        expectedOutput: ['Correct', 'Correct', 'Asha you got 2 correct'],
      },
      {
        inputs: ['Ben', '0', '4', '0', '0'],
        expectedOutput: ['Incorrect', 'Correct', 'Ben you got 1 correct'],
      },
      {
        inputs: ['Cy', '2', '5', '8', '11'],
        expectedOutput: ['Incorrect', 'Incorrect', 'Cy you got 0 correct'],
      },
      {
        inputs: ['Dee', '2', '3', '5', '7'],
        expectedOutput: ['Correct', 'Incorrect', 'Dee you got 1 correct'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-1-5',
    title: 'Hotel bill',
    difficulty: 'Medium',
    referenceIds: ['task_1_5'],
    concepts: ['selection', 'nested selection', 'percentage'],
    statement:
      'Read room type, positive whole nights, and membership answer. elite/Elite costs 100 per night; basic/Basic costs 50. A yes/Yes answer requires one more input: level. gold/Gold gives 20% off, silver/Silver 10%, bronze/Bronze 5%. Any other level outputs "Membership level not recognised" and leaves cost unchanged. no/No uses no level input. Output "Total cost is <cost>" without a currency symbol or forced decimal places.',
    starter: 'INPUT room\nINPUT nights',
    hints: [
      'Calculate the stay before considering membership.',
      'Which input is only needed for members?',
      'Keep the original cost when the level is invalid.',
    ],
    samples: [
      {
        inputs: ['elite', '2', 'yes', 'gold'],
        outputs: ['Total cost is 160'],
      },
    ],
    cases: [
      {
        inputs: ['elite', '2', 'yes', 'gold'],
        expectedOutput: ['Total cost is 160'],
      },
      {
        inputs: ['basic', '2', 'yes', 'Silver'],
        expectedOutput: ['Total cost is 90'],
      },
      {
        inputs: ['basic', '2', 'yes', 'bronze'],
        expectedOutput: ['Total cost is 95'],
      },
      {
        inputs: ['Elite', '1', 'no'],
        expectedOutput: ['Total cost is 100'],
      },
      {
        inputs: ['basic', '1', 'yes', 'platinum'],
        expectedOutput: ['Membership level not recognised', 'Total cost is 50'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-1-7',
    title: 'Shield eligibility',
    difficulty: 'Medium',
    referenceIds: ['task_1_7'],
    concepts: ['selection', 'priority'],
    statement:
      'Read money, stone ownership (yes/Yes/YES or no/No/NO), then level. Give only the first applicable result in this priority: level below 3: "Your level is not high enough yet"; no stone: "You need to find the Emerald Stone"; money below 100: "You don\'t have enough money yet"; otherwise "Congratulations, here is the Shield of Strength".',
    starter: 'INPUT money\nINPUT stone\nINPUT level',
    hints: [
      'Several rules can fail together.',
      'Which failure takes priority?',
      'Use one ordered decision chain so only one result appears.',
    ],
    samples: [
      {
        inputs: ['100', 'yes', '3'],
        outputs: ['Congratulations, here is the Shield of Strength'],
      },
    ],
    cases: [
      {
        inputs: ['100', 'yes', '3'],
        expectedOutput: ['Congratulations, here is the Shield of Strength'],
      },
      {
        inputs: ['0', 'no', '2'],
        expectedOutput: ['Your level is not high enough yet'],
      },
      {
        inputs: ['100', 'NO', '3'],
        expectedOutput: ['You need to find the Emerald Stone'],
      },
      {
        inputs: ['99', 'Yes', '3'],
        expectedOutput: ["You don't have enough money yet"],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-2-3',
    title: 'Five marks',
    difficulty: 'Medium',
    referenceIds: ['task_2_3'],
    concepts: ['RANGE', 'accumulator', 'average'],
    statement:
      'Read exactly five marks from 0 to 100. Output "The total is <total>", then "The average is <average>". Use the ordinary numeric result, without forced decimal places.',
    starter: 'OUTPUT "Enter five marks"\ntotal = 0',
    hints: [
      'Keep a running total.',
      'How many times does RANGE(1, 6) repeat?',
      'Only calculate the average after all five marks have been included.',
    ],
    samples: [
      {
        inputs: ['10', '20', '30', '40', '50'],
        outputs: ['The total is 150', 'The average is 30'],
      },
    ],
    cases: [
      {
        inputs: ['10', '20', '30', '40', '50'],
        expectedOutput: ['The total is 150', 'The average is 30'],
      },
      {
        inputs: ['0', '0', '0', '0', '0'],
        expectedOutput: ['The total is 0', 'The average is 0'],
      },
      {
        inputs: ['100', '100', '100', '100', '99'],
        expectedOutput: ['The total is 499', 'The average is 99.8'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-2-4',
    title: 'Even and odd census',
    difficulty: 'Medium',
    referenceIds: ['task_2_4'],
    concepts: ['FOR', 'MOD', 'counting'],
    statement:
      'Read exactly ten whole numbers, including possible negative numbers and zero. Output "Even numbers: <count>" then "Odd numbers: <count>".',
    starter: 'evenCount = 0\noddCount = 0',
    hints: [
      'Each input belongs to exactly one group.',
      'What remainder identifies an even number?',
      'Update one count per input, including zero and negatives.',
    ],
    samples: [
      {
        inputs: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        outputs: ['Even numbers: 5', 'Odd numbers: 5'],
      },
    ],
    cases: [
      {
        inputs: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        expectedOutput: ['Even numbers: 5', 'Odd numbers: 5'],
      },
      {
        inputs: ['0', '2', '4', '6', '8', '-2', '-4', '-6', '-8', '10'],
        expectedOutput: ['Even numbers: 10', 'Odd numbers: 0'],
      },
      {
        inputs: ['-1', '-3', '-5', '-7', '-9', '1', '3', '5', '7', '9'],
        expectedOutput: ['Even numbers: 0', 'Odd numbers: 10'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-2-5',
    title: 'Weekly shop report',
    difficulty: 'Medium',
    referenceIds: ['task_2_5'],
    concepts: ['RANGE', 'accumulator', 'counting'],
    statement:
      'Read seven nonnegative whole daily sales totals. Output "Weekly total is <total>" and "Busy days: <count>". A busy day has strictly more than 50 items sold.',
    starter: 'weeklyTotal = 0\nbusyDays = 0',
    hints: [
      'The sum and the busy-day count measure different things.',
      'Does a day with exactly 50 qualify?',
      'Always add sales; only count a day when it passes the threshold.',
    ],
    samples: [
      {
        inputs: ['10', '50', '51', '60', '0', '100', '29'],
        outputs: ['Weekly total is 300', 'Busy days: 3'],
      },
    ],
    cases: [
      {
        inputs: ['10', '50', '51', '60', '0', '100', '29'],
        expectedOutput: ['Weekly total is 300', 'Busy days: 3'],
      },
      {
        inputs: ['0', '0', '0', '0', '0', '0', '0'],
        expectedOutput: ['Weekly total is 0', 'Busy days: 0'],
      },
      {
        inputs: ['50', '50', '50', '50', '50', '50', '50'],
        expectedOutput: ['Weekly total is 350', 'Busy days: 0'],
      },
      {
        inputs: ['51', '51', '51', '51', '51', '51', '51'],
        expectedOutput: ['Weekly total is 357', 'Busy days: 7'],
      },
    ],
    version: 1,
  },
  {
    id: 'valid-mark-average',
    title: 'Ignore invalid marks',
    difficulty: 'Medium',
    referenceIds: ['task_1_1', 'task_2_3'],
    concepts: ['validation', 'FOR', 'average'],
    statement:
      'Read five numeric marks. Only marks from 0 to 100 inclusive are valid. Output "Valid: <count>". If at least one is valid, then output "Average: <mean of valid marks>"; otherwise output "No valid marks".',
    starter: 'valid = 0\ntotal = 0',
    hints: [
      'Rejected marks must not affect either part of the mean.',
      'What happens if every mark is invalid?',
      'Track accepted count and total together; only divide when the count is positive.',
    ],
    samples: [
      {
        inputs: ['10', '20', '-1', '101', '30'],
        outputs: ['Valid: 3', 'Average: 20'],
      },
    ],
    cases: [
      {
        inputs: ['10', '20', '-1', '101', '30'],
        expectedOutput: ['Valid: 3', 'Average: 20'],
      },
      {
        inputs: ['-1', '101', '-5', '200', '-2'],
        expectedOutput: ['Valid: 0', 'No valid marks'],
      },
      {
        inputs: ['0', '100', '0', '100', '50'],
        expectedOutput: ['Valid: 5', 'Average: 50'],
      },
    ],
    version: 1,
  },
  {
    id: 'reading-streak',
    title: 'Longest reading streak',
    difficulty: 'Medium',
    referenceIds: ['task_2_5'],
    concepts: ['FOR', 'state', 'maximum'],
    statement:
      'Read seven nonnegative whole daily reading times. A qualifying day has at least 20 minutes. Output "Longest streak: <days>" for the longest consecutive run of qualifying days.',
    starter: 'current = 0\nlongest = 0',
    hints: [
      'A streak differs from a total count.',
      'What happens to the current streak on a short day?',
      'Keep a current streak and a best streak; reset only the current one.',
    ],
    samples: [
      {
        inputs: ['20', '30', '0', '20', '20', '20', '1'],
        outputs: ['Longest streak: 3'],
      },
    ],
    cases: [
      {
        inputs: ['20', '30', '0', '20', '20', '20', '1'],
        expectedOutput: ['Longest streak: 3'],
      },
      {
        inputs: ['0', '1', '2', '3', '4', '5', '6'],
        expectedOutput: ['Longest streak: 0'],
      },
      {
        inputs: ['20', '20', '20', '20', '20', '20', '20'],
        expectedOutput: ['Longest streak: 7'],
      },
      {
        inputs: ['25', '25', '0', '0', '0', '0', '20'],
        expectedOutput: ['Longest streak: 2'],
      },
    ],
    version: 1,
  },
  {
    id: 'sensor-spread',
    title: 'Sensor spread',
    difficulty: 'Medium',
    referenceIds: ['task_1_3', 'task_2_3'],
    concepts: ['FOR', 'minimum', 'maximum'],
    statement:
      'Read a whole count from 1 to 20, then that many numeric sensor readings. Output "Minimum: <value>", "Maximum: <value>", and "Spread: <maximum minus minimum>". Negative readings are valid.',
    starter: 'INPUT count\nINPUT reading',
    hints: [
      'Zero is not a safe assumed minimum or maximum.',
      'Which real reading can initialize both extremes?',
      'Start with the first reading, then compare each remaining reading with both extremes.',
    ],
    samples: [
      {
        inputs: ['4', '8', '2', '9', '5'],
        outputs: ['Minimum: 2', 'Maximum: 9', 'Spread: 7'],
      },
    ],
    cases: [
      {
        inputs: ['4', '8', '2', '9', '5'],
        expectedOutput: ['Minimum: 2', 'Maximum: 9', 'Spread: 7'],
      },
      {
        inputs: ['1', '-4'],
        expectedOutput: ['Minimum: -4', 'Maximum: -4', 'Spread: 0'],
      },
      {
        inputs: ['3', '-8', '-2', '-5'],
        expectedOutput: ['Minimum: -8', 'Maximum: -2', 'Spread: 6'],
      },
    ],
    version: 1,
  },
  {
    id: 'water-tariff',
    title: 'Water tariff bands',
    difficulty: 'Medium',
    referenceIds: ['task_1_5'],
    concepts: ['selection', 'arithmetic', 'bands'],
    statement:
      'Read nonnegative whole water units. The first 10 units cost 2 each, the next 10 cost 3 each, and all further units cost 5 each. Only units within a band use its rate. Output "Water bill: <cost>".',
    starter: 'INPUT units',
    hints: [
      'This is a cumulative charge, not one rate for all usage.',
      'Which bands are already full at each boundary?',
      'Carry the cost of completed bands into the next band.',
    ],
    samples: [
      {
        inputs: ['25'],
        outputs: ['Water bill: 75'],
      },
    ],
    cases: [
      {
        inputs: ['25'],
        expectedOutput: ['Water bill: 75'],
      },
      {
        inputs: ['0'],
        expectedOutput: ['Water bill: 0'],
      },
      {
        inputs: ['10'],
        expectedOutput: ['Water bill: 20'],
      },
      {
        inputs: ['20'],
        expectedOutput: ['Water bill: 50'],
      },
      {
        inputs: ['11'],
        expectedOutput: ['Water bill: 23'],
      },
    ],
    version: 1,
  },
  {
    id: 'triangle-kind',
    title: 'Can these sides form a triangle?',
    difficulty: 'Medium',
    referenceIds: ['task_1_1', 'task_1_3'],
    concepts: ['AND', 'OR', 'nested selection'],
    statement:
      'Read three numeric side lengths. A triangle needs positive sides and every pair sum strictly greater than the remaining side. Output "Invalid" if this fails. Otherwise output "Equilateral" for three equal sides, "Isosceles" for exactly two equal sides, or "Scalene".',
    starter: 'INPUT a\nINPUT b\nINPUT c',
    hints: [
      'Validate the shape before naming it.',
      'Can equal sides still form an invalid triangle?',
      'Check validity first, then test all-equal before any-pair-equal.',
    ],
    samples: [
      {
        inputs: ['3', '4', '5'],
        outputs: ['Scalene'],
      },
    ],
    cases: [
      {
        inputs: ['3', '4', '5'],
        expectedOutput: ['Scalene'],
      },
      {
        inputs: ['2', '2', '2'],
        expectedOutput: ['Equilateral'],
      },
      {
        inputs: ['3', '3', '4'],
        expectedOutput: ['Isosceles'],
      },
      {
        inputs: ['1', '2', '3'],
        expectedOutput: ['Invalid'],
      },
      {
        inputs: ['0', '0', '0'],
        expectedOutput: ['Invalid'],
      },
    ],
    version: 1,
  },
  {
    id: 'overnight-duration',
    title: 'Journey across midnight',
    difficulty: 'Medium',
    referenceIds: ['task_1_4', 'task_1_6'],
    concepts: ['arithmetic', 'selection', 'units'],
    statement:
      'Read start hour, start minute, end hour, end minute. Hours are 0..23 and minutes 0..59. The journey lasts less than 24 hours; an earlier end time means the next day. Equal times mean zero duration. Output "Duration: <minutes>".',
    starter: 'INPUT startHour\nINPUT startMinute',
    hints: [
      'Put both times on one numeric scale.',
      'When does subtraction cross midnight?',
      'Convert to minutes and adjust a negative difference by one day.',
    ],
    samples: [
      {
        inputs: ['9', '10', '10', '5'],
        outputs: ['Duration: 55'],
      },
    ],
    cases: [
      {
        inputs: ['9', '10', '10', '5'],
        expectedOutput: ['Duration: 55'],
      },
      {
        inputs: ['23', '50', '0', '10'],
        expectedOutput: ['Duration: 20'],
      },
      {
        inputs: ['12', '0', '12', '0'],
        expectedOutput: ['Duration: 0'],
      },
      {
        inputs: ['0', '0', '23', '59'],
        expectedOutput: ['Duration: 1439'],
      },
    ],
    version: 1,
  },
  {
    id: 'wallet-ledger',
    title: 'Reject an overdraft',
    difficulty: 'Medium',
    referenceIds: ['task_1_7', 'task_2_5'],
    concepts: ['FOR', 'state', 'validation'],
    statement:
      'Read a nonnegative opening balance, then four signed transactions. Positive amounts add money. Negative amounts withdraw it. Reject any transaction that would make the balance negative. Output "Accepted" or "Rejected" after each transaction, then "Balance: <final balance>".',
    starter: 'INPUT balance',
    hints: [
      'A rejected transaction must leave no change.',
      'Should you test the old balance or the proposed balance?',
      'Check the proposed result before updating the stored balance.',
    ],
    samples: [
      {
        inputs: ['10', '-4', '-7', '5', '-11'],
        outputs: ['Accepted', 'Rejected', 'Accepted', 'Accepted', 'Balance: 0'],
      },
    ],
    cases: [
      {
        inputs: ['10', '-4', '-7', '5', '-11'],
        expectedOutput: ['Accepted', 'Rejected', 'Accepted', 'Accepted', 'Balance: 0'],
      },
      {
        inputs: ['0', '-1', '0', '2', '-2'],
        expectedOutput: ['Rejected', 'Accepted', 'Accepted', 'Accepted', 'Balance: 0'],
      },
      {
        inputs: ['5', '1', '2', '3', '4'],
        expectedOutput: ['Accepted', 'Accepted', 'Accepted', 'Accepted', 'Balance: 15'],
      },
    ],
    version: 1,
  },
  {
    id: 'earliest-bid',
    title: 'First highest bid',
    difficulty: 'Medium',
    referenceIds: ['task_1_3', 'task_2_3'],
    concepts: ['FOR', 'maximum', 'ties'],
    statement:
      'Read a whole bidder count from 1 to 20, then one nonnegative bid for each bidder in order. Output "Winner: <1-based bidder number>" then "Bid: <amount>". On a tie the earliest highest bidder wins.',
    starter: 'INPUT count\nINPUT bid',
    hints: [
      'The best amount and its owner are linked.',
      'Should an equal bid replace an earlier winner?',
      'Initialize from the first bidder and replace only on a strictly higher bid.',
    ],
    samples: [
      {
        inputs: ['4', '8', '12', '12', '5'],
        outputs: ['Winner: 2', 'Bid: 12'],
      },
    ],
    cases: [
      {
        inputs: ['4', '8', '12', '12', '5'],
        expectedOutput: ['Winner: 2', 'Bid: 12'],
      },
      {
        inputs: ['1', '0'],
        expectedOutput: ['Winner: 1', 'Bid: 0'],
      },
      {
        inputs: ['3', '5', '7', '9'],
        expectedOutput: ['Winner: 3', 'Bid: 9'],
      },
      {
        inputs: ['3', '4', '4', '4'],
        expectedOutput: ['Winner: 1', 'Bid: 4'],
      },
    ],
    version: 1,
  },
  {
    id: 'alternating-score',
    title: 'Alternating score sheet',
    difficulty: 'Medium',
    referenceIds: ['task_2_3', 'task_2_4'],
    concepts: ['FOR', 'MOD', 'accumulator'],
    statement:
      'Read a whole count from 0 to 20, then that many numbers. Add numbers in odd positions (1, 3, ...) and subtract numbers in even positions (2, 4, ...). Output "Score: <result>". With zero numbers, the score is zero.',
    starter: 'INPUT count\nscore = 0',
    hints: [
      'Positions and values have different roles.',
      'Is the decision based on the number or on where it appears?',
      'Use the loop position to decide whether to add or subtract each input.',
    ],
    samples: [
      {
        inputs: ['4', '10', '3', '8', '2'],
        outputs: ['Score: 13'],
      },
    ],
    cases: [
      {
        inputs: ['4', '10', '3', '8', '2'],
        expectedOutput: ['Score: 13'],
      },
      {
        inputs: ['0'],
        expectedOutput: ['Score: 0'],
      },
      {
        inputs: ['3', '-2', '-5', '-1'],
        expectedOutput: ['Score: 2'],
      },
      {
        inputs: ['1', '7'],
        expectedOutput: ['Score: 7'],
      },
    ],
    version: 1,
  },
  {
    id: 'saving-target',
    title: 'First target day',
    difficulty: 'Medium',
    referenceIds: ['task_2_1', 'task_2_5'],
    concepts: ['FOR', 'state', 'guard'],
    statement:
      'Read a positive target, then seven nonnegative daily deposits. Savings start at zero. Read all seven deposits even if the target is reached early. Output "Reached on day <first day>" if savings reached or exceeded the target, otherwise "Target not reached".',
    starter: 'INPUT target\nsaved = 0\nfirstDay = 0',
    hints: [
      'Reaching the goal later must not replace the first day.',
      'How can one value show that no day has been recorded yet?',
      'Accumulate all deposits and record a day only while the result is still unset.',
    ],
    samples: [
      {
        inputs: ['10', '3', '4', '3', '9', '0', '0', '0'],
        outputs: ['Reached on day 3'],
      },
    ],
    cases: [
      {
        inputs: ['10', '3', '4', '3', '9', '0', '0', '0'],
        expectedOutput: ['Reached on day 3'],
      },
      {
        inputs: ['1', '0', '0', '0', '0', '0', '0', '0'],
        expectedOutput: ['Target not reached'],
      },
      {
        inputs: ['5', '5', '5', '5', '5', '5', '5', '5'],
        expectedOutput: ['Reached on day 1'],
      },
      {
        inputs: ['7', '1', '1', '1', '1', '1', '1', '1'],
        expectedOutput: ['Reached on day 7'],
      },
    ],
    version: 1,
  },
  {
    id: 'ballot-count',
    title: 'Two-option ballot',
    difficulty: 'Medium',
    referenceIds: ['task_2_4', 'task_1_2'],
    concepts: ['FOR', 'strings', 'counting', 'ties'],
    statement:
      'Read six votes. Only exact lowercase a and b are valid. Count all other inputs as invalid. Output "A: <count>", "B: <count>", "Invalid: <count>", then "Winner: A", "Winner: B", or "Tie".',
    starter: 'aCount = 0\nbCount = 0\ninvalid = 0',
    hints: [
      'Invalid votes are a separate category.',
      'Can one vote update more than one category?',
      'Classify each vote once, then compare the valid totals after all votes.',
    ],
    samples: [
      {
        inputs: ['a', 'b', 'a', 'x', 'a', 'b'],
        outputs: ['A: 3', 'B: 2', 'Invalid: 1', 'Winner: A'],
      },
    ],
    cases: [
      {
        inputs: ['a', 'b', 'a', 'x', 'a', 'b'],
        expectedOutput: ['A: 3', 'B: 2', 'Invalid: 1', 'Winner: A'],
      },
      {
        inputs: ['x', 'A', '', 'B', 'x', 'x'],
        expectedOutput: ['A: 0', 'B: 0', 'Invalid: 6', 'Tie'],
      },
      {
        inputs: ['b', 'b', 'a', 'b', 'b', 'a'],
        expectedOutput: ['A: 2', 'B: 4', 'Invalid: 0', 'Winner: B'],
      },
      {
        inputs: ['a', 'b', 'a', 'b', 'a', 'b'],
        expectedOutput: ['A: 3', 'B: 3', 'Invalid: 0', 'Tie'],
      },
    ],
    version: 1,
  },
  {
    id: 'second-chance',
    title: 'Second-chance question',
    difficulty: 'Medium',
    referenceIds: ['task_1_4', 'task_3_7'],
    concepts: ['nested selection', 'guarded input', 'arithmetic'],
    statement:
      'Read two numbers, then an answer to their product. A correct first answer earns 2 points and takes no more input. Otherwise read exactly one more answer; a correct second answer earns 1 point and a wrong one earns 0. Output "Points: <points>".',
    starter: 'INPUT first\nINPUT second',
    hints: [
      'The second attempt is conditional.',
      'How do the points depend on when success happens?',
      'Read again only in the first failure branch, then report one score.',
    ],
    samples: [
      {
        inputs: ['3', '4', '12'],
        outputs: ['Points: 2'],
      },
    ],
    cases: [
      {
        inputs: ['3', '4', '12'],
        expectedOutput: ['Points: 2'],
      },
      {
        inputs: ['0', '9', '1', '0'],
        expectedOutput: ['Points: 1'],
      },
      {
        inputs: ['-2', '3', '6', '5'],
        expectedOutput: ['Points: 0'],
      },
    ],
    version: 1,
  },
];
