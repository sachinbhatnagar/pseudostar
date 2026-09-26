import { expect, it } from 'vitest';
import { parse } from '../../src/language/parse';
import { format } from '../../src/language/format';
import { run } from '../../src/language/machine';

it.each(['AS', '=', 'as'])('runs COMPUTE with %s and formats it as AS', (separator) => {
  const source = `INPUT height\nINPUT width\nCOMPUTE area ${separator} height * width\nOUTPUT area`;
  expect(run(source, ['4', '5'])).toMatchObject({ output: ['20'], variables: { area: 20 } });
  const parsed = parse(source);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  const formatted = format(parsed.program).source;
  expect(formatted).toContain('COMPUTE area AS height * width');
  expect(run(formatted, ['4', '5']).output).toEqual(['20']);
});

it('uses the existing assignment rules in functions, loops, and nested lists', () => {
  const source = `FUNCTION double(n)
    Compute result as n * 2
    RETURN result
END FUNCTION
SET items = [[1, 2]]
count = 0
WHILE count < 2
    COMPUTE count AS count + 1
    COMPUTE items[1][count] AS double(count)
ENDWHILE
OUTPUT items
OUTPUT count`;
  const result = run(source, []);
  expect(result.error).toBeUndefined();
  expect(result.output).toEqual(['[[2,4]]', '2']);
  expect(run('COMPUTE n AS missing + 1', []).error?.code).toBe('UNASSIGNED_VARIABLE');
  expect(run('SET items = [1]\nCOMPUTE items[0] AS 2', []).error?.code).toBe('INVALID_INDEX');
  expect(run('FOR i = 1 TO 2\nCOMPUTE i AS 3\nNEXT i', []).error?.code).toBe('LOOP_COUNTER_WRITE');
});

it.each(['COMPUTE n AS', 'COMPUTE n TO 2', 'COMPUTE LENGTH(items) AS 2', 'n AS 2', 'SET n AS 2'])(
  'rejects invalid assignment: %s',
  (source) => expect(parse(source).ok).toBe(false),
);

it('does not change identifiers, strings, or existing assignment forms', () => {
  expect(run('FUNCTION compute()\nRETURN 1\nEND FUNCTION\ncompute()', []).error).toBeUndefined();
  expect(
    run('compute = 2\nCOMPUTE total AS compute + 1\nOUTPUT "COMPUTE AS", total', []).output,
  ).toEqual(['COMPUTE AS3']);
  expect(run('SET n TO 2\nn = n + 1\nSET n = n + 1\nOUTPUT n', []).output).toEqual(['4']);
});

it.each(['COMPUTE items[1] AS', 'COMPUTE items[1] =', 'SET items[1] =', 'items[1] ='])(
  'separates the assignment from equality in its value: %s',
  (assignment) => {
    const result = run(`SET items = [0, 2]\n${assignment} items[2] = 2\nOUTPUT items[1]`, []);
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(['TRUE']);
  },
);
