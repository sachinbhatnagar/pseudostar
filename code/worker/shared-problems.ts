import type { Env } from './env';
import { ApiError, body, fail, str } from './validation';
import { limit } from './rate-limit';
import { parse } from '../src/language/parse';
import { publicationCandidate, validateCandidate } from './publication-validation';
import { generatePublication } from './publication-generation';
import type { Candidate } from '../src/problems/shared';
type User = { id: string; email: string };

export async function visibleCandidate(
  env: Env,
  id: string,
  _user: User | null,
): Promise<Candidate | null> {
  const row = await env.DB.prepare(
    'SELECT published FROM shared_problems WHERE id=? AND published IS NOT NULL',
  )
    .bind(id)
    .first<{ published: string }>();
  return row ? JSON.parse(row.published) : null;
}
export async function sharedList(env: Env, user: User | null, after = '') {
  const rows = (
    await env.DB.prepare(
      'SELECT id,owner,published FROM shared_problems WHERE published IS NOT NULL AND id>? ORDER BY id LIMIT 101',
    )
      .bind(after)
      .all<{ id: string; owner: string; published: string }>()
  ).results;
  return Response.json({
    problems: rows.slice(0, 100).map((r) => ({
      ...(JSON.parse(r.published) as Candidate).problem,
      canEdit: r.owner === user?.id,
    })),
    nextCursor: rows.length > 100 ? rows[99].id : null,
  });
}
async function owned(env: Env, id: string, user: User) {
  const row = await env.DB.prepare(
    'SELECT published,revision FROM shared_problems WHERE id=? AND owner=? AND published IS NOT NULL',
  )
    .bind(id, user.id)
    .first<{ published: string; revision: number }>();
  if (!row) fail(404, 'NOT_FOUND', 'Published problem not found.');
  return row;
}
export async function authorProblem(request: Request, env: Env, user: User, id: string) {
  if (request.method === 'PATCH') return publish(request, env, user, id);
  const row = await owned(env, id, user);
  if (request.method === 'GET') {
    const candidate = JSON.parse(row.published) as Candidate;
    return Response.json({
      statement: candidate.problem.statement,
      solution: candidate.solution,
      revision: row.revision,
    });
  }
  if (request.method !== 'DELETE') fail(405, 'METHOD_NOT_ALLOWED', 'Use GET, PATCH, or DELETE.');
  const b = await body(request);
  if (b.revision !== row.revision)
    fail(409, 'PUBLICATION_CHANGED', 'This problem changed. Open it again before deleting.');
  const deleted = await env.DB.prepare(
    "UPDATE shared_problems SET published=NULL,status='draft',revision=revision+1,source_key='deleted:' || id,updated_at=? WHERE id=? AND owner=? AND revision=? AND published IS NOT NULL RETURNING id",
  )
    .bind(Date.now(), id, user.id, row.revision)
    .first();
  if (!deleted)
    fail(409, 'PUBLICATION_CHANGED', 'This problem changed. Open it again before deleting.');
  return Response.json({ deleted: true });
}
export async function publish(request: Request, env: Env, user: User, editId?: string) {
  const previous = editId ? await owned(env, editId, user) : null;
  const b = await body(request);
  if (previous && b.revision !== previous.revision)
    fail(409, 'PUBLICATION_CHANGED', 'This problem changed. Open it again before editing.');
  const statement = str(b.statement, 'problem statement', 12000);
  const solution = str(b.solution, 'pseudocode', 20000);
  const parsed = parse(solution);
  if (!parsed.ok) fail(422, 'INVALID_PSEUDOCODE', parsed.diagnostics[0].message);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify([user.id, statement.trim(), solution.trim()])),
  );
  const key =
    'program:' +
    Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('');
  const existing = await env.DB.prepare('SELECT published FROM shared_problems WHERE source_key=?')
    .bind(key)
    .first<{ published: string }>();
  if (!editId && existing?.published)
    return Response.json({ problem: (JSON.parse(existing.published) as Candidate).problem });
  await limit(env, `publish:${user.id}`, 86400, 10);
  const id = editId ?? 'shared_' + crypto.randomUUID();
  const candidate = publicationCandidate(
    await generatePublication(env, statement, false, solution),
    solution,
    id,
    previous ? previous.revision + 1 : 1,
  );
  const independent = (await generatePublication(env, candidate.problem.statement, true)) as {
    solution?: unknown;
  };
  const reference = str(independent.solution, 'reference solution', 20000);
  if (!parse(reference).ok)
    fail(
      502,
      'INVALID_REFERENCE',
      'AI could not create valid check code. Your program has not failed. Try publishing again.',
    );
  const validation = validateCandidate(candidate, reference);
  if (!validation.passed)
    throw new ApiError(
      422,
      'CHECKS_FAILED',
      'The program did not pass the checks. Review the results and update your code or statement.',
      { checks: validation.checks.filter((c) => !c.passed) },
    );
  const record = JSON.stringify(candidate);
  if (previous) {
    const updated = await env.DB.prepare(
      'UPDATE shared_problems SET candidate=?,published=?,validation=?,reference=?,source=?,revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=? AND published IS NOT NULL RETURNING id',
    )
      .bind(
        record,
        record,
        JSON.stringify(validation),
        reference,
        JSON.stringify({ statement, solution }),
        Date.now(),
        id,
        user.id,
        previous.revision,
      )
      .first();
    if (!updated)
      fail(409, 'PUBLICATION_CHANGED', 'This problem changed while checks ran. Open it again.');
    return Response.json({ problem: candidate.problem });
  }
  const row = await env.DB.prepare(
    "INSERT INTO shared_problems(id,source_key,owner,source,status,candidate,validation,published,reference,updated_at) VALUES(?,?,?,?,'published',?,?,?,?,?) ON CONFLICT(source_key) DO NOTHING RETURNING published",
  )
    .bind(
      id,
      key,
      user.id,
      JSON.stringify({ statement, solution }),
      record,
      JSON.stringify(validation),
      record,
      reference,
      Date.now(),
    )
    .first<{ published: string }>();
  const saved =
    row ??
    (await env.DB.prepare('SELECT published FROM shared_problems WHERE source_key=?')
      .bind(key)
      .first<{ published: string }>());
  if (!saved?.published) fail(409, 'PUBLISH_CONFLICT', 'Publication changed. Try again.');
  return Response.json(
    { problem: (JSON.parse(saved.published) as Candidate).problem },
    { status: row ? 201 : 200 },
  );
}
