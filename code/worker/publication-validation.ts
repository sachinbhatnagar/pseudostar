import { Blockly, programToWorkspace, sourceFor } from '../src/editor/blocks';
import { parse } from '../src/language/parse';
import { format } from '../src/language/format';
import { run } from '../src/language/machine';
import { type Candidate, type Validation } from '../src/problems/shared';
import { fail, str } from './validation';
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    fail(400, 'INVALID_FIELD', 'Use a valid problem object.');
  return v as Record<string, unknown>;
};
function texts(v: unknown, name: string, max: number, length = 300): string[] {
  if (!Array.isArray(v) || v.length > max) fail(400, 'INVALID_FIELD', `Check ${name}.`);
  return (v as unknown[]).map((x) => str(x, name, length, true));
}
export function publicationCandidate(
  v: unknown,
  solution: string,
  id: string,
  revision: number,
): Candidate {
  const c = object(v),
    p = object(c.problem);
  const statement = str(p.statement, 'learner statement', 16000);
  if (
    /```|\b(?:SET|OUTPUT|INPUT|PRINT|RETURN|ENDIF|ENDFUNCTION)\b|\b[A-Za-z_]\w*\s*(?:=|←)\s*[^=]/.test(
      statement,
    )
  )
    fail(502, 'INVALID_DESCRIPTION', 'AI included code in the description. Try publishing again.');
  if (/leetcode/i.test(statement))
    fail(400, 'INVALID_STATEMENT', 'Remove source branding from the learner statement.');
  if (!['Easy', 'Medium', 'Hard'].includes(String(p.difficulty)))
    fail(400, 'INVALID_FIELD', 'Choose a difficulty.');
  const hints = texts(p.hints, 'hints', 3, 500);
  if (hints.length !== 3 || hints.some((x) => !x.trim()))
    fail(400, 'INVALID_FIELD', 'Use three hints.');
  const readsInput = /^\s*INPUT(?:\s|$)/im.test(solution);
  if (
    !Array.isArray(p.cases) ||
    p.cases.length < (readsInput ? 4 : 1) ||
    p.cases.length > (readsInput ? 10 : 1)
  )
    fail(502, 'INVALID_CASES', 'AI could not create suitable tests. Try publishing again.');
  const cases = p.cases.map((x) => {
    const t = object(x),
      expectedOutput = texts(t.expectedOutput, 'expected result', 10, 2000);
    if (!expectedOutput.length) fail(400, 'INVALID_CASES', 'Each test needs an expected result.');
    return { inputs: texts(t.inputs, 'test inputs', 10, 2000), expectedOutput };
  });
  if (!readsInput && cases.some((test) => test.inputs.length))
    fail(
      502,
      'INVALID_CASES',
      'AI added inputs to a program that does not read input. Try publishing again.',
    );
  return {
    solution: str(solution, 'solution', 20000),
    explanation: str(c.explanation, 'algorithm explanation', 3000),
    problem: {
      id,
      title: str(p.title, 'title', 120),
      statement,
      difficulty: p.difficulty as 'Easy' | 'Medium' | 'Hard',
      concepts: [],
      prerequisites: texts(p.prerequisites, 'prerequisites', 6, 200),
      referenceIds: [],
      starter: '',
      hints: hints as [string, string, string],
      samples: cases.slice(0, 2).map((c) => ({ inputs: c.inputs, outputs: c.expectedOutput })),
      cases,
      version: revision,
      exactOutput: true,
    },
  };
}
export function validateCandidate(c: Candidate, reference: string | null): Validation {
  const checks: Validation['checks'] = [];
  const add = (name: string, passed: boolean, detail = '') => checks.push({ name, passed, detail });
  add('Starter syntax', parse(c.problem.starter).ok);
  const parsed = parse(c.solution);
  add('Pseudocode syntax', parsed.ok, parsed.ok ? '' : parsed.diagnostics[0].message);
  if (!parsed.ok) return { passed: false, checks };
  let blockSource = '';
  const workspace = new Blockly.Workspace();
  try {
    programToWorkspace(parsed.program, workspace);
    blockSource = sourceFor(workspace);
    add('Block conversion', parse(blockSource).ok);
  } catch {
    add('Block conversion', false, 'This program could not convert to blocks.');
  } finally {
    workspace.dispose();
  }
  const formatted = format(parsed.program).source;
  add('Text format', parse(formatted).ok);
  const tests = [
    ...c.problem.samples.map((s) => ({ ...s, expectedOutput: s.outputs, sample: true })),
    ...c.problem.cases.map((s) => ({ ...s, sample: false })),
  ];
  for (const [i, test] of tests.entries()) {
    const actual = run(c.solution, test.inputs, { statements: 12000, depth: 48, work: 1000000 });
    const expected = test.expectedOutput;
    add(
      `${test.sample ? 'Example' : 'Test'} ${i + 1}`,
      !actual.error && JSON.stringify(actual.output) === JSON.stringify(expected),
      actual.error?.message ??
        `Expected ${JSON.stringify(expected)}; got ${JSON.stringify(actual.output)}.`,
    );
    const blockResult = run(blockSource, test.inputs, {
      statements: 12000,
      depth: 48,
      work: 1000000,
    });
    add(
      `Block agreement ${i + 1}`,
      !blockResult.error && JSON.stringify(blockResult.output) === JSON.stringify(expected),
    );
    const roundTrip = run(formatted, test.inputs, { statements: 12000, depth: 48, work: 1000000 });
    add(
      `Format agreement ${i + 1}`,
      !roundTrip.error && JSON.stringify(actual.output) === JSON.stringify(roundTrip.output),
    );
    if (reference) {
      const independent = run(reference, test.inputs, {
        statements: 12000,
        depth: 48,
        work: 1000000,
      });
      add(
        `Independent check ${i + 1}`,
        !independent.error && JSON.stringify(independent.output) === JSON.stringify(expected),
        independent.error?.message ?? 'Compared with a separately generated solution.',
      );
    }
  }
  add(
    'Independent reference',
    !!reference,
    reference
      ? 'Agreement is supporting evidence, not proof.'
      : 'Generate an independent reference before review.',
  );
  return { passed: checks.every((x) => x.passed), checks };
}
