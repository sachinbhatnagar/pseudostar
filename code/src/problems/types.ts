export interface Problem {
  id: string;
  title: string;
  statement: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  concepts: string[];
  referenceIds: string[];
  starter: string;
  hints: [string, string, string];
  samples: { inputs: string[]; outputs: string[] }[];
  cases: {
    inputs: string[];
    /** Required result lines, matched as an ordered exact-line subsequence. */
    expectedOutput?: string[];
    /** Final values, used when state rather than output is the task outcome. */
    expectedVariables?: Record<string, number | string | boolean>;
  }[];
  version: 1;
}
