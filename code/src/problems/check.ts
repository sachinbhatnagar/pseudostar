import { run } from '../language/machine';
import type { Problem } from './types';
export type CaseResult = {
  passed: boolean;
  inputs: string[];
  expected: string[];
  actual: string[];
  error?: string;
};
export function checkProgram(problem: Problem, source: string): CaseResult[] {
  return problem.cases.map((test) => {
    const result = run(source, test.inputs);
    let cursor = 0;
    const expected = test.expectedOutput ?? [];
    for (const line of result.output)
      if (cursor < expected.length && line === expected[cursor]) cursor++;
    const values = Object.entries(test.expectedVariables ?? {});
    const valuesPass = values.every(([name, value]) => result.variables[name] === value);
    return {
      passed:
        !result.error &&
        (problem.exactOutput
          ? JSON.stringify(result.output) === JSON.stringify(expected)
          : cursor === expected.length) &&
        valuesPass &&
        (expected.length > 0 || values.length > 0),
      inputs: test.inputs,
      expected: [...expected, ...values.map(([k, v]) => `${k} = ${v}`)],
      actual: [
        ...result.output,
        ...values.map(([k]) => `${k} = ${result.variables[k] ?? '(no value)'}`),
      ],
      error: result.error?.message,
    };
  });
}
