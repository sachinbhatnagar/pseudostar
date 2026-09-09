import { Blockly, programToWorkspace, sourceFor } from '../src/editor/blocks';
import { parse } from '../src/language/parse';
import { format } from '../src/language/format';
import { run } from '../src/language/machine';
import { topics, type Candidate, type ImportSource, type Validation } from '../src/problems/shared';
import { fail, str } from './validation';
export function canonicalUrl(value: unknown) {
  const text = str(value, 'LeetCode link', 600);
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return fail(400, 'INVALID_LINK', 'Enter a full LeetCode problem link.');
  }
  const match =
    /^\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(?:description|solutions|editorial|submissions))?\/?$/.exec(
      url.pathname,
    );
  if (
    url.protocol !== 'https:' ||
    !['leetcode.com', 'www.leetcode.com'].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    !match
  )
    fail(400, 'INVALID_LINK', 'Use an https://leetcode.com/problems/problem-name/ link.');
  return `https://leetcode.com/problems/${match![1]}/`;
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    fail(400, 'INVALID_FIELD', 'Use a valid problem object.');
  return v as Record<string, unknown>;
};
function texts(v: unknown, name: string, max: number, length = 300): string[] {
  if (!Array.isArray(v) || v.length > max) fail(400, 'INVALID_FIELD', `Check ${name}.`);
  return (v as unknown[]).map((x) => str(x, name, length, true));
}
export function samples(v: unknown) {
  if (!Array.isArray(v) || v.length < 1 || v.length > 12)
    fail(400, 'INVALID_SAMPLES', 'Add 1 to 12 examples.');
  return (v as unknown[]).map((x) => {
    const s = object(x);
    const outputs = texts(s.outputs, 'example results', 10, 2000);
    if (!outputs.length) fail(400, 'INVALID_SAMPLES', 'Each example needs a result.');
    return { inputs: texts(s.inputs, 'example inputs', 10, 2000), outputs };
  });
}
export function sourceInput(v: Record<string, unknown>): ImportSource {
  if (v.rights !== 'original' && v.rights !== 'licensed')
    fail(400, 'RIGHTS_REQUIRED', 'Confirm that the statement is original or licensed for sharing.');
  return {
    url: canonicalUrl(v.url),
    title: str(v.title, 'title', 120),
    statement: str(v.statement, 'statement', 12000),
    constraints: str(v.constraints, 'constraints', 4000),
    samples: samples(v.samples),
    rights: v.rights,
    attribution: str(v.attribution, 'author or licence', 1000),
  };
}
export function candidateInput(
  v: unknown,
  source: ImportSource,
  id: string,
  revision: number,
): Candidate {
  const c = object(v),
    p = object(c.problem);
  if (!['Easy', 'Medium', 'Hard'].includes(String(p.difficulty)))
    fail(400, 'INVALID_FIELD', 'Choose a difficulty.');
  const hints = texts(p.hints, 'hints', 3, 500),
    selected = texts(p.topics, 'topics', 8, 80);
  if (
    hints.length !== 3 ||
    hints.some((x) => !x.trim()) ||
    !selected.length ||
    selected.some((x) => !topics.includes(x as (typeof topics)[number]))
  )
    fail(400, 'INVALID_FIELD', 'Use three hints and recognised topics.');
  if (!Array.isArray(p.cases) || p.cases.length < 1 || p.cases.length > 20)
    fail(400, 'INVALID_CASES', 'Use 1 to 20 test cases.');
  const cases = p.cases.map((x) => {
    const t = object(x),
      expectedOutput = texts(t.expectedOutput, 'expected result', 10, 2000);
    if (!expectedOutput.length) fail(400, 'INVALID_CASES', 'Each test needs an expected result.');
    return { inputs: texts(t.inputs, 'test inputs', 10, 2000), expectedOutput };
  });
  return {
    solution: str(c.solution, 'solution', 20000),
    explanation: str(c.explanation, 'algorithm explanation', 3000),
    problem: {
      id,
      title: source.title,
      statement: source.statement + '\n\nLimits: ' + source.constraints,
      difficulty: p.difficulty as 'Easy' | 'Medium' | 'Hard',
      concepts: selected,
      topics: selected,
      prerequisites: texts(p.prerequisites, 'prerequisites', 6, 200),
      referenceIds: [],
      starter: str(p.starter ?? '', 'starter', 2000, true),
      hints: hints as [string, string, string],
      samples: source.samples,
      cases,
      version: revision,
      exactOutput: true,
      sourceUrl: source.url,
      attribution: source.attribution,
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
