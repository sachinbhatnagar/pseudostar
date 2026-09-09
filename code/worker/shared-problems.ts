import type { Env } from './env';
import { body, fail, integer, str, ApiError } from './validation';
import { limit } from './rate-limit';
import { canonicalUrl, sourceInput, candidateInput, validateCandidate } from './import-validation';
import { generateImport } from './import-generation';
import type { Candidate, ImportItem, ImportSource, Validation } from '../src/problems/shared';
export const isAdmin = (user: { email: string } | null) =>
  user?.email.toLowerCase() === 'mailme@sachinbhatnagar.com';
type User = { id: string; email: string };
type Row = {
  id: string;
  owner: string;
  source: string;
  revision: number;
  status: ImportItem['status'];
  candidate: string | null;
  validation: string | null;
  published: string | null;
  reference: string | null;
  error: string | null;
  updated_at: number;
  lease_until: number | null;
};
const decode = <T>(v: string | null): T | null => (v ? (JSON.parse(v) as T) : null);
function item(r: Row): ImportItem {
  const expired = r.status === 'generating' && (r.lease_until ?? 0) < Date.now();
  return {
    id: r.id,
    owner: r.owner,
    source: JSON.parse(r.source),
    revision: r.revision,
    status: expired ? 'failed' : r.status,
    candidate: decode(r.candidate),
    validation: decode(r.validation),
    error: expired ? 'Generation stopped. You can retry.' : r.error,
    published: !!r.published,
    updatedAt: r.updated_at,
  };
}
export async function visibleCandidate(
  env: Env,
  id: string,
  user: User | null,
): Promise<Candidate | null> {
  const r = await env.DB.prepare('SELECT * FROM shared_problems WHERE id=?').bind(id).first<Row>();
  if (!r) return null;
  if (
    user &&
    (r.owner === user.id || isAdmin(user)) &&
    r.status === 'review' &&
    decode<Validation>(r.validation)?.passed
  )
    return decode<Candidate>(r.candidate);
  return decode<Candidate>(r.published);
}
export async function sharedList(env: Env, user: User | null, after = '') {
  const rows = (
    await env.DB.prepare(
      'SELECT * FROM shared_problems WHERE (published IS NOT NULL OR owner=? OR ?=1) AND id>? ORDER BY id LIMIT 101',
    )
      .bind(user?.id ?? '', isAdmin(user) ? 1 : 0, after)
      .all<Row>()
  ).results;
  const problems = rows.slice(0, 100).flatMap((r) => {
    const own = !!user && (r.owner === user.id || isAdmin(user));
    const draft = own && r.status === 'review' && decode<Validation>(r.validation)?.passed;
    const c = decode<Candidate>(draft ? r.candidate : r.published);
    return c ? [{ ...c.problem, ...(draft ? { reviewLabel: 'Not reviewed' } : {}) }] : [];
  });
  return Response.json({ problems, nextCursor: rows.length > 100 ? rows[99].id : null });
}
export async function imports(
  request: Request,
  env: Env,
  user: User,
  id?: string,
  action?: string,
) {
  const admin = isAdmin(user);
  if (!id && request.method === 'GET') {
    const rows = (
      await env.DB.prepare(
        'SELECT * FROM shared_problems WHERE owner=? OR ?=1 ORDER BY updated_at DESC LIMIT 200',
      )
        .bind(user.id, admin ? 1 : 0)
        .all<Row>()
    ).results;
    return Response.json({ imports: rows.map(item), admin });
  }
  if (!id && request.method === 'POST') {
    const b = await body(request),
      url = canonicalUrl(b.url);
    const existing = await env.DB.prepare('SELECT * FROM shared_problems WHERE source_key=?')
      .bind(url)
      .first<Row>();
    if (existing) return duplicate(existing, user);
    const source = sourceInput(b);
    await limit(env, `import:${user.id}`, 86400, 20);
    const key = 'lc_' + crypto.randomUUID();
    const r = await env.DB.prepare(
      'INSERT INTO shared_problems(id,source_key,owner,source,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(source_key) DO NOTHING RETURNING *',
    )
      .bind(key, url, user.id, JSON.stringify(source), Date.now())
      .first<Row>();
    if (!r)
      return duplicate(
        (await env.DB.prepare('SELECT * FROM shared_problems WHERE source_key=?')
          .bind(url)
          .first<Row>())!,
        user,
      );
    return Response.json({ item: item(r) }, { status: 201 });
  }
  if (!id) fail(405, 'METHOD_NOT_ALLOWED', 'Use a supported method.');
  const row = await env.DB.prepare('SELECT * FROM shared_problems WHERE id=?')
    .bind(id)
    .first<Row>();
  if (!row || (!admin && row.owner !== user.id)) fail(404, 'NOT_FOUND', 'Draft not found.');
  const r = row!;
  if (request.method === 'GET' && !action) return Response.json({ item: item(r) });
  const b = await body(request),
    revision = integer(b.revision, 'revision', 1, 2147483647);
  if (revision !== r.revision)
    fail(409, 'REVISION_CONFLICT', 'This draft changed. Reload before continuing.');
  if (r.status === 'generating' && (r.lease_until ?? 0) > Date.now())
    fail(409, 'GENERATION_ACTIVE', 'Generation is still running. Wait for it to finish.');
  if (request.method === 'PUT' && !action) {
    const source = sourceInput((b.source as Record<string, unknown>) ?? {});
    if (source.url !== JSON.parse(r.source).url)
      fail(400, 'SOURCE_LOCKED', 'The source link cannot change. Create a separate import.');
    const reference = JSON.stringify(source) === r.source ? r.reference : null;
    const candidate = b.candidate ? candidateInput(b.candidate, source, id!, revision + 1) : null;
    const validation = candidate ? validateCandidate(candidate, reference) : null;
    const updated = await env.DB.prepare(
      'UPDATE shared_problems SET source=?,candidate=?,validation=?,reference=?,status=?,revision=revision+1,error=NULL,attempt=NULL,updated_at=? WHERE id=? AND revision=? RETURNING *',
    )
      .bind(
        JSON.stringify(source),
        candidate ? JSON.stringify(candidate) : null,
        validation ? JSON.stringify(validation) : null,
        reference,
        validation?.passed ? 'review' : 'draft',
        Date.now(),
        id,
        revision,
      )
      .first<Row>();
    if (!updated) fail(409, 'REVISION_CONFLICT', 'This draft changed. Reload before continuing.');
    return Response.json({ item: item(updated!) });
  }
  if (request.method === 'POST' && action === 'generate') {
    if (!env.GROQ_API_KEY) fail(503, 'AI_UNAVAILABLE', 'Solution generation is not configured.');
    await limit(env, `generate:${user.id}`, 86400, 10);
    const attempt = crypto.randomUUID();
    const claimed = await env.DB.prepare(
      "UPDATE shared_problems SET status='generating',attempt=?,lease_until=?,error=NULL,updated_at=? WHERE id=? AND revision=? AND (status<>'generating' OR lease_until<?) RETURNING id",
    )
      .bind(attempt, Date.now() + 150000, Date.now(), id, revision, Date.now())
      .first();
    if (!claimed)
      fail(409, 'GENERATION_ACTIVE', 'This draft changed or is already generating. Reload.');
    try {
      const source = JSON.parse(r.source) as ImportSource;
      const candidate = candidateInput(
        await generateImport(env, source),
        source,
        id!,
        revision + 1,
      );
      const independent = (await generateImport(env, source, true)) as { solution?: unknown };
      const reference = str(independent?.solution, 'reference solution', 20000);
      const validation = validateCandidate(candidate, reference);
      const updated = await env.DB.prepare(
        'UPDATE shared_problems SET candidate=?,reference=?,validation=?,status=?,revision=revision+1,attempt=NULL,lease_until=NULL,error=?,updated_at=? WHERE id=? AND revision=? AND attempt=? RETURNING *',
      )
        .bind(
          JSON.stringify(candidate),
          reference,
          JSON.stringify(validation),
          validation.passed ? 'review' : 'failed',
          validation.passed ? null : 'Some checks failed. Review the results or generate again.',
          Date.now(),
          id,
          revision,
          attempt,
        )
        .first<Row>();
      if (!updated)
        fail(409, 'REVISION_CONFLICT', 'A newer attempt replaced this result. Reload the draft.');
      return Response.json({ item: item(updated!) });
    } catch (e) {
      const error = e instanceof ApiError ? e.message : 'Generation stopped. Retry later.';
      await env.DB.prepare(
        "UPDATE shared_problems SET status='failed',error=?,attempt=NULL,lease_until=NULL,updated_at=? WHERE id=? AND revision=? AND attempt=?",
      )
        .bind(error, Date.now(), id, revision, attempt)
        .run();
      throw e instanceof ApiError ? e : new ApiError(503, 'GENERATION_FAILED', error);
    }
  }
  if (request.method === 'POST' && action === 'review') {
    if (!admin) fail(403, 'ADMIN_REQUIRED', 'Only an admin can review a problem.');
    if (b.action !== 'approve' && b.action !== 'reject')
      fail(400, 'INVALID_ACTION', 'Choose approve or reject.');
    const reason = str(b.reason ?? '', 'review reason', 2000, b.action === 'approve');
    if (
      b.action === 'approve' &&
      (r.status !== 'review' || !decode<Validation>(r.validation)?.passed || !r.candidate)
    )
      fail(409, 'CHECKS_REQUIRED', 'The current revision must pass its checks before approval.');
    const logId = crypto.randomUUID();
    // The log insert depends on the same revision and status as publication in one transaction.
    const result = await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO problem_reviews(id,problem_id,reviewer,revision,action,reason,created_at) SELECT ?,id,?,revision,?,?,? FROM shared_problems WHERE id=? AND revision=? AND status=?',
      ).bind(logId, user.id, b.action, reason, Date.now(), id, revision, r.status),
      env.DB.prepare(
        'UPDATE shared_problems SET published=CASE WHEN ?=1 THEN candidate ELSE published END,status=?,error=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM problem_reviews WHERE id=?) RETURNING *',
      ).bind(
        b.action === 'approve' ? 1 : 0,
        b.action === 'approve' ? 'published' : 'rejected',
        reason || null,
        Date.now(),
        id,
        revision,
        logId,
      ),
    ]);
    const updated = result[1].results[0] as unknown as Row | undefined;
    if (!updated) fail(409, 'REVISION_CONFLICT', 'This draft changed. Reload before reviewing.');
    return Response.json({ item: item(updated!) });
  }
  return fail(405, 'METHOD_NOT_ALLOWED', 'Use a supported method.');
}
function duplicate(r: Row, user: User) {
  const own = r.owner === user.id || isAdmin(user);
  return Response.json({
    duplicate: true,
    ...(own ? { item: item(r) } : {}),
    ...(r.published ? { problem: decode<Candidate>(r.published)!.problem } : {}),
    message: r.published
      ? 'This problem is already in the shared library.'
      : 'This problem already has a draft. It has not been published yet.',
  });
}
