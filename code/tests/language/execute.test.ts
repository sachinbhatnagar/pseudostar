import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '../../src/language/parse';
import { format } from '../../src/language/format';
import { run } from '../../src/language/machine';
describe('reference dialect', () => {
  for (const file of readdirSync('../references').filter((f) => f.endsWith('.md')))
    it(`parses and round trips ${file}`, () => {
      const source = readFileSync(`../references/${file}`, 'utf8')
        .split('<!-- prettier-ignore-start -->')[1]
        .split('<!-- prettier-ignore-end -->')[0]
        .trim();
      const parsed = parse(source);
      expect(parsed.ok, JSON.stringify(parsed)).toBe(true);
      if (parsed.ok) {
        const again = parse(format(parsed.program).source);
        expect(again.ok).toBe(true);
        expect(again.ok && format(again.program).source).toBe(format(parsed.program).source);
      }
    });
  it('uses inclusive TO and exclusive RANGE', () => {
    expect(run('FOR i = 1 TO 3\nOUTPUT i\nNEXT i', []).output).toEqual(['1', '2', '3']);
    expect(run('FOR i IN RANGE(1, 3):\n    OUTPUT i', []).output).toEqual(['1', '2']);
  });
  it('keeps strings and output concatenation', () =>
    expect(run('INPUT n\nPRINT "Total " + n\nOUTPUT "Value: ", n & "!"', ['4']).output).toEqual([
      'Total 4',
      'Value: 4!',
    ]));
  it('reports missing values and zero division', () => {
    expect(run('OUTPUT missing', []).error?.code).toBe('UNASSIGNED_VARIABLE');
    expect(run('OUTPUT 1 / 0', []).error?.code).toBe('DIVISION_BY_ZERO');
  });
  it('short circuits comparisons', () =>
    expect(run('IF 1 == 1 OR absent > 0 THEN\nOUTPUT "yes"\nENDIF', []).output).toEqual(['yes']));
  it('shares variables with sub-routines', () =>
    expect(run('SUB-ROUTINE add()\nx = x + 1\nEND SUB\nx = 1\nadd()\nOUTPUT x', []).output).toEqual(
      ['2'],
    ));
  it('protects active loop counters', () =>
    expect(run('FOR i = 1 TO 3\ni = 0\nNEXT i', []).error?.code).toBe('LOOP_COUNTER_WRITE'));
  it('limits recursion and output', () => {
    expect(run('SUB-ROUTINE again()\nagain()\nEND SUB\nagain()', []).error?.code).toBe(
      'CALL_LIMIT',
    );
    expect(run('FOR i = 1 TO 1000000\nOUTPUT i\nNEXT i', []).error?.code).toBe('OUTPUT_LIMIT');
  });
  it('checks every largest-pair ordering and tie', () => {
    const source = readFileSync('../references/task_1_3.md', 'utf8')
      .split('<!-- prettier-ignore-start -->')[1]
      .split('<!-- prettier-ignore-end -->')[0];
    for (let a = -2; a <= 3; a++)
      for (let b = -2; b <= 3; b++)
        for (let c = -2; c <= 3; c++) {
          const sorted = [a, b, c].sort((x, y) => y - x);
          expect(run(source, [String(a), String(b), String(c)]).output).toEqual([
            `The result is ${sorted[0] * sorted[1]}`,
          ]);
        }
  });
  it('rejects malformed programs', () => {
    for (const source of [
      'IF x THEN',
      'OUTPUT "open',
      'FOR i = 1 TO 3\nNEXT j',
      'OUTPUT 1 < 2 < 3',
    ])
      expect(parse(source).ok).toBe(false);
  });
  it('limits repeated ampersand concatenation before assigning the oversized value', () => {
    const result = run('x = "a"\nFOR i = 1 TO 20\nx = x & x\nNEXT i', []);
    expect(result.error?.code).toBe('VALUE_LIMIT');
    expect(result.variables.x).toHaveLength(131072);
  });
  it('allows the ampersand text limit and rejects one extra character', () => {
    const source = 'INPUT chunk\nx = ""\nFOR i = 1 TO 20\nx = x & chunk\nNEXT i';
    const inputs = ['a'.repeat(10000)];
    const accepted = run(source, inputs);
    expect(accepted.error).toBeUndefined();
    expect(accepted.variables.x).toHaveLength(200000);
    const rejected = run(`${source}\nx = x & "b"`, inputs);
    expect(rejected.error?.code).toBe('VALUE_LIMIT');
    expect(rejected.variables.x).toBe(accepted.variables.x);
  });
  it.each(['OUTPUT 1 "+" 2', 'OUTPUT TRUE "AND" FALSE', 'OUTPUT 1 "," 2', 'OUTPUT (1 ")"'])(
    'rejects quoted syntax in %s',
    (source) => {
      const result = parse(source);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.diagnostics[0].code).toBe('SYNTAX_ERROR');
    },
  );
  it('keeps quoted operators and delimiters as output text', () => {
    const result = run('OUTPUT "+", "AND", ",", ")", (1 + 2)', []);
    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(['+AND,)3']);
  });
  it.each([
    { source: 'OUTPUT 1 +\nOUTPUT 2', line: 1, text: 'OUTPUT 1 +' },
    { source: 'OUTPUT 0\nx = (\nOUTPUT 2', line: 2, text: 'x = (' },
    { source: 'IF 1 + THEN\nOUTPUT 2\nENDIF', line: 1, text: 'IF 1 + THEN' },
    { source: 'IF 1 +\nTHEN\nOUTPUT 2\nENDIF', line: 1, text: 'IF 1 +' },
    {
      source: 'IF 1 = 2 THEN\nOUTPUT 0\nELSEIF 1 + THEN\nOUTPUT 2\nENDIF',
      line: 3,
      text: 'ELSEIF 1 + THEN',
    },
  ])('locates the invalid expression in $text', ({ source, line, text }) => {
    const result = parse(source);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics[0]).toMatchObject({
        code: 'SYNTAX_ERROR',
        nodeId: `line-${line}`,
        range: {
          start: source.indexOf(text),
          end: source.indexOf(text) + text.length,
          line,
          column: 1,
        },
      });
  });
  it('preserves CRLF offsets in statement ranges and runtime diagnostics', () => {
    const source = 'OUTPUT 1\r\n\r\n    OUTPUT missing';
    const expected = {
      start: source.indexOf('    OUTPUT'),
      end: source.length,
      line: 3,
      column: 5,
    };
    const parsed = parse(source);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.program.statements[1].range).toEqual(expected);
    expect(run(source, []).error).toMatchObject({
      code: 'UNASSIGNED_VARIABLE',
      nodeId: 'line-3',
      range: expected,
    });
  });
});
