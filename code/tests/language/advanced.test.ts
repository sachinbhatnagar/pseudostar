import { describe, expect, it } from 'vitest';
import { run } from '../../src/language/machine';
import { parse } from '../../src/language/parse';
import { format } from '../../src/language/format';

describe('advanced programs', () => {
  const cases: [string, string[], string[]][] = [
    ['a = [[4, 7], [8, 9]]\na[1][2] = 6\nOUTPUT a[1][2]', [], ['6']],
    ['n = 0\nWHILE n < 3\n    n = n + 1\nENDWHILE\nOUTPUT n', [], ['3']],
    [
      'FUNCTION factorial(n)\n    IF n = 0 THEN\n        RETURN 1\n    ENDIF\n    RETURN n * factorial(n - 1)\nEND FUNCTION\nn = 99\nOUTPUT factorial(5)\nOUTPUT n',
      [],
      ['120', '99'],
    ],
    [
      'a = [1]\nFUNCTION change(a)\n    CALL APPEND(a, 2)\n    RETURN LENGTH(a)\nEND FUNCTION\nOUTPUT change(a)\nOUTPUT LENGTH(a)',
      [],
      ['2', '1'],
    ],
    [
      'm = MAP()\nCALL PUT(m, "__proto__", 8)\nOUTPUT GET(m, "__proto__")\ns = SET()\nCALL ADD(s, 4)\nCALL ADD(s, 4)\nOUTPUT LENGTH(s)\nOUTPUT HAS(s, 4)',
      [],
      ['8', '1', 'TRUE'],
    ],
    ['text = "hello"\nOUTPUT text[1]\nOUTPUT SLICE(text, 2, 4)', [], ['h', 'ell']],
    ['INPUT JSON a\nOUTPUT a[2]', ['[4,7]'], ['7']],
    ['FUNCTION read()\n    INPUT n\n    RETURN n\nEND FUNCTION\nOUTPUT read()', ['5'], ['5']],
  ];
  for (const [source, inputs, expected] of cases)
    it(source.split('\n')[0], () => {
      const result = run(source, inputs);
      expect(result.error).toBeUndefined();
      expect(result.output).toEqual(expected);
      const parsed = parse(source);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(run(format(parsed.program).source, inputs).output).toEqual(expected);
    });
  it('rejects invalid indexes, return, and missing return', () => {
    expect(run('a = [4]\nOUTPUT a[0]', []).error?.code).toBe('INVALID_INDEX');
    expect(run('RETURN 1', []).error?.code).toBe('RETURN_OUTSIDE_FUNCTION');
    expect(run('FUNCTION f()\nEND FUNCTION\nOUTPUT f()', []).error?.code).toBe('MISSING_RETURN');
  });
  it('stops empty infinite loops and recursion', () => {
    expect(run('WHILE TRUE\nENDWHILE', [], { statements: 20 }).error?.code).toBe('STEP_LIMIT');
    expect(
      run('FUNCTION f()\nRETURN f()\nEND FUNCTION\nOUTPUT f()', [], { depth: 8 }).error?.code,
    ).toBe('CALL_LIMIT');
  });
});

it('bounds collection growth, calculations, and nested input', () => {
  expect(
    run('a = [1]\nWHILE TRUE\nCALL APPEND(a, a)\nENDWHILE', [], { work: 10000 }).error,
  ).toBeDefined();
  expect(run('INPUT JSON a', ['['.repeat(40) + '1' + ']'.repeat(40)]).error?.code).toBe(
    'VALUE_LIMIT',
  );
  expect(run('m = MAP()\nOUTPUT GET(m, "missing")', []).error?.code).toBe('MISSING_KEY');
  expect(run('FUNCTION f(n)\nRETURN n\nEND FUNCTION\nOUTPUT f()', []).error?.code).toBe(
    'ARGUMENT_COUNT',
  );
});
