import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { catalog } from '../../src/problems/catalog';
import { run } from '../../src/language/machine';
import { checkProgram } from '../../src/problems/check';

describe('corrected textbook reference execution', () => {
  const files = readdirSync('../references').filter((file) => file.endsWith('.md'));
  it('contains exactly twenty marked programs', () => {
    expect(files).toHaveLength(20);
    for (const file of files) {
      const text = readFileSync('../references/' + file, 'utf8');
      expect(text.match(/<!-- prettier-ignore-start -->/g), file).toHaveLength(1);
      expect(text.match(/<!-- prettier-ignore-end -->/g), file).toHaveLength(1);
    }
  });
  for (const file of files)
    it(file, () => {
      const text = readFileSync('../references/' + file, 'utf8');
      const source = text
        .split('<!-- prettier-ignore-start -->')[1]
        .split('<!-- prettier-ignore-end -->')[0]
        .trim();
      if (file === 'task_3_1.md') {
        for (const choice of ['YES', 'yes', 'Yes', 'no']) {
          const result = run(source, [choice]);
          expect(result.error).toBeUndefined();
          expect(result.output.at(-1)).toBe(
            `New position is x=${choice === 'no' ? 500 : 501} y= 450`,
          );
        }
        return;
      }
      if (file === 'task_3_2.md') {
        for (const [direction, x, y] of [
          ['left', 499, 450],
          ['right', 501, 450],
          ['up', 500, 449],
          ['down', 500, 451],
          ['other', 500, 450],
        ] as const) {
          const result = run(source, [direction]);
          expect(result.error).toBeUndefined();
          expect(result.output.at(-1)).toBe(`New position is x=${x} y= ${y}`);
        }
        return;
      }
      const problem = catalog.find(
        (p) => p.id.startsWith('ref-') && p.referenceIds.includes(file.replace('.md', '')),
      )!;
      expect(problem).toBeDefined();
      for (const result of checkProgram(problem, source))
        expect(result.passed, JSON.stringify(result)).toBe(true);
    });
});
