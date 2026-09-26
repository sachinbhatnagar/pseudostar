import type { Env } from './env';
import { ApiError, body, fail, integer, str } from './validation';
import { exercises } from '../src/english/content';
import {
  isGrade,
  newAttempt,
  responseText,
  practiceExercise,
  RUBRIC_VERSION,
  skillNames,
  tools,
  type Attempt,
  type Award,
  type Exercise,
  type Feedback,
  type Revision,
  type Skill,
} from '../src/english/model';
import {
  englishAI,
  exercisePrompt,
  feedbackPrompt,
  validExercise,
  validFeedback,
} from './english-ai';

type Row = {
  id: string;
  data: string;
  version: number;
  lease: string | null;
  lease_until: number;
  created_at: number;
};
async function load(env: Env, owner: string, id: string) {
  const row = await env.DB.prepare('SELECT * FROM english_attempts WHERE id=? AND owner_id=?')
    .bind(id, owner)
    .first<Row>();
  if (!row) fail(404, 'NOT_FOUND', 'Attempt not found.');
  const revisions = await env.DB.prepare(
    'SELECT data FROM english_revisions WHERE attempt_id=? ORDER BY submitted_at,id',
  )
    .bind(id)
    .all<{ data: string }>();
  const attempt: Attempt = {
    ...JSON.parse(row.data),
    version: row.version,
    revisions: revisions.results.map((r) => JSON.parse(r.data)),
  };
  return { row, attempt };
}
const conflict = () =>
  fail(
    409,
    'VERSION_CONFLICT',
    'This attempt changed. Reload it before saving. Your local draft is still available.',
  );
function check(row: Row, expected: unknown) {
  if (!Number.isSafeInteger(expected) || expected !== row.version || row.lease_until > Date.now())
    conflict();
}
async function save(env: Env, owner: string, attempt: Attempt, version: number) {
  const data = { ...attempt, revisions: [], version: version + 1, updatedAt: Date.now() };
  const result = await env.DB.prepare(
    'UPDATE english_attempts SET data=?,version=version+1,lease=NULL,lease_until=0 WHERE id=? AND owner_id=? AND version=? AND lease_until<=?',
  )
    .bind(JSON.stringify(data), attempt.id, owner, version, Date.now())
    .run();
  if (!result.meta.changes) conflict();
  return (await load(env, owner, attempt.id)).attempt;
}
function cursor(url: URL) {
  const before = url.searchParams.get('before');
  if (!before) return { time: Number.MAX_SAFE_INTEGER, id: '~' };
  const parts = /^(\d+):([a-zA-Z0-9-]+)$/.exec(before);
  if (!parts) fail(400, 'INVALID_CURSOR', 'Use the next page link.');
  return { time: integer(Number(parts[1]), 'cursor', 0, Number.MAX_SAFE_INTEGER), id: parts[2] };
}
async function exerciseFor(env: Env, owner: string, id: string): Promise<Exercise> {
  const curated = exercises.find((e) => e.id === id);
  if (curated) return curated;
  const row = await env.DB.prepare('SELECT data FROM english_exercises WHERE id=? AND owner_id=?')
    .bind(id, owner)
    .first<{ data: string }>();
  if (!row) fail(404, 'NOT_FOUND', 'Exercise not found.');
  return JSON.parse(row.data);
}
function draftInput(b: Record<string, unknown>, attempt: Attempt) {
  if (!b.response || typeof b.response !== 'object' || Array.isArray(b.response))
    fail(400, 'INVALID_FIELD', 'Check the response.');
  const response: Record<string, string> = {};
  for (const [key, value] of Object.entries(b.response)) {
    const field = attempt.exercise.fields.find((f) => f.id === key);
    if (!field) fail(400, 'INVALID_FIELD', 'Use the fields from this exercise.');
    const input = str(value, field.label, 15000, true);
    if (field.options && input && !field.options.includes(input))
      fail(400, 'INVALID_FIELD', 'Choose a listed answer.');
    response[key] = input;
  }
  if (new TextEncoder().encode(responseText(response)).length > 24000)
    fail(400, 'INVALID_FIELD', 'Reduce the response length.');
  if (
    !['plan', 'write', 'proofread'].includes(b.stage as string) ||
    typeof b.assisted !== 'boolean'
  )
    fail(400, 'INVALID_FIELD', 'Check the writing stage and assistance state.');
  if (b.startedAt !== null) integer(b.startedAt, 'start time', attempt.createdAt, Date.now());
  if (attempt.startedAt !== null && b.startedAt !== attempt.startedAt)
    fail(400, 'INVALID_FIELD', 'The timer has already started.');
  return {
    ...attempt,
    response,
    plan: str(b.plan, 'plan', 6000, true),
    stage: b.stage as Attempt['stage'],
    assisted: attempt.assisted || b.assisted,
    startedAt: b.startedAt as number | null,
  };
}
const sameResponse = (a: Record<string, string>, b: Record<string, string>) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].every(
    (key) => (a[key] ?? '') === (b[key] ?? ''),
  );

async function submit(env: Env, owner: string, row: Row, attempt: Attempt) {
  if (
    practiceExercise(attempt.exercise).fields.some((field) => !attempt.response[field.id]?.trim())
  )
    fail(400, 'INCOMPLETE_RESPONSE', 'Complete each response field before submitting.');
  if (!responseText(attempt.response).trim())
    fail(400, 'EMPTY_RESPONSE', 'Write a response before submitting.');
  const previous = attempt.revisions.at(-1);
  const unchanged =
    previous && sameResponse(previous.response, attempt.response) && previous.plan === attempt.plan;
  if (unchanged && previous.feedback) return Response.json({ attempt });
  if (!unchanged && attempt.revisions.length >= 100)
    fail(409, 'REVISION_LIMIT', 'Start a new attempt to continue this exercise.');
  const now = Date.now();
  const revision: Revision = unchanged
    ? previous
    : {
        id: crypto.randomUUID(),
        response: attempt.response,
        plan: attempt.plan,
        submittedAt: now,
        assisted: attempt.assisted || attempt.revisions.some((r) => r.feedback !== null),
        overTime:
          attempt.startedAt !== null && now - attempt.startedAt > attempt.exercise.minutes * 60000,
        feedback: null,
        error: 'Feedback is pending. Retry if it does not arrive.',
        rubricVersion: RUBRIC_VERSION,
      };
  const lease = crypto.randomUUID();
  const data = { ...attempt, revisions: [], version: row.version + 1, updatedAt: now };
  const statements = [
    env.DB.prepare(
      'UPDATE english_attempts SET data=?,version=version+1,lease=?,lease_until=? WHERE id=? AND owner_id=? AND version=? AND lease_until<=?',
    ).bind(JSON.stringify(data), lease, now + 45000, attempt.id, owner, row.version, now),
  ];
  if (!unchanged)
    statements.push(
      env.DB.prepare(
        'INSERT INTO english_revisions(id,attempt_id,data,submitted_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM english_attempts WHERE id=? AND owner_id=? AND lease=?)',
      ).bind(revision.id, attempt.id, JSON.stringify(revision), now, attempt.id, owner, lease),
    );
  const results = await env.DB.batch(statements);
  if (!results[0].meta.changes) conflict();
  const parent = attempt.parentId ? (await load(env, owner, attempt.parentId)).attempt : null;
  const prior =
    [...attempt.revisions].reverse().find((r) => r.id !== revision.id && r.feedback !== null) ??
    (parent?.exercise.id === attempt.exercise.id &&
    parent.exercise.version === attempt.exercise.version
      ? parent
      : null
    )?.revisions
      .slice()
      .reverse()
      .find((r) => r.feedback !== null);
  let feedback: Feedback | null = null;
  try {
    feedback = await englishAI(
      env,
      owner,
      feedbackPrompt,
      {
        kind: 'english-feedback',
        exercise: practiceExercise(attempt.exercise),
        response: revision.response,
        plan: revision.plan,
        previous: prior ?? null,
      },
      (value): value is Feedback =>
        validFeedback(value, practiceExercise(attempt.exercise), revision),
    );
    revision.feedback = feedback;
    revision.rubricVersion = RUBRIC_VERSION;
    revision.error = null;
  } catch (error) {
    revision.error =
      error instanceof ApiError
        ? error.message
        : 'Feedback could not be saved. Retry this response.';
  }
  const writes = [
    env.DB.prepare(
      'UPDATE english_revisions SET data=? WHERE id=? AND attempt_id=? AND EXISTS (SELECT 1 FROM english_attempts WHERE id=? AND owner_id=? AND lease=?)',
    ).bind(JSON.stringify(revision), revision.id, attempt.id, attempt.id, owner, lease),
  ];
  if (feedback?.substantive && feedback.ratings.some((r) => r.rating !== 'Not assessed')) {
    const award = (kind: Award['kind'], points: number) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO english_awards(id,owner_id,exercise_id,exercise_version,attempt_id,kind,points,earned_at)
      SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM english_attempts WHERE id=? AND owner_id=? AND lease=?)`,
      ).bind(
        crypto.randomUUID(),
        owner,
        attempt.exercise.id,
        attempt.exercise.version,
        attempt.id,
        kind,
        points,
        now,
        attempt.id,
        owner,
        lease,
      );
    writes.push(award('completion', 10));
    if (
      prior &&
      !sameResponse(prior.response, revision.response) &&
      feedback.improvement.meaningful &&
      feedback.ratings.some(
        (r) =>
          r.rating !== 'Not assessed' &&
          r.evidence &&
          !responseText(prior.response).includes(r.evidence),
      )
    )
      writes.push(award('revision', 5));
  }
  writes.push(
    env.DB.prepare(
      "UPDATE english_attempts SET data=json_set(data,'$.assisted',json(?)),lease=NULL,lease_until=0 WHERE id=? AND owner_id=? AND lease=?",
    ).bind(JSON.stringify(attempt.assisted || feedback !== null), attempt.id, owner, lease),
  );
  await env.DB.batch(writes);
  return Response.json({ attempt: (await load(env, owner, attempt.id)).attempt });
}

export async function english(request: Request, env: Env, owner: string) {
  const url = new URL(request.url);
  const path = url.pathname.slice('/api/english'.length);
  const method = request.method;
  if (path === '/profile') {
    if (method === 'PUT') {
      const b = await body(request);
      if (!isGrade(b.grade)) fail(400, 'INVALID_GRADE', 'Choose Grade 8, 9 or 10.');
      await env.DB.prepare(
        'INSERT INTO english_profiles(owner_id,grade) VALUES(?,?) ON CONFLICT(owner_id) DO UPDATE SET grade=excluded.grade',
      )
        .bind(owner, b.grade)
        .run();
    } else if (method !== 'GET') fail(405, 'METHOD_NOT_ALLOWED', 'Use GET or PUT.');
    const profile = await env.DB.prepare('SELECT grade FROM english_profiles WHERE owner_id=?')
      .bind(owner)
      .first<{ grade: number }>();
    return Response.json({ grade: profile?.grade ?? null });
  }
  if (path === '/exercises' && method === 'GET') {
    const before = cursor(url);
    const rows = await env.DB.prepare(
      'SELECT id,data,created_at FROM english_exercises WHERE owner_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 101',
    )
      .bind(owner, before.time, before.time, before.id)
      .all<{ id: string; data: string; created_at: number }>();
    const page = rows.results.slice(0, 100);
    const last = page.at(-1);
    return Response.json({
      exercises: page.map((r) => JSON.parse(r.data)),
      nextBefore: rows.results.length > 100 ? `${last!.created_at}:${last!.id}` : null,
    });
  }
  if (path === '/exercises' && method === 'POST') {
    const b = await body(request);
    if (
      !isGrade(b.grade) ||
      !tools.some((t) => t.id === b.tool && t.id !== 'editing') ||
      (b.skill !== undefined && !Object.hasOwn(skillNames, b.skill as string))
    )
      fail(400, 'INVALID_EXERCISE', 'Choose a grade, tool and skill.');
    const grade = b.grade;
    const tool = b.tool as string;
    const skill = b.skill as Skill | undefined;
    const recent = await env.DB.prepare(
      'SELECT data FROM english_exercises WHERE owner_id=? ORDER BY created_at DESC LIMIT 5',
    )
      .bind(owner)
      .all<{ data: string }>();
    const generated = await englishAI(
      env,
      owner,
      exercisePrompt,
      {
        kind: 'english-exercise',
        grade,
        tool,
        skill,
        recentGenres: recent.results.map((r) => (JSON.parse(r.data) as Exercise).genre),
      },
      (value): value is Exercise => validExercise(value, grade, tool, skill),
    );
    const exercise: Exercise = {
      ...practiceExercise(generated),
      id: crypto.randomUUID(),
      version: 1,
      source: 'generated',
    };
    await env.DB.prepare(
      'INSERT INTO english_exercises(id,owner_id,data,created_at) VALUES(?,?,?,?)',
    )
      .bind(exercise.id, owner, JSON.stringify(exercise), Date.now())
      .run();
    return Response.json({ exercise });
  }
  if (path === '/attempts' && method === 'GET') {
    const before = cursor(url);
    const rows = await env.DB.prepare(
      'SELECT id,created_at FROM english_attempts WHERE owner_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 11',
    )
      .bind(owner, before.time, before.time, before.id)
      .all<{ id: string; created_at: number }>();
    const page = rows.results.slice(0, 10);
    const last = page.at(-1);
    const attempts = await Promise.all(
      page.map(async (r) => (await load(env, owner, r.id)).attempt),
    );
    const awards = page.length
      ? (
          await env.DB.prepare(
            `SELECT id,exercise_id AS exerciseId,exercise_version AS exerciseVersion,attempt_id AS attemptId,kind,points,earned_at AS earnedAt FROM english_awards WHERE owner_id=? AND attempt_id IN (${page.map(() => '?').join(',')})`,
          )
            .bind(owner, ...page.map((r) => r.id))
            .all<Award>()
        ).results
      : [];
    return Response.json({
      attempts,
      awards,
      nextBefore: rows.results.length > 10 ? `${last!.created_at}:${last!.id}` : null,
    });
  }
  if (path === '/attempts' && method === 'POST') {
    const b = await body(request);
    const id = str(b.exerciseId, 'exercise', 120);
    if (b.mode !== 'practice' && b.mode !== 'independent')
      fail(400, 'INVALID_MODE', 'Choose practice or independent work.');
    let parent: Attempt | null = null;
    if (b.parentId != null)
      parent = (await load(env, owner, str(b.parentId, 'parent', 120))).attempt;
    const exercise =
      parent?.exercise.id === id ? parent.exercise : await exerciseFor(env, owner, id);
    const attempt = newAttempt(exercise, b.mode, parent?.id ?? null);
    if (parent?.exercise.id === id) {
      attempt.response = parent.response;
      attempt.plan = parent.plan;
      attempt.assisted = parent.assisted || parent.revisions.some((r) => r.feedback !== null);
    }
    await env.DB.prepare(
      'INSERT INTO english_attempts(id,owner_id,data,created_at) VALUES(?,?,?,?)',
    )
      .bind(attempt.id, owner, JSON.stringify(attempt), attempt.createdAt)
      .run();
    return Response.json({ attempt });
  }
  const match = /^\/attempts\/([a-zA-Z0-9-]+)(?:\/(submit|help))?$/.exec(path);
  if (!match) fail(404, 'NOT_FOUND', 'English route not found.');
  const { row, attempt } = await load(env, owner, match[1]);
  if (!match[2] && method === 'GET') return Response.json({ attempt });
  if ((!match[2] && method === 'PUT') || (match[2] && method === 'POST')) {
    const b = await body(request);
    check(row, b.expectedVersion);
    if (!match[2])
      return Response.json({
        attempt: await save(env, owner, draftInput(b, attempt), row.version),
      });
    if (match[2] === 'submit') return submit(env, owner, row, attempt);
    const assisted = await save(env, owner, { ...attempt, assisted: true }, row.version);
    try {
      const result = await englishAI(
        env,
        owner,
        'Give one task-specific teaching hint or separate short example, not the completed answer. Return JSON {hint:string}, maximum 1500 characters.',
        {
          kind: 'english-help',
          exercise: practiceExercise(attempt.exercise),
          response: attempt.response,
          plan: attempt.plan,
        },
        (v): v is { hint: string } =>
          !!v &&
          typeof v === 'object' &&
          'hint' in v &&
          typeof v.hint === 'string' &&
          !!v.hint.trim() &&
          v.hint.length <= 1500,
      );
      return Response.json({ attempt: assisted, hint: result.hint });
    } catch (error) {
      return Response.json({
        attempt: assisted,
        hint: '',
        error: error instanceof ApiError ? error.message : 'Help is unavailable. Try again.',
      });
    }
  }
  fail(405, 'METHOD_NOT_ALLOWED', 'Use an allowed method.');
}
