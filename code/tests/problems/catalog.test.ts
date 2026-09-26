import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { catalog } from '../../src/problems/catalog';
import { internalSolutions } from '../../internal/solutions';
import { checkProgram } from '../../src/problems/check';

const referenceIds = [
  ...Array.from({ length: 7 }, (_, i) => `task_1_${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `task_2_${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `task_3_${i + 1}`),
];

describe('production problem content', () => {
  it('has 60 stable IDs with 20 problems per level', () => {
    expect(catalog).toHaveLength(60);
    expect(new Set(catalog.map((p) => p.id)).size).toBe(60);
    expect(new Set(catalog.map((p) => p.title)).size).toBe(60);
    for (const level of ['Easy', 'Medium', 'Hard']) {
      expect(catalog.filter((p) => p.difficulty === level)).toHaveLength(20);
    }
  });

  it('adapts every reference exactly once and adds 40 original tasks', () => {
    const adaptations = catalog.filter((p) => p.id.startsWith('ref-'));
    expect(adaptations).toHaveLength(20);
    expect(adaptations.flatMap((p) => p.referenceIds).sort()).toEqual([...referenceIds].sort());
    expect(catalog.filter((p) => !p.id.startsWith('ref-'))).toHaveLength(40);
    for (const problem of adaptations) {
      expect(problem.referenceIds).toEqual([`task_${problem.id.slice(4).replaceAll('-', '_')}`]);
    }
  });

  for (const problem of catalog) {
    it(`${problem.id}: runs its stored solution against every case`, () => {
      for (const result of checkProgram(problem, internalSolutions[problem.id]))
        expect(result.passed, JSON.stringify(result)).toBe(true);
    });
    it(`${problem.id}: has complete public metadata and progressive help`, () => {
      expect(problem.version).toBe(1);
      expect(problem.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(problem.statement.length).toBeGreaterThan(60);
      expect(problem.concepts.length).toBeGreaterThan(0);
      expect(problem.referenceIds.length).toBeGreaterThan(0);
      for (const id of problem.referenceIds) expect(referenceIds).toContain(id);
      expect(problem.hints).toHaveLength(3);
      expect(new Set(problem.hints).size).toBe(3);
      for (const hint of problem.hints) expect(hint.trim().length).toBeGreaterThan(15);
      expect(problem.starter.trim()).not.toBe('');
      expect(problem.starter).not.toBe(internalSolutions[problem.id]);
      expect(Object.keys(problem).sort()).toEqual(
        [
          'id',
          'title',
          'statement',
          'difficulty',
          'concepts',
          'referenceIds',
          'starter',
          'hints',
          'samples',
          'cases',
          'version',
        ].sort(),
      );
    });

    it(`${problem.id}: has distinct checks and a matching sample`, () => {
      expect(problem.cases.length).toBeGreaterThanOrEqual(3);
      expect(new Set(problem.cases.map((c) => JSON.stringify(c.inputs))).size).toBe(
        problem.cases.length,
      );
      expect(
        new Set(problem.cases.map((c) => JSON.stringify([c.expectedOutput, c.expectedVariables])))
          .size,
      ).toBeGreaterThan(1);
      for (const check of problem.cases) {
        expect(check.inputs.every((input) => typeof input === 'string')).toBe(true);
        expect(
          (check.expectedOutput?.length ?? 0) + Object.keys(check.expectedVariables ?? {}).length,
        ).toBeGreaterThan(0);
        for (const line of check.expectedOutput ?? []) {
          expect(typeof line).toBe('string');
          expect(line).not.toContain('\n');
        }
      }
      expect(problem.samples.length).toBeGreaterThan(0);
      for (const sample of problem.samples) {
        const matching = problem.cases.find(
          (c) => JSON.stringify(c.inputs) === JSON.stringify(sample.inputs),
        );
        expect(matching?.expectedOutput).toEqual(sample.outputs);
      }
    });
  }

  it('keeps exactly one private model answer per problem', () => {
    expect(Object.keys(internalSolutions).sort()).toEqual(catalog.map((p) => p.id).sort());
    for (const source of Object.values(internalSolutions)) {
      expect(source.trim().length).toBeGreaterThan(30);
      expect(source).not.toMatch(/\b(?:WHILE|REPEAT|DECLARE|RETURN)\b/);
      expect(source).not.toContain('←');
    }
  });

  it('has no client imports of private model answers', () => {
    const root = fileURLToPath(new URL('../../src', import.meta.url));
    const visit = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
          const source = readFileSync(path, 'utf8');
          expect(source, path).not.toMatch(/internalSolutions|internal\/solutions/);
        }
      }
    };
    visit(root);
  });
});
