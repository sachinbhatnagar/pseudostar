import type { Problem } from '../types';

export const hard: Problem[] = [
  {
    id: 'ref-3-1',
    title: 'Right move with a stop',
    difficulty: 'Hard',
    referenceIds: ['task_3_1'],
    concepts: ['sub-routines', 'shared globals', 'clamping'],
    statement:
      'Read starting x and y (whole numbers from 0 to 1024), then yes/Yes/YES or no. Write moveRight() to add one to shared xCoord without passing 1024. Call it only for yes. Keep yCoord unchanged. Output "New position is x=<x> y= <y>". The space after y= is required.',
    starter: 'INPUT xCoord\nINPUT yCoord\nINPUT choice',
    hints: [
      'A routine can change shared coordinates.',
      'What happens when x already equals the right edge?',
      'Apply movement inside the routine, then keep the coordinate within its limit.',
    ],
    samples: [
      {
        inputs: ['500', '450', 'yes'],
        outputs: ['New position is x=501 y= 450'],
      },
    ],
    cases: [
      {
        inputs: ['500', '450', 'yes'],
        expectedOutput: ['New position is x=501 y= 450'],
      },
      {
        inputs: ['1024', '0', 'YES'],
        expectedOutput: ['New position is x=1024 y= 0'],
      },
      {
        inputs: ['1', '9', 'no'],
        expectedOutput: ['New position is x=1 y= 9'],
      },
      {
        inputs: ['1023', '42', 'Yes'],
        expectedOutput: ['New position is x=1024 y= 42'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-3-2',
    title: 'Four-way movement',
    difficulty: 'Hard',
    referenceIds: ['task_3_2'],
    concepts: ['sub-routines', 'shared globals', 'selection', 'clamping'],
    statement:
      'Read starting x and y (0 to 1024), then a direction. Use moveRight(), moveLeft(), moveUp(), moveDown() to move one unit. Up reduces y. Clamp coordinates to 0..1024. Accept lowercase or initial-capital directions. An unknown direction outputs "Direction not recognised" and leaves the position unchanged. Always output "New position is x=<x> y= <y>".',
    starter: 'INPUT xCoord\nINPUT yCoord\nINPUT direction',
    hints: [
      'Give each direction its own coordinate change.',
      'Which axis changes, and in which direction?',
      'Keep boundary checks inside the movement routines and report after dispatch.',
    ],
    samples: [
      {
        inputs: ['10', '10', 'left'],
        outputs: ['New position is x=9 y= 10'],
      },
    ],
    cases: [
      {
        inputs: ['10', '10', 'left'],
        expectedOutput: ['New position is x=9 y= 10'],
      },
      {
        inputs: ['0', '0', 'Left'],
        expectedOutput: ['New position is x=0 y= 0'],
      },
      {
        inputs: ['1024', '1024', 'down'],
        expectedOutput: ['New position is x=1024 y= 1024'],
      },
      {
        inputs: ['8', '0', 'up'],
        expectedOutput: ['New position is x=8 y= 0'],
      },
      {
        inputs: ['1024', '4', 'right'],
        expectedOutput: ['New position is x=1024 y= 4'],
      },
      {
        inputs: ['1', '2', 'jump'],
        expectedOutput: ['Direction not recognised', 'New position is x=1 y= 2'],
      },
      {
        inputs: ['4', '8', 'Up'],
        expectedOutput: ['New position is x=4 y= 7'],
      },
      {
        inputs: ['4', '8', 'Down'],
        expectedOutput: ['New position is x=4 y= 9'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-3-3',
    title: 'Damage and healing',
    difficulty: 'Hard',
    referenceIds: ['task_3_3'],
    concepts: ['sub-routines', 'shared globals', 'clamping'],
    statement:
      'Start health at 80. Read attack/Attack or heal/Heal, then a nonnegative amount. Use takeDamage(), heal(), and showHealth(). Damage cannot take health below 0; healing cannot take it above 100. An unknown action takes no amount input and outputs "Choice not recognised". Always output "Health is <health>".',
    starter: 'health = 80\nINPUT choice',
    hints: [
      'Health has a lower and an upper limit.',
      'Which action needs each limit?',
      'Read an amount only in the selected routine, clamp the result, then show health.',
    ],
    samples: [
      {
        inputs: ['attack', '30'],
        outputs: ['Health is 50'],
      },
    ],
    cases: [
      {
        inputs: ['attack', '30'],
        expectedOutput: ['Health is 50'],
      },
      {
        inputs: ['attack', '90'],
        expectedOutput: ['Health is 0'],
      },
      {
        inputs: ['Heal', '30'],
        expectedOutput: ['Health is 100'],
      },
      {
        inputs: ['heal', '5'],
        expectedOutput: ['Health is 85'],
      },
      {
        inputs: ['wait'],
        expectedOutput: ['Choice not recognised', 'Health is 80'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-3-4',
    title: 'Hotel routines',
    difficulty: 'Hard',
    referenceIds: ['task_3_4'],
    concepts: ['sub-routines', 'shared globals', 'percentage', 'nested selection'],
    statement:
      'Use setRoomCost(), applyDiscount(), showTotal() with shared cost. Read elite/Elite or basic/Basic, positive nights, then yes/Yes or no/No membership. Rates are 100 and 50 per night. Only members enter a level: gold/Gold saves 20%, silver/Silver 10%, bronze/Bronze 5%. Other levels output "Membership level not recognised" and keep the full cost. Finish with "Total cost is <cost>".',
    starter: 'OUTPUT "Hotel booking"',
    hints: [
      'Each routine should own one stage of the bill.',
      'Which routine must run before a discount is applied?',
      'Use shared cost to carry the bill between routines; skip the discount input for nonmembers.',
    ],
    samples: [
      {
        inputs: ['elite', '3', 'yes', 'Gold'],
        outputs: ['Total cost is 240'],
      },
    ],
    cases: [
      {
        inputs: ['elite', '3', 'yes', 'Gold'],
        expectedOutput: ['Total cost is 240'],
      },
      {
        inputs: ['basic', '2', 'yes', 'silver'],
        expectedOutput: ['Total cost is 90'],
      },
      {
        inputs: ['elite', '2', 'yes', 'bronze'],
        expectedOutput: ['Total cost is 190'],
      },
      {
        inputs: ['basic', '1', 'no'],
        expectedOutput: ['Total cost is 50'],
      },
      {
        inputs: ['elite', '1', 'yes', 'guest'],
        expectedOutput: ['Membership level not recognised', 'Total cost is 100'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-3-5',
    title: 'Purchase adviser routine',
    difficulty: 'Hard',
    referenceIds: ['task_3_5'],
    concepts: ['sub-routines', 'selection', 'priority'],
    statement:
      'Write checkPurchase() and call it from the main algorithm. Read money, stone ownership (yes/Yes/YES or no/No/NO), then level. Give only the first applicable result in this priority: level below 3: "Your level is not high enough yet"; no stone: "You need to find the Emerald Stone"; money below 100: "You don\'t have enough money yet"; otherwise "Congratulations, here is the Shield of Strength".',
    starter: 'OUTPUT "Shield purchase adviser"',
    hints: [
      'A routine can own both input and decisions.',
      'How do you avoid producing several failure messages?',
      'Keep the priority chain inside the routine and call it once.',
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
    id: 'ref-3-6',
    title: 'Class multiplication round',
    difficulty: 'Hard',
    referenceIds: ['task_3_6'],
    concepts: ['sub-routines', 'FOR', 'shared globals', 'counting'],
    statement:
      'Set shared number1 to 7, number2 to 8 and score to 0. Write askQuestion() to read one answer, output "Correct" or "Incorrect", and count correct answers. Call it five times with a counted loop. Finish with "Final score is <score>".',
    starter: 'number1 = 7\nnumber2 = 8\nscore = 0',
    hints: [
      'The same routine handles each learner.',
      'Where must score be initialized so earlier points survive?',
      'Call the routine five times and show the total after the loop.',
    ],
    samples: [
      {
        inputs: ['56', '0', '56', '55', '56'],
        outputs: ['Correct', 'Incorrect', 'Correct', 'Incorrect', 'Correct', 'Final score is 3'],
      },
    ],
    cases: [
      {
        inputs: ['56', '0', '56', '55', '56'],
        expectedOutput: [
          'Correct',
          'Incorrect',
          'Correct',
          'Incorrect',
          'Correct',
          'Final score is 3',
        ],
      },
      {
        inputs: ['56', '56', '56', '56', '56'],
        expectedOutput: ['Correct', 'Correct', 'Correct', 'Correct', 'Correct', 'Final score is 5'],
      },
      {
        inputs: ['0', '0', '0', '0', '0'],
        expectedOutput: [
          'Incorrect',
          'Incorrect',
          'Incorrect',
          'Incorrect',
          'Incorrect',
          'Final score is 0',
        ],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-3-7',
    title: 'Three-attempt lock',
    difficulty: 'Hard',
    referenceIds: ['task_3_7'],
    concepts: ['sub-routines', 'FOR', 'shared globals', 'guarded input'],
    statement:
      'Password is the exact text LOCKED. Start unlocked as "no". Use checkPassword() and showResult(). Allow at most three inputs, skipping all remaining reads once a password matches. Output only the final result: "Access granted" or "Access denied". A counted loop may finish its remaining iterations without reading input.',
    starter: 'password = "LOCKED"\nunlocked = "no"',
    hints: [
      'Success must survive later loop iterations.',
      'Should another input be requested after success?',
      'Guard the routine call with the current lock state, then report once.',
    ],
    samples: [
      {
        inputs: ['LOCKED'],
        outputs: ['Access granted'],
      },
    ],
    cases: [
      {
        inputs: ['LOCKED'],
        expectedOutput: ['Access granted'],
      },
      {
        inputs: ['bad', 'LOCKED'],
        expectedOutput: ['Access granted'],
      },
      {
        inputs: ['a', 'b', 'LOCKED'],
        expectedOutput: ['Access granted'],
      },
      {
        inputs: ['locked', 'x', 'y'],
        expectedOutput: ['Access denied'],
      },
    ],
    version: 1,
  },
  {
    id: 'ref-3-8',
    title: 'Four-turn combat',
    difficulty: 'Hard',
    referenceIds: ['task_3_8'],
    concepts: ['sub-routines', 'FOR', 'shared globals', 'clamping'],
    statement:
      'Start health=100, energy=50, enemyHealth=60. Read four actions: attack/Attack or rest/Rest. attack() costs 10 energy and removes 15 enemy health, floored at 0; insufficient energy outputs "Not enough energy" and changes nothing. rest() restores 10 energy up to 50. Unknown actions output "Choice not recognised". After each turn showStatus() outputs "Health is <health>", "Energy is <energy>", "Enemy health is <enemyHealth>".',
    starter: 'health = 100\nenergy = 50\nenemyHealth = 60',
    hints: [
      'State carries from one turn to the next.',
      'Which values can change on each action?',
      'Dispatch one routine per turn and show status inside the loop after that action.',
    ],
    samples: [
      {
        inputs: ['attack', 'attack', 'attack', 'attack'],
        outputs: [
          'Health is 100',
          'Energy is 40',
          'Enemy health is 45',
          'Health is 100',
          'Energy is 30',
          'Enemy health is 30',
          'Health is 100',
          'Energy is 20',
          'Enemy health is 15',
          'Health is 100',
          'Energy is 10',
          'Enemy health is 0',
        ],
      },
    ],
    cases: [
      {
        inputs: ['attack', 'attack', 'attack', 'attack'],
        expectedOutput: [
          'Health is 100',
          'Energy is 40',
          'Enemy health is 45',
          'Health is 100',
          'Energy is 30',
          'Enemy health is 30',
          'Health is 100',
          'Energy is 20',
          'Enemy health is 15',
          'Health is 100',
          'Energy is 10',
          'Enemy health is 0',
        ],
      },
      {
        inputs: ['rest', 'rest', 'rest', 'rest'],
        expectedOutput: [
          'Health is 100',
          'Energy is 50',
          'Enemy health is 60',
          'Health is 100',
          'Energy is 50',
          'Enemy health is 60',
          'Health is 100',
          'Energy is 50',
          'Enemy health is 60',
          'Health is 100',
          'Energy is 50',
          'Enemy health is 60',
        ],
      },
      {
        inputs: ['attack', 'rest', 'wait', 'attack'],
        expectedOutput: [
          'Health is 100',
          'Energy is 40',
          'Enemy health is 45',
          'Health is 100',
          'Energy is 50',
          'Enemy health is 45',
          'Choice not recognised',
          'Health is 100',
          'Energy is 50',
          'Enemy health is 45',
          'Health is 100',
          'Energy is 40',
          'Enemy health is 30',
        ],
      },
    ],
    version: 1,
  },
  {
    id: 'obstacle-robot',
    title: 'Robot with a blocked cell',
    difficulty: 'Hard',
    referenceIds: ['task_3_2', 'task_3_8'],
    concepts: ['sub-routines', 'FOR', 'shared globals', 'validation'],
    statement:
      'Start a robot at x=1, y=1 on a grid 0..4 on both axes. Cell (2,2) is blocked. Read five lowercase commands: right, left, up, down. Up reduces y. Use proposeMove() to prepare candidate coordinates and commitMove() to accept only a valid, unblocked candidate. Unknown commands count as rejected. Output "Moved" or "Blocked" after each command, then "Position: <x>,<y>". Rejected commands keep the old position.',
    starter: 'x = 1\ny = 1',
    hints: [
      'A proposed move need not become the real position.',
      'Which checks need to pass before either coordinate changes?',
      'Keep candidate coordinates separate; commit both only after validation.',
    ],
    samples: [
      {
        inputs: ['right', 'down', 'right', 'down', 'left'],
        outputs: ['Moved', 'Blocked', 'Moved', 'Moved', 'Blocked', 'Position: 3,2'],
      },
    ],
    cases: [
      {
        inputs: ['right', 'down', 'right', 'down', 'left'],
        expectedOutput: ['Moved', 'Blocked', 'Moved', 'Moved', 'Blocked', 'Position: 3,2'],
      },
      {
        inputs: ['up', 'up', 'left', 'left', 'wait'],
        expectedOutput: ['Moved', 'Blocked', 'Moved', 'Blocked', 'Blocked', 'Position: 0,0'],
      },
      {
        inputs: ['down', 'down', 'right', 'right', 'up'],
        expectedOutput: ['Moved', 'Moved', 'Moved', 'Moved', 'Moved', 'Position: 3,2'],
      },
    ],
    version: 1,
  },
  {
    id: 'tank-accounting',
    title: 'Tank overflow and shortfall',
    difficulty: 'Hard',
    referenceIds: ['task_3_3', 'task_2_5'],
    concepts: ['sub-routines', 'FOR', 'clamping', 'accumulator'],
    statement:
      'A tank starts with 30 litres and holds 100. Read four operations, each with lowercase fill or drain followed by a nonnegative amount. Use fillTank() and drainTank(). Keep stored water within 0..100. Accumulate overflow from fills and unmet demand from drains. Output "Water: <litres>", "Spilled: <litres>", "Unmet: <litres>" after all operations.',
    starter: 'water = 30\nspilled = 0\nunmet = 0',
    hints: [
      'Clamping alone loses information about excess.',
      'When should overflow or shortfall be measured?',
      'Record the amount beyond a bound before resetting water to that bound.',
    ],
    samples: [
      {
        inputs: ['fill', '80', 'drain', '120', 'fill', '10', 'drain', '5'],
        outputs: ['Water: 5', 'Spilled: 10', 'Unmet: 20'],
      },
    ],
    cases: [
      {
        inputs: ['fill', '80', 'drain', '120', 'fill', '10', 'drain', '5'],
        expectedOutput: ['Water: 5', 'Spilled: 10', 'Unmet: 20'],
      },
      {
        inputs: ['drain', '30', 'fill', '100', 'drain', '100', 'fill', '0'],
        expectedOutput: ['Water: 0', 'Spilled: 0', 'Unmet: 0'],
      },
      {
        inputs: ['fill', '100', 'fill', '100', 'drain', '250', 'drain', '10'],
        expectedOutput: ['Water: 0', 'Spilled: 130', 'Unmet: 160'],
      },
    ],
    version: 1,
  },
  {
    id: 'ticket-kiosk',
    title: 'Ticket stock and credit',
    difficulty: 'Hard',
    referenceIds: ['task_3_5', 'task_3_8'],
    concepts: ['sub-routines', 'FOR', 'shared globals', 'priority'],
    statement:
      'A kiosk starts with 5 tickets and credit 12. Each ticket costs 4. Read four operations, each lowercase buy or topup followed by a positive whole amount. For topup, add the amount to credit and output "Credit added". For buy, amount is tickets requested: reject insufficient stock with "Sold out" before testing credit; reject insufficient credit with "Need credit". Otherwise reduce both values and output "Purchased". Use buyTickets() and topUp(). Finish with "Stock: <count>" and "Credit: <amount>".',
    starter: 'stock = 5\ncredit = 12',
    hints: [
      'A purchase has two resources to update together.',
      'Which failure takes priority if both resources are insufficient?',
      'Validate stock and cost first; change both values only on success.',
    ],
    samples: [
      {
        inputs: ['buy', '2', 'topup', '4', 'buy', '3', 'buy', '1'],
        outputs: ['Purchased', 'Credit added', 'Need credit', 'Purchased', 'Stock: 2', 'Credit: 4'],
      },
    ],
    cases: [
      {
        inputs: ['buy', '2', 'topup', '4', 'buy', '3', 'buy', '1'],
        expectedOutput: [
          'Purchased',
          'Credit added',
          'Need credit',
          'Purchased',
          'Stock: 2',
          'Credit: 4',
        ],
      },
      {
        inputs: ['buy', '6', 'buy', '5', 'topup', '1', 'buy', '1'],
        expectedOutput: [
          'Sold out',
          'Need credit',
          'Credit added',
          'Purchased',
          'Stock: 4',
          'Credit: 9',
        ],
      },
      {
        inputs: ['topup', '3', 'topup', '2', 'buy', '1', 'buy', '1'],
        expectedOutput: [
          'Credit added',
          'Credit added',
          'Purchased',
          'Purchased',
          'Stock: 3',
          'Credit: 9',
        ],
      },
      {
        inputs: ['topup', '8', 'buy', '5', 'buy', '1', 'topup', '2'],
        expectedOutput: [
          'Credit added',
          'Purchased',
          'Sold out',
          'Credit added',
          'Stock: 0',
          'Credit: 2',
        ],
      },
    ],
    version: 1,
  },
  {
    id: 'quiz-streak-bonus',
    title: 'Quiz streak bonus',
    difficulty: 'Hard',
    referenceIds: ['task_3_6', 'task_2_5'],
    concepts: ['sub-routines', 'FOR', 'state', 'nested selection'],
    statement:
      'Run four questions using askQuestion(). For each question read two numbers then a proposed product. Correct answers earn 2 points, plus 1 extra point if the immediately previous answer was also correct. A wrong answer earns no points and breaks the streak. Output "Correct" or "Incorrect" after each answer, then "Score: <points>". Use shared score and streak state.',
    starter: 'score = 0\nstreak = 0',
    hints: [
      'A bonus depends on the preceding answer.',
      'What must a wrong answer do to streak state?',
      'Award the base points, apply any consecutive bonus, and update the state for the next call.',
    ],
    samples: [
      {
        inputs: ['2', '3', '6', '3', '3', '9', '2', '5', '11', '0', '5', '0'],
        outputs: ['Correct', 'Correct', 'Incorrect', 'Correct', 'Score: 7'],
      },
    ],
    cases: [
      {
        inputs: ['2', '3', '6', '3', '3', '9', '2', '5', '11', '0', '5', '0'],
        expectedOutput: ['Correct', 'Correct', 'Incorrect', 'Correct', 'Score: 7'],
      },
      {
        inputs: ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1'],
        expectedOutput: ['Correct', 'Correct', 'Correct', 'Correct', 'Score: 11'],
      },
      {
        inputs: ['1', '2', '0', '1', '2', '0', '1', '2', '0', '1', '2', '0'],
        expectedOutput: ['Incorrect', 'Incorrect', 'Incorrect', 'Incorrect', 'Score: 0'],
      },
    ],
    version: 1,
  },
  {
    id: 'checkpoint-run',
    title: 'Count crossed checkpoints',
    difficulty: 'Hard',
    referenceIds: ['task_3_1', 'task_3_8'],
    concepts: ['sub-routines', 'FOR', 'state', 'thresholds'],
    statement:
      'A runner starts at position 0 on a track ending at 30. Read four nonnegative whole advances. Use advanceRunner() to add each advance and cap the position at 30. Checkpoints are at 10, 20, and 30. Count each checkpoint once when first reached or crossed, even if one advance crosses several. Output "Position: <position>" and "Checkpoints: <count>" after every advance.',
    starter: 'position = 0\ncheckpoints = 0',
    hints: [
      'One advance can cross more than one checkpoint.',
      'How can the old and new positions identify newly crossed checkpoints?',
      'Keep the old position and test each threshold against both positions.',
    ],
    samples: [
      {
        inputs: ['5', '20', '5', '10'],
        outputs: [
          'Position: 5',
          'Checkpoints: 0',
          'Position: 25',
          'Checkpoints: 2',
          'Position: 30',
          'Checkpoints: 3',
          'Position: 30',
          'Checkpoints: 3',
        ],
      },
    ],
    cases: [
      {
        inputs: ['5', '20', '5', '10'],
        expectedOutput: [
          'Position: 5',
          'Checkpoints: 0',
          'Position: 25',
          'Checkpoints: 2',
          'Position: 30',
          'Checkpoints: 3',
          'Position: 30',
          'Checkpoints: 3',
        ],
      },
      {
        inputs: ['0', '0', '0', '0'],
        expectedOutput: [
          'Position: 0',
          'Checkpoints: 0',
          'Position: 0',
          'Checkpoints: 0',
          'Position: 0',
          'Checkpoints: 0',
          'Position: 0',
          'Checkpoints: 0',
        ],
      },
      {
        inputs: ['10', '10', '10', '0'],
        expectedOutput: [
          'Position: 10',
          'Checkpoints: 1',
          'Position: 20',
          'Checkpoints: 2',
          'Position: 30',
          'Checkpoints: 3',
          'Position: 30',
          'Checkpoints: 3',
        ],
      },
    ],
    version: 1,
  },
  {
    id: 'access-pair',
    title: 'Two-part access check',
    difficulty: 'Hard',
    referenceIds: ['task_3_7', 'task_3_5'],
    concepts: ['sub-routines', 'FOR', 'guarded input', 'AND'],
    statement:
      'Allow at most three attempts. Each attempt always reads a user name then a code. Only exact name guide and code MAP grant access. Use checkAccess() to update shared granted state. Once granted, read no further attempts. Output "Access granted" or "Access denied", then "Attempts: <number used>". Count failed attempts too.',
    starter: 'granted = "no"\nattempts = 0',
    hints: [
      'Both inputs belong to one attempt.',
      'When should the attempt count increase?',
      'Guard further calls after success while keeping a separate count of actual calls.',
    ],
    samples: [
      {
        inputs: ['guide', 'MAP'],
        outputs: ['Access granted', 'Attempts: 1'],
      },
    ],
    cases: [
      {
        inputs: ['guide', 'MAP'],
        expectedOutput: ['Access granted', 'Attempts: 1'],
      },
      {
        inputs: ['other', 'MAP', 'guide', 'MAP'],
        expectedOutput: ['Access granted', 'Attempts: 2'],
      },
      {
        inputs: ['guide', 'map', 'Guide', 'MAP', 'guide', 'MAP'],
        expectedOutput: ['Access granted', 'Attempts: 3'],
      },
      {
        inputs: ['x', 'MAP', 'guide', 'x', 'x', 'x'],
        expectedOutput: ['Access denied', 'Attempts: 3'],
      },
    ],
    version: 1,
  },
  {
    id: 'tournament-totals',
    title: 'Two-round tournament',
    difficulty: 'Hard',
    referenceIds: ['task_3_6', 'task_1_3'],
    concepts: ['sub-routines', 'nested loops', 'maximum', 'ties'],
    statement:
      'Three teams play two rounds each. Read both nonnegative scores for team 1, then team 2, then team 3. Use readTeamTotal() with a loop to compute a shared total. Output "Team <number>: <total>" for each team. Finish with "Best: <highest total>" and "Leaders: <number of teams tied for best>".',
    starter: 'best = -1\nleaders = 0',
    hints: [
      'A team total resets; the tournament best does not.',
      'What happens to leader count when a new best appears?',
      'Use a routine for each team, then distinguish a higher total from an equal total.',
    ],
    samples: [
      {
        inputs: ['3', '4', '5', '2', '1', '1'],
        outputs: ['Team 1: 7', 'Team 2: 7', 'Team 3: 2', 'Best: 7', 'Leaders: 2'],
      },
    ],
    cases: [
      {
        inputs: ['3', '4', '5', '2', '1', '1'],
        expectedOutput: ['Team 1: 7', 'Team 2: 7', 'Team 3: 2', 'Best: 7', 'Leaders: 2'],
      },
      {
        inputs: ['0', '0', '0', '0', '0', '0'],
        expectedOutput: ['Team 1: 0', 'Team 2: 0', 'Team 3: 0', 'Best: 0', 'Leaders: 3'],
      },
      {
        inputs: ['1', '2', '3', '4', '8', '9'],
        expectedOutput: ['Team 1: 3', 'Team 2: 7', 'Team 3: 17', 'Best: 17', 'Leaders: 1'],
      },
    ],
    version: 1,
  },
  {
    id: 'kit-orders',
    title: 'All-or-nothing kit orders',
    difficulty: 'Hard',
    referenceIds: ['task_3_5', 'task_3_8'],
    concepts: ['sub-routines', 'FOR', 'AND', 'state'],
    statement:
      'Start with 12 wheels and 8 frames. Read four orders, each giving nonnegative whole wheels needed and frames needed. Use fulfilOrder(). Accept only if both stocks cover the entire order. Output "Accepted" and reduce both stocks, or "Rejected" and change neither. A zero-size order is accepted. Finish with "Wheels: <stock>" and "Frames: <stock>".',
    starter: 'wheels = 12\nframes = 8',
    hints: [
      'An order is one transaction across two stocks.',
      'What if only one requested item is available?',
      'Check both requirements before reducing either stock.',
    ],
    samples: [
      {
        inputs: ['4', '2', '10', '1', '8', '6', '1', '0'],
        outputs: ['Accepted', 'Rejected', 'Accepted', 'Rejected', 'Wheels: 0', 'Frames: 0'],
      },
    ],
    cases: [
      {
        inputs: ['4', '2', '10', '1', '8', '6', '1', '0'],
        expectedOutput: ['Accepted', 'Rejected', 'Accepted', 'Rejected', 'Wheels: 0', 'Frames: 0'],
      },
      {
        inputs: ['0', '0', '0', '0', '0', '0', '0', '0'],
        expectedOutput: ['Accepted', 'Accepted', 'Accepted', 'Accepted', 'Wheels: 12', 'Frames: 8'],
      },
      {
        inputs: ['0', '9', '13', '0', '6', '4', '6', '4'],
        expectedOutput: ['Rejected', 'Rejected', 'Accepted', 'Accepted', 'Wheels: 0', 'Frames: 0'],
      },
    ],
    version: 1,
  },
  {
    id: 'thermostat-memory',
    title: 'Thermostat memory',
    difficulty: 'Hard',
    referenceIds: ['task_3_3', 'task_3_8'],
    concepts: ['sub-routines', 'FOR', 'state', 'boundaries'],
    statement:
      'A heater starts "off". Read six temperatures. Use updateHeater(): below 18 switches it on; above 22 switches it off; 18 through 22 preserves its current state. Output "Heater: <on/off>" after every reading. Finish with "Switches: <number of state changes>". Repeated on or off readings are not new switches.',
    starter: 'heater = "off"\nswitches = 0',
    hints: [
      'The middle band remembers the previous state.',
      'Does commanding the same state count as a change?',
      'Keep the previous state for comparison and increment only when the result differs.',
    ],
    samples: [
      {
        inputs: ['17', '18', '22', '23', '20', '16'],
        outputs: [
          'Heater: on',
          'Heater: on',
          'Heater: on',
          'Heater: off',
          'Heater: off',
          'Heater: on',
          'Switches: 3',
        ],
      },
    ],
    cases: [
      {
        inputs: ['17', '18', '22', '23', '20', '16'],
        expectedOutput: [
          'Heater: on',
          'Heater: on',
          'Heater: on',
          'Heater: off',
          'Heater: off',
          'Heater: on',
          'Switches: 3',
        ],
      },
      {
        inputs: ['18', '22', '20', '18', '22', '20'],
        expectedOutput: [
          'Heater: off',
          'Heater: off',
          'Heater: off',
          'Heater: off',
          'Heater: off',
          'Heater: off',
          'Switches: 0',
        ],
      },
      {
        inputs: ['17', '17', '17', '23', '23', '23'],
        expectedOutput: [
          'Heater: on',
          'Heater: on',
          'Heater: on',
          'Heater: off',
          'Heater: off',
          'Heater: off',
          'Switches: 2',
        ],
      },
    ],
    version: 1,
  },
  {
    id: 'single-undo',
    title: 'Score with one undo',
    difficulty: 'Hard',
    referenceIds: ['task_3_8', 'task_3_7'],
    concepts: ['sub-routines', 'FOR', 'shared globals', 'guarded input'],
    statement:
      'Score starts at 0. Read five lowercase commands: add, undo, or reset. add reads one signed amount, saves the score before this addition, and adds the amount. undo restores that saved score once; a second undo does nothing until another add. reset sets score to 0 and clears undo availability. Use addScore() and undoScore(). Output "Score: <value>" after each command.',
    starter: 'score = 0\ncanUndo = "no"',
    hints: [
      'Only one snapshot is needed.',
      'Which commands make that snapshot unusable?',
      'Save before adding; consume the snapshot on undo and discard it on reset.',
    ],
    samples: [
      {
        inputs: ['add', '5', 'add', '3', 'undo', 'undo', 'add', '-2'],
        outputs: ['Score: 5', 'Score: 8', 'Score: 5', 'Score: 5', 'Score: 3'],
      },
    ],
    cases: [
      {
        inputs: ['add', '5', 'add', '3', 'undo', 'undo', 'add', '-2'],
        expectedOutput: ['Score: 5', 'Score: 8', 'Score: 5', 'Score: 5', 'Score: 3'],
      },
      {
        inputs: ['undo', 'add', '7', 'reset', 'undo', 'add', '2'],
        expectedOutput: ['Score: 0', 'Score: 7', 'Score: 0', 'Score: 0', 'Score: 2'],
      },
      {
        inputs: ['add', '-4', 'undo', 'add', '0', 'undo', 'undo'],
        expectedOutput: ['Score: -4', 'Score: 0', 'Score: 0', 'Score: 0', 'Score: 0'],
      },
    ],
    version: 1,
  },
  {
    id: 'delivery-batch',
    title: 'Three delivery bills',
    difficulty: 'Hard',
    referenceIds: ['task_3_4', 'task_2_3'],
    concepts: ['sub-routines', 'nested loops', 'percentage', 'accumulator'],
    statement:
      'Process three orders with calculateOrder(). For each order read a whole item count from 0 to 5, that many nonnegative prices, then member text yes or no. Members save 10% on the subtotal. After any discount, add delivery 5 if the discounted subtotal is below 50. An empty order costs 0 with no delivery. Output "Order <number>: <cost>" for each order and "Batch: <sum>" at the end. Use ordinary numeric formatting.',
    starter: 'batch = 0',
    hints: [
      'Each order has its own subtotal and the batch has another total.',
      'Is the delivery threshold checked before or after discount?',
      'Finish the order calculation before adding its cost to the batch; handle empty orders separately.',
    ],
    samples: [
      {
        inputs: ['2', '20', '30', 'yes', '1', '50', 'no', '0', 'yes'],
        outputs: ['Order 1: 50', 'Order 2: 50', 'Order 3: 0', 'Batch: 100'],
      },
    ],
    cases: [
      {
        inputs: ['2', '20', '30', 'yes', '1', '50', 'no', '0', 'yes'],
        expectedOutput: ['Order 1: 50', 'Order 2: 50', 'Order 3: 0', 'Batch: 100'],
      },
      {
        inputs: ['0', 'no', '0', 'yes', '0', 'no'],
        expectedOutput: ['Order 1: 0', 'Order 2: 0', 'Order 3: 0', 'Batch: 0'],
      },
      {
        inputs: ['1', '100', 'yes', '2', '10', '10', 'no', '1', '0', 'no'],
        expectedOutput: ['Order 1: 90', 'Order 2: 25', 'Order 3: 5', 'Batch: 120'],
      },
    ],
    version: 1,
  },
  {
    id: 'divisor-survey',
    title: 'Divisor survey',
    difficulty: 'Hard',
    referenceIds: ['task_2_4', 'task_3_6'],
    concepts: ['sub-routines', 'nested loops', 'MOD', 'counting'],
    statement:
      'Read three whole numbers, each from 1 to 50. Use countDivisors() to count the positive divisors of the current number. Output "Divisors of <number>: <count>" for each number. A prime has exactly two positive divisors; 1 is not prime. Finish with "Primes: <count among the three inputs>".',
    starter: 'primes = 0',
    hints: [
      'Divisibility can be tested without storing a list.',
      'Which values need to reset for each number?',
      'Scan possible divisors in the routine, then use its count to update the outer prime total.',
    ],
    samples: [
      {
        inputs: ['6', '7', '1'],
        outputs: ['Divisors of 6: 4', 'Divisors of 7: 2', 'Divisors of 1: 1', 'Primes: 1'],
      },
    ],
    cases: [
      {
        inputs: ['6', '7', '1'],
        expectedOutput: ['Divisors of 6: 4', 'Divisors of 7: 2', 'Divisors of 1: 1', 'Primes: 1'],
      },
      {
        inputs: ['2', '3', '5'],
        expectedOutput: ['Divisors of 2: 2', 'Divisors of 3: 2', 'Divisors of 5: 2', 'Primes: 3'],
      },
      {
        inputs: ['4', '9', '12'],
        expectedOutput: ['Divisors of 4: 3', 'Divisors of 9: 3', 'Divisors of 12: 6', 'Primes: 0'],
      },
    ],
    version: 1,
  },
];
