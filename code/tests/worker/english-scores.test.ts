import { describe, expect, it } from 'vitest';
import { exercises } from '../../src/english/content';
import {
  assessmentScore,
  RUBRIC_VERSION,
  scoreDescriptors,
  type Feedback,
  type Revision,
} from '../../src/english/model';
import { validFeedback } from '../../worker/english-ai';

const exercise = exercises[0];
const revision: Revision = {
  id: 'score-check',
  response: { response: 'The sentence gives one complete idea.' },
  plan: '',
  submittedAt: 1,
  assisted: false,
  overTime: false,
  feedback: null,
  error: null,
  rubricVersion: RUBRIC_VERSION,
};
const feedback: Feedback = {
  strengths: ['The sentence has a complete idea.'],
  corrections: [],
  nextStep: 'Check each sentence ending.',
  ratings: exercise.criteria.map(({ skill }) => ({
    skill,
    rating: 'Secure',
    score: 3,
    evidence: revision.response.response,
    explanation: 'The sentence expresses one complete idea.',
  })),
  improvement: { meaningful: false, explanation: 'This is the first response.' },
  substantive: true,
};

describe('English assessment scores', () => {
  it.each([undefined, -1, 5, 1.5, NaN, Infinity, '3', null])(
    'rejects invalid or missing score %s',
    (score) => {
      const invalid = { ...feedback, ratings: feedback.ratings.map((r) => ({ ...r, score })) };
      expect(validFeedback(invalid, exercise, revision)).toBe(false);
      expect(assessmentScore(invalid as Feedback)).toBeNull();
    },
  );
  it.each([0, 1, 2, 3, 4])('accepts score %s only with its matching rating', (score) => {
    const rating = (['Not assessed', 'Developing', 'Developing', 'Secure', 'Strong'] as const)[
      score
    ];
    const scored = {
      ...feedback,
      ratings: feedback.ratings.map((r) => ({
        ...r,
        score,
        rating,
        evidence: score ? r.evidence : '',
      })),
    };
    expect(validFeedback(scored, exercise, revision)).toBe(true);
    expect(
      validFeedback(
        {
          ...scored,
          ratings: scored.ratings.map((r) => ({
            ...r,
            rating: rating === 'Strong' ? 'Secure' : 'Strong',
          })),
        },
        exercise,
        revision,
      ),
    ).toBe(false);
  });
  it('weights every criterion equally, includes zero, and does not infer missing legacy marks', () => {
    const ratings: Feedback['ratings'] = [
      { ...feedback.ratings[0], score: 0, rating: 'Not assessed', evidence: '' },
      { ...feedback.ratings[0], score: 1, rating: 'Developing' },
      { ...feedback.ratings[0], score: 3, rating: 'Secure' },
    ];
    expect(assessmentScore({ ...feedback, ratings })).toEqual({
      total: 4,
      maximum: 12,
      percent: 33,
    });
    expect(
      assessmentScore({
        ...feedback,
        ratings: ratings.map((r) => ({ ...r, score: 0, rating: 'Not assessed' })),
      }),
    ).toEqual({ total: 0, maximum: 12, percent: 0 });
    expect(
      assessmentScore({ ...feedback, ratings: [...ratings, { ...ratings[0], score: undefined }] }),
    ).toBeNull();
    expect(assessmentScore({ ...feedback, ratings: [] })).toBeNull();
    expect(assessmentScore(null)).toBeNull();
    expect(assessmentScore(undefined)).toBeNull();
    expect(scoreDescriptors).toEqual([
      'No relevant evidence',
      'Limited',
      'Developing',
      'Secure',
      'Strong',
    ]);
  });
});
