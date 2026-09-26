import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { newAttempt, type Revision } from '../../src/english/model';
import {
  clearRecovery,
  clearSavedRecovery,
  GUEST_KEY,
  readGuest,
  readRecovery,
  saveGuestAttempt,
  saveGuestGrade,
  writeRecovery,
} from '../../src/english/storage';

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
const submitted: Revision = {
  id: 'r1',
  response: { answer: 'My response' },
  plan: '',
  submittedAt: Date.now(),
  assisted: false,
  overTime: false,
  feedback: null,
  error: null,
  rubricVersion: 1,
};
afterEach(() => vi.unstubAllGlobals());

describe('English device storage', () => {
  it('preserves submissions and old grades, rejects stale changes and revision edits', () => {
    const device = storage();
    saveGuestGrade(8, device);
    const first = saveGuestAttempt(newAttempt(exercises[0]), undefined, device);
    const submittedAttempt = saveGuestAttempt({ ...first, revisions: [submitted] }, 1, device);
    expect(submittedAttempt.version).toBe(2);
    expect(() => saveGuestAttempt(first, 1, device)).toThrow('newer guest version');
    expect(() => saveGuestAttempt({ ...submittedAttempt, revisions: [] }, 2, device)).toThrow(
      'cannot be changed',
    );
    saveGuestGrade(10, device);
    expect(readGuest(device)).toMatchObject({
      grade: 10,
      attempts: [{ grade: first.grade, revisions: [submitted] }],
    });
    expect(() => saveGuestAttempt({ ...first, id: 'missing', version: 2 }, 2, device)).toThrow(
      'missing',
    );
  });
  it.each([
    '{',
    'null',
    '{"version":2,"grade":8,"attempts":[]}',
    '{"version":1,"grade":8,"attempts":[{}]}',
  ])('keeps corrupt library: %s', (raw) => {
    const device = storage();
    device.setItem(GUEST_KEY, raw);
    expect(() => readGuest(device)).toThrow('stored data was kept');
    expect(() => saveGuestGrade(9, device)).toThrow('stored data was kept');
    expect(() => saveGuestAttempt(newAttempt(exercises[0]), undefined, device)).toThrow(
      'stored data was kept',
    );
    expect(device.getItem(GUEST_KEY)).toBe(raw);
  });
  it('scopes recovery to owner, strips feedback and validates versions before replacement', () => {
    const device = storage(),
      attempt = { ...newAttempt(exercises[0]), revisions: [submitted] };
    writeRecovery('one', attempt, 1, device);
    expect(readRecovery('two', attempt.id, device)).toBeNull();
    expect(readRecovery('one', attempt.id, device)).toMatchObject({
      attempt: { revisions: [] },
      baseVersion: 1,
    });
    expect(() => writeRecovery('one', attempt, 2, device)).toThrow('version is invalid');
    const key = [...device.values.keys()][0];
    device.setItem(key, '{');
    expect(() => writeRecovery('one', attempt, 1, device)).toThrow('stored data was kept');
    expect(() => clearRecovery('one', attempt.id, device)).toThrow('stored data was kept');
    expect(device.getItem(key)).toBe('{');
  });
  it('reports quota failures without losing the previous library', () => {
    const device = storage();
    saveGuestGrade(8, device);
    const before = device.getItem(GUEST_KEY);
    device.setItem = () => {
      throw new Error('quota');
    };
    expect(() => saveGuestGrade(9, device)).toThrow('Device storage');
    expect(device.getItem(GUEST_KEY)).toBe(before);
  });
  it('clears only the recovery snapshot acknowledged by the save', () => {
    const device = storage(),
      attempt = newAttempt(exercise);
    writeRecovery('one', attempt, 1, device);
    const changed = { ...attempt, response: { answer: 'Newer draft' } };
    writeRecovery('one', changed, 1, device);
    expect(clearSavedRecovery('one', attempt, 1, device)).toBe(false);
    expect(readRecovery('one', attempt.id, device)?.attempt.response).toEqual(changed.response);
    expect(clearSavedRecovery('one', changed, 2, device)).toBe(false);
    expect(clearSavedRecovery('one', changed, 1, device)).toBe(true);
    expect(readRecovery('one', attempt.id, device)).toBeNull();
  });
  it('keeps each tab recovery separate and reuses its namespace on reload', () => {
    const shared = storage(),
      firstSession = storage(),
      secondSession = storage();
    const attempt = newAttempt(exercise);
    vi.stubGlobal('localStorage', shared);
    vi.stubGlobal('sessionStorage', firstSession);
    writeRecovery('one', attempt, 1);
    vi.stubGlobal('sessionStorage', secondSession);
    expect(readRecovery('one', attempt.id)?.attempt.plan).toBe('');
    const second = { ...attempt, plan: 'Second tab plan', updatedAt: attempt.updatedAt + 1 };
    writeRecovery('one', second, 1);
    vi.stubGlobal('sessionStorage', firstSession);
    expect(readRecovery('one', attempt.id)?.attempt.plan).toBe('');
    expect(clearSavedRecovery('one', attempt, 1)).toBe(true);
    vi.stubGlobal('sessionStorage', secondSession);
    expect(readRecovery('one', attempt.id)?.attempt.plan).toBe('Second tab plan');
  });
  it('recovers the latest abandoned tab draft and clears only matching copies', () => {
    const shared = storage(),
      firstSession = storage(),
      secondSession = storage();
    const attempt = newAttempt(exercise);
    vi.stubGlobal('localStorage', shared);
    vi.stubGlobal('sessionStorage', firstSession);
    writeRecovery('one', attempt, 1);
    vi.stubGlobal('sessionStorage', secondSession);
    const latest = { ...attempt, plan: 'Latest recovered draft', updatedAt: attempt.updatedAt + 1 };
    writeRecovery('one', latest, 1);
    vi.stubGlobal('sessionStorage', storage());
    expect(readRecovery('one', attempt.id)?.attempt.plan).toBe(latest.plan);
    expect(readRecovery('another-owner', attempt.id)).toBeNull();
    writeRecovery('one', latest, 1);
    expect(clearSavedRecovery('one', latest, 1)).toBe(true);
    expect(readRecovery('one', attempt.id)?.attempt.plan).toBe(attempt.plan);
    expect(shared.values.size).toBe(1);
  });
});
