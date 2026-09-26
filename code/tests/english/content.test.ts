import { describe, expect, it } from 'vitest';
import { exercises } from '../../src/english/content';
import { curriculum, curriculumBasis } from '../../src/english/curriculum';
import { tools, type Grade } from '../../src/english/model';

describe('original English catalogue', () => {
  it('provides two distinct tasks per new-work tool in each grade', () => {
    expect(exercises).toHaveLength(42);
    for (const grade of [8, 9, 10] as Grade[]) {
      expect(Object.keys(curriculum[grade].skills)).toHaveLength(7);
      for (const tool of tools.filter((tool) => tool.id !== 'editing')) {
        expect(
          exercises.filter((exercise) => exercise.grade === grade && exercise.tool === tool.id),
        ).toHaveLength(2);
      }
    }
    for (const key of ['id', 'title', 'passage'] as const) {
      expect(new Set(exercises.map((exercise) => exercise[key])).size).toBe(exercises.length);
    }
    expect(new Set(exercises.map((exercise) => exercise.example.prompt)).size).toBe(
      exercises.length,
    );
  });

  it('contains complete prompts, separate worked examples and usable response fields', () => {
    for (const exercise of exercises) {
      expect(exercise.version).toBe(1);
      expect(exercise.source).toBe('curated');
      expect(exercise.instructions.length).toBeGreaterThan(80);
      expect(exercise.passage.length).toBeGreaterThan(100);
      expect(exercise.example.prompt.length).toBeGreaterThan(30);
      expect(exercise.example.response.length).toBeGreaterThan(25);
      expect(exercise.example.explanation.length).toBeGreaterThan(40);
      expect(exercise.passage).not.toContain(exercise.example.response);
      expect(exercise.fields.length).toBeGreaterThan(0);
      expect(new Set(exercise.fields.map((field) => field.id)).size).toBe(exercise.fields.length);
      for (const field of exercise.fields) {
        expect(field.label.length).toBeGreaterThan(3);
        expect(field.hint.length).toBeGreaterThan(15);
      }
      expect(exercise.criteria.length).toBeGreaterThanOrEqual(2);
      for (const criterion of exercise.criteria) {
        expect(criterion.skill in curriculum[exercise.grade].skills).toBe(true);
        expect(criterion.description.length).toBeGreaterThan(35);
      }
      expect(exercise.wordTarget[0]).toBeGreaterThan(0);
      expect(exercise.wordTarget[1]).toBeGreaterThan(exercise.wordTarget[0]);
      expect(exercise.minutes).toBeGreaterThan(0);
    }
  });

  it('includes summary, evidence, creative and practical genres without official-assessment claims', () => {
    const genres = exercises.map((exercise) => exercise.genre.toLowerCase()).join(' ');
    for (const genre of [
      'summary',
      'narrative',
      'description',
      'speech',
      'letter',
      'article',
      'report',
      'journal',
      'argument',
    ]) {
      expect(genres).toContain(genre);
    }
    expect(exercises.filter((exercise) => exercise.genre === 'Summary')).toHaveLength(3);
    expect(curriculumBasis.edition).toContain('2027');
    expect(curriculumBasis.notice).toContain('not official');
  });
});
