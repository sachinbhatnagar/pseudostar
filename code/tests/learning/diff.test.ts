import { expect, it } from 'vitest';
import { compareLines } from '../../src/learning/diff';
it('aligns inserted lines without marking the following common line as changed', () => {
  expect(compareLines('INPUT n\nOUTPUT n', 'INPUT n\nn = n + 1\nOUTPUT n')).toEqual([
    { left: 'INPUT n', right: 'INPUT n', leftLine: 1, rightLine: 1, changed: false },
    { left: undefined, right: 'n = n + 1', leftLine: undefined, rightLine: 2, changed: true },
    { left: 'OUTPUT n', right: 'OUTPUT n', leftLine: 2, rightLine: 3, changed: false },
  ]);
});
it('pairs changed lines and preserves indentation', () => {
  const rows = compareLines(
    'IF n > 1 THEN\n    OUTPUT 1\nENDIF',
    'IF n > 2 THEN\n    OUTPUT 2\nENDIF',
  );
  expect(rows).toHaveLength(3);
  expect(rows[0].changed).toBe(true);
  expect(rows[1].left).toBe('    OUTPUT 1');
  expect(rows[2].changed).toBe(false);
});
it('bounds comparison work for large programs without dropping lines', () => {
  const text = Array.from({ length: 1500 }, (_, i) => `OUTPUT ${i}`).join('\n');
  expect(compareLines(text, text)).toHaveLength(1500);
});
