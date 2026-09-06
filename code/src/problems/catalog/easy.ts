import type { Problem } from '../types';

export const easy: Problem[] = [
  {
    id: 'ref-1-1',
    title: 'The inclusive gate',
    difficulty: 'Easy',
    referenceIds: ['task_1_1'],
    concepts: ['selection', 'AND', 'boundaries'],
    statement:
      'Read one whole number. Output "That is correct" if it is between 1 and 10 inclusive. Otherwise output "That is incorrect".',
    starter: 'INPUT number',
    hints: [
      'A range has two limits.',
      'What must be true at both limits?',
      'Check both limits together before choosing the message.',
    ],
    samples: [
      {
        inputs: ['5'],
        outputs: ['That is correct'],
      },
    ],
    cases: [
      {
        inputs: ['5'],
        expectedOutput: ['That is correct'],
      },
      {
        inputs: ['1'],
        expectedOutput: ['That is correct'],
      },
      {
        inputs: ['10'],
        expectedOutput: ['That is correct'],
      },
      {
        inputs: ['0'],
        expectedOutput: ['That is incorrect'],
      },
      {
        inputs: ['11'],
        expectedOutput: ['That is incorrect'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-1-6',
    title: 'Screen boundary',
    difficulty: 'Easy',
    referenceIds: ['task_1_6'],
    concepts: ['selection', 'OR', 'coordinates'],
    statement:
      'Read x and y coordinates. The screen includes every coordinate from 0 to 1024 on both axes. Output "Your character is still on screen" if both coordinates fit, otherwise "Your character is off the screen".',
    starter: 'INPUT xCoord\nINPUT yCoord',
    hints: [
      'One invalid axis is enough to be off screen.',
      'Are the edges part of the screen?',
      'Compare each coordinate with both bounds.',
    ],
    samples: [
      {
        inputs: ['500', '450'],
        outputs: ['Your character is still on screen'],
      },
    ],
    cases: [
      {
        inputs: ['500', '450'],
        expectedOutput: ['Your character is still on screen'],
      },
      {
        inputs: ['0', '1024'],
        expectedOutput: ['Your character is still on screen'],
      },
      {
        inputs: ['-1', '0'],
        expectedOutput: ['Your character is off the screen'],
      },
      {
        inputs: ['0', '1025'],
        expectedOutput: ['Your character is off the screen'],
      },
      {
        inputs: ['1025', '0'],
        expectedOutput: ['Your character is off the screen'],
      },
      {
        inputs: ['0', '-1'],
        expectedOutput: ['Your character is off the screen'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-2-1',
    title: 'Count up to the limit',
    difficulty: 'Easy',
    referenceIds: ['task_2_1'],
    concepts: ['FOR', 'inclusive bounds'],
    statement:
      'Read a whole number limit from 1 to 100. Output every whole number from 1 through limit, one number per line.',
    starter: 'INPUT limit',
    hints: [
      'A counted loop repeats an output.',
      'Is the last value included?',
      'Choose loop bounds that visit the limit once.',
    ],
    samples: [
      {
        inputs: ['4'],
        outputs: ['1', '2', '3', '4'],
      },
    ],
    cases: [
      {
        inputs: ['4'],
        expectedOutput: ['1', '2', '3', '4'],
      },
      {
        inputs: ['1'],
        expectedOutput: ['1'],
      },
      {
        inputs: ['7'],
        expectedOutput: ['1', '2', '3', '4', '5', '6', '7'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-2-2',
    title: 'Twelve-row table',
    difficulty: 'Easy',
    referenceIds: ['task_2_2'],
    concepts: ['FOR', 'arithmetic', 'output'],
    statement:
      'Read a number. Output its multiplication table from multiplier 1 to 12 inclusive. Each line must read "<number> x <multiplier> = <product>".',
    starter: 'INPUT number',
    hints: [
      'Each row has one changing multiplier.',
      'Which parts of the line stay the same?',
      'Calculate a new product on each loop iteration.',
    ],
    samples: [
      {
        inputs: ['3'],
        outputs: [
          '3 x 1 = 3',
          '3 x 2 = 6',
          '3 x 3 = 9',
          '3 x 4 = 12',
          '3 x 5 = 15',
          '3 x 6 = 18',
          '3 x 7 = 21',
          '3 x 8 = 24',
          '3 x 9 = 27',
          '3 x 10 = 30',
          '3 x 11 = 33',
          '3 x 12 = 36',
        ],
      },
    ],
    cases: [
      {
        inputs: ['3'],
        expectedOutput: [
          '3 x 1 = 3',
          '3 x 2 = 6',
          '3 x 3 = 9',
          '3 x 4 = 12',
          '3 x 5 = 15',
          '3 x 6 = 18',
          '3 x 7 = 21',
          '3 x 8 = 24',
          '3 x 9 = 27',
          '3 x 10 = 30',
          '3 x 11 = 33',
          '3 x 12 = 36',
        ],
      },
      {
        inputs: ['0'],
        expectedOutput: [
          '0 x 1 = 0',
          '0 x 2 = 0',
          '0 x 3 = 0',
          '0 x 4 = 0',
          '0 x 5 = 0',
          '0 x 6 = 0',
          '0 x 7 = 0',
          '0 x 8 = 0',
          '0 x 9 = 0',
          '0 x 10 = 0',
          '0 x 11 = 0',
          '0 x 12 = 0',
        ],
      },
      {
        inputs: ['-2'],
        expectedOutput: [
          '-2 x 1 = -2',
          '-2 x 2 = -4',
          '-2 x 3 = -6',
          '-2 x 4 = -8',
          '-2 x 5 = -10',
          '-2 x 6 = -12',
          '-2 x 7 = -14',
          '-2 x 8 = -16',
          '-2 x 9 = -18',
          '-2 x 10 = -20',
          '-2 x 11 = -22',
          '-2 x 12 = -24',
        ],
      },
    ],
    version: 1,
  },
  {
    id: 'snack-bill',
    title: 'Club snack bill',
    difficulty: 'Easy',
    referenceIds: ['task_1_4'],
    concepts: ['arithmetic', 'input', 'output'],
    statement:
      'Read nonnegative whole counts of sandwiches and juices. A sandwich costs 4 and a juice costs 3. Output "Bill: <total>".',
    starter: 'INPUT sandwiches\nINPUT juices',
    hints: [
      'Each type has its own price.',
      'What does quantity times price measure?',
      'Combine the costs of the two types.',
    ],
    samples: [
      {
        inputs: ['2', '3'],
        outputs: ['Bill: 17'],
      },
    ],
    cases: [
      {
        inputs: ['2', '3'],
        expectedOutput: ['Bill: 17'],
      },
      {
        inputs: ['0', '0'],
        expectedOutput: ['Bill: 0'],
      },
      {
        inputs: ['5', '0'],
        expectedOutput: ['Bill: 20'],
      },
    ],
    version: 1,
  },
  {
    id: 'clock-split',
    title: 'Minutes into hours',
    difficulty: 'Easy',
    referenceIds: ['task_2_4'],
    concepts: ['MOD', 'arithmetic'],
    statement:
      'Read a nonnegative whole duration in minutes. Output "Hours: <whole hours>" then "Minutes: <remaining minutes>". Do not round up a partial hour.',
    starter: 'INPUT duration',
    hints: [
      'One hour contains 60 minutes.',
      'Which operator finds what is left after complete groups?',
      'Remove the remainder before dividing to get whole hours.',
    ],
    samples: [
      {
        inputs: ['135'],
        outputs: ['Hours: 2', 'Minutes: 15'],
      },
    ],
    cases: [
      {
        inputs: ['135'],
        expectedOutput: ['Hours: 2', 'Minutes: 15'],
      },
      {
        inputs: ['0'],
        expectedOutput: ['Hours: 0', 'Minutes: 0'],
      },
      {
        inputs: ['60'],
        expectedOutput: ['Hours: 1', 'Minutes: 0'],
      },
      {
        inputs: ['59'],
        expectedOutput: ['Hours: 0', 'Minutes: 59'],
      },
    ],
    version: 1,
  },
  {
    id: 'equal-shares',
    title: 'Share the counters',
    difficulty: 'Easy',
    referenceIds: ['task_2_4'],
    concepts: ['MOD', 'arithmetic'],
    statement:
      'Read a nonnegative whole number of counters and a positive whole number of players. Give each player as many counters as possible without splitting a counter. Output "Each: <count>" then "Left: <count>".',
    starter: 'INPUT counters\nINPUT players',
    hints: [
      'Equal shares can leave counters unused.',
      'How can you find the leftovers first?',
      'Separate complete groups from the remainder.',
    ],
    samples: [
      {
        inputs: ['23', '5'],
        outputs: ['Each: 4', 'Left: 3'],
      },
    ],
    cases: [
      {
        inputs: ['23', '5'],
        expectedOutput: ['Each: 4', 'Left: 3'],
      },
      {
        inputs: ['0', '4'],
        expectedOutput: ['Each: 0', 'Left: 0'],
      },
      {
        inputs: ['3', '7'],
        expectedOutput: ['Each: 0', 'Left: 3'],
      },
      {
        inputs: ['12', '3'],
        expectedOutput: ['Each: 4', 'Left: 0'],
      },
    ],
    version: 1,
  },
  {
    id: 'garden-fence',
    title: 'Fence with an opening',
    difficulty: 'Easy',
    referenceIds: ['task_1_4'],
    concepts: ['arithmetic'],
    statement:
      'Read positive length and width of a rectangular garden, then gate width. Gate width is nonnegative and no greater than the garden length. Output "Fence: <length needed>" for the perimeter except the gate opening.',
    starter: 'INPUT length\nINPUT width\nINPUT gate',
    hints: [
      'The fence follows the outside edge.',
      'How many sides have each dimension?',
      'Find the perimeter before removing the opening.',
    ],
    samples: [
      {
        inputs: ['10', '6', '2'],
        outputs: ['Fence: 30'],
      },
    ],
    cases: [
      {
        inputs: ['10', '6', '2'],
        expectedOutput: ['Fence: 30'],
      },
      {
        inputs: ['1', '1', '0'],
        expectedOutput: ['Fence: 4'],
      },
      {
        inputs: ['5', '3', '5'],
        expectedOutput: ['Fence: 11'],
      },
    ],
    version: 1,
  },
  {
    id: 'temperature-scale',
    title: 'Temperature conversion',
    difficulty: 'Easy',
    referenceIds: ['task_1_4'],
    concepts: ['arithmetic'],
    statement:
      'Read a Celsius temperature. Convert it with Fahrenheit = Celsius times 9 divided by 5, plus 32. Output "Fahrenheit: <value>". Negative temperatures are valid.',
    starter: 'INPUT celsius',
    hints: [
      'Multiplication and addition are separate stages.',
      'When should the offset be added?',
      'Apply the scale factor before the offset.',
    ],
    samples: [
      {
        inputs: ['20'],
        outputs: ['Fahrenheit: 68'],
      },
    ],
    cases: [
      {
        inputs: ['20'],
        expectedOutput: ['Fahrenheit: 68'],
      },
      {
        inputs: ['0'],
        expectedOutput: ['Fahrenheit: 32'],
      },
      {
        inputs: ['-40'],
        expectedOutput: ['Fahrenheit: -40'],
      },
    ],
    version: 1,
  },
  {
    id: 'midpoint',
    title: 'Meet halfway',
    difficulty: 'Easy',
    referenceIds: ['task_1_3'],
    concepts: ['arithmetic', 'coordinates'],
    statement:
      'Read x1, y1, x2, y2 for two points. Output "Midpoint x: <x>" then "Midpoint y: <y>". Each midpoint coordinate is the average of the two corresponding coordinates.',
    starter: 'INPUT x1\nINPUT y1',
    hints: [
      'Treat the axes separately.',
      'Which two inputs belong to the same axis?',
      'Average each matching pair, keeping fractional values.',
    ],
    samples: [
      {
        inputs: ['0', '2', '6', '8'],
        outputs: ['Midpoint x: 3', 'Midpoint y: 5'],
      },
    ],
    cases: [
      {
        inputs: ['0', '2', '6', '8'],
        expectedOutput: ['Midpoint x: 3', 'Midpoint y: 5'],
      },
      {
        inputs: ['-4', '-2', '4', '2'],
        expectedOutput: ['Midpoint x: 0', 'Midpoint y: 0'],
      },
      {
        inputs: ['1', '3', '2', '4'],
        expectedOutput: ['Midpoint x: 1.5', 'Midpoint y: 3.5'],
      },
    ],
    version: 1,
  },
  {
    id: 'track-distance',
    title: 'Distance between markers',
    difficulty: 'Easy',
    referenceIds: ['task_1_3'],
    concepts: ['selection', 'arithmetic'],
    statement:
      'Read two marker positions on a straight track. Positions may be negative. Output "Distance: <value>" as their nonnegative separation.',
    starter: 'INPUT first\nINPUT second',
    hints: [
      'Distance has no direction.',
      'Which subtraction would give a negative result?',
      'Choose the subtraction order using the positions.',
    ],
    samples: [
      {
        inputs: ['8', '3'],
        outputs: ['Distance: 5'],
      },
    ],
    cases: [
      {
        inputs: ['8', '3'],
        expectedOutput: ['Distance: 5'],
      },
      {
        inputs: ['2', '2'],
        expectedOutput: ['Distance: 0'],
      },
      {
        inputs: ['-5', '3'],
        expectedOutput: ['Distance: 8'],
      },
    ],
    version: 1,
  },
  {
    id: 'cash-desk',
    title: 'Change or shortfall',
    difficulty: 'Easy',
    referenceIds: ['task_1_7'],
    concepts: ['selection', 'arithmetic'],
    statement:
      'Read a nonnegative bill and payment. If payment covers the bill, output "Change: <amount>". Otherwise output "Still due: <amount>". Exact payment has zero change.',
    starter: 'INPUT bill\nINPUT payment',
    hints: [
      'Compare before choosing a label.',
      'Where does exact payment belong?',
      'Subtract in the order that makes the reported amount nonnegative.',
    ],
    samples: [
      {
        inputs: ['17', '20'],
        outputs: ['Change: 3'],
      },
    ],
    cases: [
      {
        inputs: ['17', '20'],
        expectedOutput: ['Change: 3'],
      },
      {
        inputs: ['12', '12'],
        expectedOutput: ['Change: 0'],
      },
      {
        inputs: ['20', '7'],
        expectedOutput: ['Still due: 13'],
      },
    ],
    version: 1,
  },
  {
    id: 'parcel-charge',
    title: 'Parcel charge',
    difficulty: 'Easy',
    referenceIds: ['task_1_5'],
    concepts: ['selection', 'arithmetic'],
    statement:
      'Read a positive whole parcel weight in kilograms. Up to 2 kg costs 5. Each kilogram above 2 adds 3. Output "Charge: <cost>".',
    starter: 'INPUT weight',
    hints: [
      'The base charge covers some weight already.',
      'Which kilograms need the extra charge?',
      'Charge extra only for weight beyond the included allowance.',
    ],
    samples: [
      {
        inputs: ['4'],
        outputs: ['Charge: 11'],
      },
    ],
    cases: [
      {
        inputs: ['4'],
        expectedOutput: ['Charge: 11'],
      },
      {
        inputs: ['2'],
        expectedOutput: ['Charge: 5'],
      },
      {
        inputs: ['1'],
        expectedOutput: ['Charge: 5'],
      },
    ],
    version: 1,
  },
  {
    id: 'case-sensitive-code',
    title: 'Exact entry code',
    difficulty: 'Easy',
    referenceIds: ['task_3_7'],
    concepts: ['selection', 'strings'],
    statement:
      'Read one text code. Only the exact text BlueDoor opens the door. Output "Open" for that code and "Closed" for every other input. Case and spaces matter.',
    starter: 'INPUT code',
    hints: [
      'Text equality compares the complete value.',
      'Should different letter case be accepted here?',
      'Use the exact code stated in the task as the comparison target.',
    ],
    samples: [
      {
        inputs: ['BlueDoor'],
        outputs: ['Open'],
      },
    ],
    cases: [
      {
        inputs: ['BlueDoor'],
        expectedOutput: ['Open'],
      },
      {
        inputs: ['bluedoor'],
        expectedOutput: ['Closed'],
      },
      {
        inputs: ['BlueDoor '],
        expectedOutput: ['Closed'],
      },
      {
        inputs: [''],
        expectedOutput: ['Closed'],
      },
    ],
    version: 1,
  },
  {
    id: 'swap-labels',
    title: 'Exchange two labels',
    difficulty: 'Easy',
    referenceIds: ['task_3_1'],
    concepts: ['assignment', 'strings'],
    statement:
      'Read two text labels into first and second. Exchange their values. Output "First: <new first>" and "Second: <new second>" in that order. Preserve spaces and letter case.',
    starter: 'INPUT first\nINPUT second',
    hints: [
      'An assignment can overwrite information you still need.',
      'Which original value needs temporary storage?',
      'Preserve one label before replacing it, then complete the exchange.',
    ],
    samples: [
      {
        inputs: ['North', 'South'],
        outputs: ['First: South', 'Second: North'],
      },
    ],
    cases: [
      {
        inputs: ['North', 'South'],
        expectedOutput: ['First: South', 'Second: North'],
      },
      {
        inputs: ['same', 'same'],
        expectedOutput: ['First: same', 'Second: same'],
      },
      {
        inputs: ['', 'Red team'],
        expectedOutput: ['First: Red team', 'Second: '],
      },
    ],
    version: 1,
  },
  {
    id: 'route-length',
    title: 'Combine route segments',
    difficulty: 'Easy',
    referenceIds: ['task_1_4'],
    concepts: ['arithmetic', 'units'],
    statement:
      'Read nonnegative whole kilometres and extra metres (0 to 999) for a route, then metres for a detour. Output "Metres: <total>" after adding the detour.',
    starter: 'INPUT kilometres\nINPUT metres',
    hints: [
      'Add lengths in the same unit.',
      'How many metres does each kilometre contribute?',
      'Convert first, then combine all three parts.',
    ],
    samples: [
      {
        inputs: ['2', '350', '150'],
        outputs: ['Metres: 2500'],
      },
    ],
    cases: [
      {
        inputs: ['2', '350', '150'],
        expectedOutput: ['Metres: 2500'],
      },
      {
        inputs: ['0', '0', '0'],
        expectedOutput: ['Metres: 0'],
      },
      {
        inputs: ['1', '999', '2'],
        expectedOutput: ['Metres: 2001'],
      },
    ],
    version: 1,
  },
  {
    id: 'launch-countdown',
    title: 'Launch countdown',
    difficulty: 'Easy',
    referenceIds: ['task_2_1'],
    concepts: ['FOR', 'arithmetic'],
    statement:
      'Read a whole start from 1 to 50. Output start down to 1, each on its own line, then "Launch". Use an increasing counted loop; decreasing loop steps are not supported.',
    starter: 'INPUT start',
    hints: [
      'The counter and displayed number need not match.',
      'How can an increasing counter produce decreasing output?',
      'Relate each displayed value to the starting value and the current iteration.',
    ],
    samples: [
      {
        inputs: ['3'],
        outputs: ['3', '2', '1', 'Launch'],
      },
    ],
    cases: [
      {
        inputs: ['3'],
        expectedOutput: ['3', '2', '1', 'Launch'],
      },
      {
        inputs: ['1'],
        expectedOutput: ['1', 'Launch'],
      },
      {
        inputs: ['5'],
        expectedOutput: ['5', '4', '3', '2', '1', 'Launch'],
      },
    ],
    version: 1,
  },
  {
    id: 'shelf-labels',
    title: 'Label an interval',
    difficulty: 'Easy',
    referenceIds: ['task_2_1'],
    concepts: ['FOR', 'empty range'],
    statement:
      'Read whole first and last shelf numbers from 0 to 30. Output each shelf from first through last as "Shelf <number>". If first exceeds last, output no shelf lines. Always end with "Labels complete".',
    starter: 'INPUT first\nINPUT last',
    hints: [
      'Some intervals contain no shelf numbers.',
      'What should happen when the start exceeds the end?',
      'Use the inputs as inclusive bounds and put the completion line after the loop.',
    ],
    samples: [
      {
        inputs: ['2', '4'],
        outputs: ['Shelf 2', 'Shelf 3', 'Shelf 4', 'Labels complete'],
      },
    ],
    cases: [
      {
        inputs: ['2', '4'],
        expectedOutput: ['Shelf 2', 'Shelf 3', 'Shelf 4', 'Labels complete'],
      },
      {
        inputs: ['0', '0'],
        expectedOutput: ['Shelf 0', 'Labels complete'],
      },
      {
        inputs: ['5', '3'],
        expectedOutput: ['Labels complete'],
      },
    ],
    version: 1,
  },
  {
    id: 'square-sizes',
    title: 'Square tile sizes',
    difficulty: 'Easy',
    referenceIds: ['task_2_2'],
    concepts: ['FOR', 'arithmetic'],
    statement:
      'Read a whole maximum side from 1 to 20. For each side length from 1 through that maximum, output "Side <side>: <area>" for a square.',
    starter: 'INPUT maximum',
    hints: [
      'A square has two equal dimensions.',
      'Which value changes between rows?',
      'Calculate the area using the current side, not the maximum side.',
    ],
    samples: [
      {
        inputs: ['3'],
        outputs: ['Side 1: 1', 'Side 2: 4', 'Side 3: 9'],
      },
    ],
    cases: [
      {
        inputs: ['3'],
        expectedOutput: ['Side 1: 1', 'Side 2: 4', 'Side 3: 9'],
      },
      {
        inputs: ['1'],
        expectedOutput: ['Side 1: 1'],
      },
      {
        inputs: ['4'],
        expectedOutput: ['Side 1: 1', 'Side 2: 4', 'Side 3: 9', 'Side 4: 16'],
      },
    ],
    version: 1,
  },
  {
    id: 'even-labels',
    title: 'Print even labels',
    difficulty: 'Easy',
    referenceIds: ['task_2_4'],
    concepts: ['FOR', 'MOD', 'selection'],
    statement:
      'Read a whole limit from 1 to 30. Output every even number from 1 through limit, one per line. Finish with "Done", even if there are no even labels.',
    starter: 'INPUT limit',
    hints: [
      'Not every visited number should be printed.',
      'What remainder means a number is divisible by two?',
      'Use a condition inside the loop and a final message outside it.',
    ],
    samples: [
      {
        inputs: ['6'],
        outputs: ['2', '4', '6', 'Done'],
      },
    ],
    cases: [
      {
        inputs: ['6'],
        expectedOutput: ['2', '4', '6', 'Done'],
      },
      {
        inputs: ['1'],
        expectedOutput: ['Done'],
      },
      {
        inputs: ['5'],
        expectedOutput: ['2', '4', 'Done'],
      },
    ],
    version: 1,
  },
];
