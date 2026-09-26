import { afterEach, describe, expect, it } from 'vitest';
import { harness } from './harness';
import { exercises } from '../../src/english/content';
import {
  assessmentScore,
  RUBRIC_VERSION,
  type Attempt,
  type Exercise,
  type Feedback,
} from '../../src/english/model';

let h: Awaited<ReturnType<typeof harness>>;
afterEach(async () => {
  await h?.close();
});
function fixture(context: Record<string, unknown>): unknown {
  if (context.kind === 'english-help')
    return { hint: 'Read your first sentence aloud. Where does the first complete idea end?' };
  if (context.kind === 'english-exercise')
    return exercises.find((e) => e.grade === context.grade && e.tool === context.tool);
  const exercise = context.exercise as Exercise;
  const response = Object.values(context.response as Record<string, string>).join('\n');
  return {
    strengths: ['The response gives a clear idea.'],
    corrections: [],
    nextStep: 'Check the final sentence.',
    ratings: exercise.criteria.map((c) => ({
      skill: c.skill,
      rating: context.previous ? 'Strong' : 'Secure',
      score: context.previous ? 4 : 3,
      evidence: response,
      explanation: 'The response supports this criterion.',
    })),
    improvement: {
      meaningful: !!context.previous,
      explanation: context.previous
        ? 'The changed wording develops the previous response.'
        : 'There is no previous response.',
    },
    substantive: true,
  } satisfies Feedback;
}
async function start(cookie: string, exercise = exercises[0]) {
  const response = await h.request(
    '/api/english/attempts',
    'POST',
    { exerciseId: exercise.id, mode: 'independent' },
    cookie,
  );
  expect(response.status).toBe(200);
  return ((await response.json()) as { attempt: Attempt }).attempt;
}
async function draft(
  cookie: string,
  attempt: Attempt,
  text = 'The first idea is clear because it gives relevant detail.',
) {
  const response = Object.fromEntries(
    attempt.exercise.fields.map((field) => [field.id, field.options?.[0] ?? text]),
  );
  const saved = await h.request(
    '/api/english/attempts/' + attempt.id,
    'PUT',
    {
      expectedVersion: attempt.version,
      response,
      plan: '',
      stage: 'write',
      startedAt: null,
      assisted: false,
    },
    cookie,
  );
  expect(saved.status).toBe(200);
  return ((await saved.json()) as { attempt: Attempt }).attempt;
}
async function submit(cookie: string, attempt: Attempt) {
  const result = await h.request(
    `/api/english/attempts/${attempt.id}/submit`,
    'POST',
    { expectedVersion: attempt.version },
    cookie,
  );
  expect(result.status).toBe(200);
  return ((await result.json()) as { attempt: Attempt }).attempt;
}
describe('English account storage and coaching', () => {
  it('starts a fresh independent follow-up without copying coaching or awarding revision points', async () => {
    h = await harness({ english: fixture });
    const { cookie } = await h.login();
    const parent = await submit(cookie, await draft(cookie, await start(cookie)));
    const exercise = exercises.find(
      (e) => e.grade === parent.grade && e.id !== parent.exercise.id,
    )!;
    const response = await h.request(
      '/api/english/attempts',
      'POST',
      { exerciseId: exercise.id, mode: 'independent', parentId: parent.id },
      cookie,
    );
    expect(response.status).toBe(200);
    let attempt = ((await response.json()) as { attempt: Attempt }).attempt;
    expect(attempt.assisted).toBe(false);
    expect(attempt.response).toEqual({});
    expect(attempt.grade).toBe(exercise.grade);
    expect(
      (
        await h.request(
          `/api/english/attempts/${attempt.id}/submit`,
          'POST',
          { expectedVersion: attempt.version },
          cookie,
        )
      ).status,
    ).toBe(400);
    attempt = await submit(cookie, await draft(cookie, attempt));
    expect(attempt.revisions[0].assisted).toBe(false);
    expect(attempt.revisions[0].feedback?.improvement.meaningful).toBe(false);
    const awards = await h.db
      .prepare('SELECT kind FROM english_awards WHERE attempt_id=?')
      .bind(attempt.id)
      .all<{ kind: string }>();
    expect(awards.results.map((a) => a.kind)).toEqual(['completion']);
  });

  it('pages same-time history without loss and recovers an expired submission claim', async () => {
    h = await harness({ english: fixture });
    const { cookie, user } = await h.login();
    const attempts: Attempt[] = [];
    for (let i = 0; i < 12; i++) attempts.push(await start(cookie));
    await h.db
      .prepare('UPDATE english_attempts SET created_at=? WHERE owner_id=?')
      .bind(1000, user.id)
      .run();
    const first = (await (
      await h.request('/api/english/attempts', 'GET', undefined, cookie)
    ).json()) as { attempts: Attempt[]; nextBefore: string };
    expect(first.attempts).toHaveLength(10);
    expect(first.nextBefore).toBeTruthy();
    const second = (await (
      await h.request(
        '/api/english/attempts?before=' + encodeURIComponent(first.nextBefore),
        'GET',
        undefined,
        cookie,
      )
    ).json()) as { attempts: Attempt[]; nextBefore: null };
    expect(second.attempts).toHaveLength(2);
    expect(second.nextBefore).toBeNull();
    expect(new Set([...first.attempts, ...second.attempts].map((a) => a.id)).size).toBe(12);
    let attempt = await draft(cookie, attempts[0]);
    h.groqMode('failure');
    attempt = await submit(cookie, attempt);
    const id = attempt.revisions[0].id;
    await h.db
      .prepare('UPDATE english_attempts SET lease=?,lease_until=? WHERE id=?')
      .bind('interrupted', Date.now() - 1000, attempt.id)
      .run();
    h.groqMode('ok');
    attempt = await submit(cookie, attempt);
    expect(attempt.revisions).toHaveLength(1);
    expect(attempt.revisions[0].id).toBe(id);
    expect(attempt.revisions[0].feedback).not.toBeNull();
  });

  it('guards authentication, origin, ownership, grades and immutable exercise snapshots', async () => {
    h = await harness({ english: fixture });
    expect((await h.request('/api/english/profile')).status).toBe(401);
    const a = await h.login();
    const b = await h.login('other@example.com');
    expect((await h.request('/api/english/profile', 'PUT', { grade: 7 }, a.cookie)).status).toBe(
      400,
    );
    expect(
      (
        await h.request(
          '/api/english/profile',
          'PUT',
          { grade: 8 },
          a.cookie,
          'https://foreign.test',
        )
      ).status,
    ).toBe(403);
    expect((await h.request('/api/english/profile', 'PUT', { grade: 8 }, a.cookie)).status).toBe(
      200,
    );
    const attempt = await start(a.cookie);
    expect(
      (await h.request(`/api/english/attempts/${attempt.id}`, 'GET', undefined, b.cookie)).status,
    ).toBe(404);
    expect(
      (
        await h.request(
          `/api/english/attempts/${attempt.id}/help`,
          'POST',
          { expectedVersion: 1 },
          b.cookie,
        )
      ).status,
    ).toBe(404);
    await h.request('/api/english/profile', 'PUT', { grade: 10 }, a.cookie);
    const existing = await h.request(
      `/api/english/attempts/${attempt.id}`,
      'GET',
      undefined,
      a.cookie,
    );
    expect(((await existing.json()) as { attempt: Attempt }).attempt.grade).toBe(attempt.grade);
    const updated = await draft(a.cookie, attempt);
    expect(updated.version).toBe(attempt.version + 1);
    expect(
      (
        await h.request(
          `/api/english/attempts/${attempt.id}`,
          'PUT',
          { expectedVersion: attempt.version },
          a.cookie,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await h.request(
          `/api/english/attempts/${attempt.id}`,
          'PUT',
          {
            expectedVersion: updated.version,
            response: { bogus: 'x' },
            plan: '',
            stage: 'write',
            startedAt: null,
            assisted: false,
          },
          a.cookie,
        )
      ).status,
    ).toBe(400);
  });
  it('preserves failed submissions, retries the same revision, and grants unique completion and revision points', async () => {
    h = await harness({ english: fixture });
    const { cookie } = await h.login();
    let attempt = await draft(cookie, await start(cookie));
    h.groqMode('failure');
    attempt = await submit(cookie, attempt);
    expect(attempt.revisions).toHaveLength(1);
    expect(attempt.revisions[0].feedback).toBeNull();
    expect(attempt.revisions[0].error).toBeTruthy();
    const original = attempt.revisions[0];
    original.rubricVersion = 1;
    await h.db
      .prepare('UPDATE english_revisions SET data=? WHERE id=?')
      .bind(JSON.stringify(original), original.id)
      .run();
    h.groqMode('retry-once');
    attempt = await submit(cookie, attempt);
    expect(attempt.revisions).toHaveLength(1);
    expect(attempt.revisions[0].id).toBe(original.id);
    expect(attempt.revisions[0].response).toEqual(original.response);
    expect(attempt.revisions[0].feedback).not.toBeNull();
    expect(attempt.revisions[0].rubricVersion).toBe(RUBRIC_VERSION);
    expect(assessmentScore(attempt.revisions[0].feedback)?.percent).toBe(75);
    const count = h.explanations.length;
    attempt = await submit(cookie, attempt);
    expect(h.explanations).toHaveLength(count);
    attempt = await draft(
      cookie,
      attempt,
      'The revised idea explains the cause with a precise supporting detail.',
    );
    attempt = await submit(cookie, attempt);
    expect(attempt.revisions).toHaveLength(2);
    expect(attempt.revisions[0].response).toEqual(original.response);
    expect(attempt.revisions[1].assisted).toBe(true);
    expect(assessmentScore(attempt.revisions[0].feedback)?.percent).toBe(75);
    expect(assessmentScore(attempt.revisions[1].feedback)?.percent).toBe(100);
    await submit(cookie, attempt);
    const duplicate = await draft(cookie, await start(cookie));
    await submit(cookie, duplicate);
    const list = await h.request('/api/english/attempts', 'GET', undefined, cookie);
    const data = (await list.json()) as { awards: { points: number }[] };
    expect(data.awards.map((a) => a.points).sort()).toEqual([5, 10].sort());
  });
  it('keeps successful legacy feedback without inventing scores or reevaluating it', async () => {
    h = await harness({ english: fixture });
    const { cookie } = await h.login();
    let attempt = await submit(cookie, await draft(cookie, await start(cookie)));
    const legacy = structuredClone(attempt.revisions[0]);
    legacy.rubricVersion = 1;
    for (const rating of legacy.feedback!.ratings) delete rating.score;
    await h.db
      .prepare('UPDATE english_revisions SET data=? WHERE id=?')
      .bind(JSON.stringify(legacy), legacy.id)
      .run();
    const calls = h.explanations.length;
    attempt = await submit(cookie, attempt);
    expect(attempt.revisions[0]).toEqual(legacy);
    expect(assessmentScore(attempt.revisions[0].feedback)).toBeNull();
    expect(h.explanations).toHaveLength(calls);
  });
  it('rejects invented feedback quotes and invalid generation, preserves help assistance after failure', async () => {
    let invalid = true;
    h = await harness({
      english: (context) => {
        const value = fixture(context);
        if (!invalid) return value;
        if (context.kind === 'english-exercise') return { ...(value as Exercise), grade: 7 };
        if (context.kind === 'english-feedback')
          return {
            ...(value as Feedback),
            corrections: [{ quote: 'invented words', explanation: 'bad', suggestion: 'bad' }],
          };
        return value;
      },
    });
    const { cookie } = await h.login();
    expect(
      (await h.request('/api/english/exercises', 'POST', { grade: 8, tool: 'editing' }, cookie))
        .status,
    ).toBe(400);
    expect(
      (
        await h.request(
          '/api/english/exercises',
          'POST',
          { grade: 8, tool: 'sentence-surgery' },
          cookie,
        )
      ).status,
    ).toBe(503);
    let attempt = await draft(cookie, await start(cookie));
    attempt = await submit(cookie, attempt);
    expect(attempt.revisions[0].feedback).toBeNull();
    h.groqMode('failure');
    const help = await h.request(
      `/api/english/attempts/${attempt.id}/help`,
      'POST',
      { expectedVersion: attempt.version },
      cookie,
    );
    const result = (await help.json()) as { attempt: Attempt; error: string };
    expect(result.attempt.assisted).toBe(true);
    expect(result.error).toBeTruthy();
    attempt = await draft(cookie, result.attempt);
    expect(attempt.assisted).toBe(true);
    invalid = false;
    h.groqMode('ok');
    const generated = await h.request(
      '/api/english/exercises',
      'POST',
      { grade: 8, tool: 'sentence-surgery' },
      cookie,
    );
    expect(generated.status).toBe(200);
    const exercise = ((await generated.json()) as { exercise: Exercise }).exercise;
    expect(exercise.source).toBe('generated');
    expect(exercise.id).not.toBe(exercises[0].id);
    const foreign = await h.login('foreign@example.com');
    expect(
      (
        await h.request(
          '/api/english/attempts',
          'POST',
          { exerciseId: exercise.id, mode: 'practice' },
          foreign.cookie,
        )
      ).status,
    ).toBe(404);
  });
  it('serializes concurrent submissions and rejects forged history and timer resets', async () => {
    h = await harness({ english: fixture });
    const { cookie } = await h.login();
    const attempt = await draft(cookie, await start(cookie));
    const results = await Promise.all(
      [1, 2].map(() =>
        h.request(
          `/api/english/attempts/${attempt.id}/submit`,
          'POST',
          { expectedVersion: attempt.version },
          cookie,
        ),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const stored = (
      (await (
        await h.request(`/api/english/attempts/${attempt.id}`, 'GET', undefined, cookie)
      ).json()) as { attempt: Attempt }
    ).attempt;
    expect(stored.revisions).toHaveLength(1);
    const saved = await h.request(
      `/api/english/attempts/${stored.id}`,
      'PUT',
      {
        expectedVersion: stored.version,
        response: stored.response,
        plan: '',
        stage: 'write',
        startedAt: Date.now(),
        assisted: false,
        revisions: [],
      },
      cookie,
    );
    const timed = ((await saved.json()) as { attempt: Attempt }).attempt;
    expect(timed.revisions).toHaveLength(1);
    expect(
      (
        await h.request(
          `/api/english/attempts/${stored.id}`,
          'PUT',
          {
            expectedVersion: timed.version,
            response: timed.response,
            plan: '',
            stage: 'write',
            startedAt: null,
            assisted: false,
          },
          cookie,
        )
      ).status,
    ).toBe(400);
  });
});
