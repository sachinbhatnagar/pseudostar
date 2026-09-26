import { expect, it } from 'vitest';
import type { Exercise } from '../../src/english/model';
const exercise: Exercise = {
  id: 'test',
  version: 1,
  grade: 8,
  tool: 'sentence-surgery',
  title: 'Test',
  genre: 'sentence',
  instructions: 'Edit.',
  passage: 'A sentence.',
  example: { prompt: 'Example', response: 'Example.', explanation: 'A full stop.' },
  fields: [{ id: 'answer', label: 'Response', hint: '' }],
  criteria: [{ skill: 'accuracy', description: 'Punctuation' }],
  wordTarget: [1, 20],
  minutes: 5,
  source: 'curated',
};
const exercises = [exercise, { ...exercise, id: 'fresh' }];
import { newAttempt, type Feedback, type Revision } from '../../src/english/model';
import {
  assessmentHistory,
  monthlyProgress,
  recommend,
  skillEvidence,
} from '../../src/english/progress';

const feedback: Feedback = {
  strengths: ['Clear'],
  corrections: [],
  nextStep: 'Explain your evidence.',
  ratings: [{ skill: 'accuracy', rating: 'Secure', evidence: 'response', explanation: 'Clear' }],
  improvement: { meaningful: false, explanation: '' },
  substantive: true,
};
const revision = (submittedAt: number, evaluated = true): Revision => ({
  id: String(submittedAt),
  response: { answer: 'response' },
  plan: '',
  submittedAt,
  assisted: true,
  overTime: false,
  feedback: evaluated ? feedback : null,
  error: null,
  rubricVersion: 1,
});
it('keeps historical months, zero-point practice and deduplicated awards', () => {
  const a = newAttempt(exercises[0]);
  a.revisions = [
    revision(Date.UTC(2024, 0, 1)),
    revision(Date.UTC(2026, 8, 2), false),
    revision(Date.UTC(2026, 8, 2, 1), false),
  ];
  const award = {
    id: 'award',
    attemptId: a.id,
    exerciseId: a.exercise.id,
    exerciseVersion: 1,
    kind: 'completion' as const,
    points: 10,
    earnedAt: Date.UTC(2024, 0, 1),
  };
  expect(monthlyProgress([a], [award, award])).toEqual([
    { month: '2024-01', points: 10, practiceDays: 1, completed: 1 },
    { month: '2026-09', points: 0, practiceDays: 1, completed: 0 },
  ]);
});
it('preserves dated categorical observations and assistance with grade/rubric boundaries', () => {
  const a = newAttempt(exercises[0]);
  a.revisions = [revision(1), { ...revision(2), assisted: false, rubricVersion: 2 }];
  expect(skillEvidence([a, { ...a, grade: 10 }], 8)).toMatchObject([
    { submittedAt: 2, rating: 'Secure', assisted: false, rubricVersion: 2 },
    { submittedAt: 1, assisted: true, rubricVersion: 1 },
  ]);
});
it('recommends unfinished work, feedback revision, fresh checks and new practice', () => {
  const a = newAttempt(exercises[0]);
  expect(recommend([a], exercises, 8).attemptId).toBe(a.id);
  a.response = { answer: 'response' };
  a.revisions = [
    {
      ...revision(1),
      feedback: { ...feedback, ratings: [{ ...feedback.ratings[0], rating: 'Developing' }] },
    },
  ];
  expect(recommend([a], exercises, 8)).toEqual({ attemptId: a.id, reason: feedback.nextStep });
  a.revisions = [revision(1)];
  expect(recommend([a], exercises, 8).exerciseId).not.toBe(a.exercise.id);
  expect(recommend([], exercises, 8).exerciseId).toBeDefined();
});

it('keeps scored revisions separate by grade, assistance and date without inventing legacy scores', () => {
  const a = newAttempt(exercises[0]);
  const scored = (score: number) => ({ ...feedback, ratings: [{ ...feedback.ratings[0], score }] });
  a.revisions = [
    { ...revision(1), id: 'old' },
    { ...revision(2), id: 'first', assisted: false, feedback: scored(0), rubricVersion: 2 },
    { ...revision(3), id: 'revision', feedback: scored(3), rubricVersion: 2 },
  ];
  expect(assessmentHistory([a, { ...a, grade: 10 }], 8)).toMatchObject([
    { revisionId: 'revision', percent: 75, assisted: true, version: 3, rubricVersion: 2 },
    { revisionId: 'first', percent: 0, assisted: false, version: 2, rubricVersion: 2 },
  ]);
});
