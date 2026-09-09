import type { Env } from './env';
import { ApiError, body, fail, integer, programInput } from './validation';
const fields =
  'id,title,description,problem_id AS problemId,draft,last_valid_source AS lastValidSource,workspace,format_version AS formatVersion,revision,updated_at AS updatedAt,deleted_at AS deletedAt';
const retention = 30 * 24 * 60 * 60 * 1000;
async function get(env: Env, owner: string, id: string, deleted = false) {
  const row = await env.DB.prepare(
    `SELECT ${fields} FROM programs WHERE id=? AND owner_id=? AND ${deleted ? 'deleted_at>?' : 'deleted_at IS NULL'}`,
  )
    .bind(...(deleted ? [id, owner, Date.now() - retention] : [id, owner]))
    .first();
  if (!row) fail(404, 'NOT_FOUND', 'Program not found.');
  if (row.formatVersion !== 1)
    fail(422, 'FORMAT_VERSION', 'This document format is not supported.');
  return row;
}
async function mutationConflict(env: Env, owner: string, id: string): Promise<never> {
  const latest = await env.DB.prepare(
    `SELECT ${fields} FROM programs WHERE id=? AND owner_id=? AND (deleted_at IS NULL OR deleted_at>?)`,
  )
    .bind(id, owner, Date.now() - retention)
    .first();
  if (!latest) fail(404, 'NOT_FOUND', 'Recoverable program not found.');
  throw new ApiError(409, 'REVISION_CONFLICT', 'The program changed. Reload before trying again.', {
    currentRevision: latest.revision,
    program: latest,
  });
}
export async function programs(
  request: Request,
  env: Env,
  owner: string,
  id?: string,
  restore = false,
) {
  const method = request.method;
  const url = new URL(request.url);
  if (!id && method === 'GET') {
    const deleted = url.searchParams.get('deleted') === 'true';
    const rows = await env.DB.prepare(
      `SELECT id,title,problem_id AS problemId,revision,updated_at AS updatedAt,deleted_at AS deletedAt FROM programs WHERE owner_id=? AND ${deleted ? 'deleted_at>?' : 'deleted_at IS NULL'} ORDER BY updated_at DESC,id`,
    )
      .bind(...(deleted ? [owner, Date.now() - retention] : [owner]))
      .all();
    return Response.json({ programs: rows.results });
  }
  if (!id && method === 'POST') {
    const p = programInput(await body(request));
    const newId = crypto.randomUUID();
    const row = await env.DB.prepare(
      `INSERT INTO programs(id,owner_id,title,description,problem_id,draft,last_valid_source,workspace,updated_at) VALUES(?,?,?,?,?,?,?,?,?) RETURNING ${fields}`,
    )
      .bind(
        newId,
        owner,
        p.title,
        p.description ?? '',
        p.problemId ?? null,
        p.draft,
        p.lastValidSource ?? null,
        p.workspace ?? null,
        Date.now(),
      )
      .first();
    return Response.json({ program: row }, { status: 201 });
  }
  if (!id) fail(405, 'METHOD_NOT_ALLOWED', 'Use a supported method.');
  if (!restore && method === 'GET') return Response.json({ program: await get(env, owner, id) });
  if (!restore && method === 'PUT') {
    const b = await body(request);
    const p = programInput(b);
    const revision = integer(
      b.expectedRevision,
      'expectedRevision',
      0,
      Number.MAX_SAFE_INTEGER - 1,
    );
    const current = await get(env, owner, id);
    const row = await env.DB.prepare(
      `UPDATE programs SET title=?,description=?,draft=?,problem_id=?,last_valid_source=?,workspace=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND deleted_at IS NULL AND revision=? AND format_version=1 RETURNING ${fields}`,
    )
      .bind(
        p.title,
        p.description === undefined ? current.description : p.description,
        p.draft,
        p.problemId === undefined ? current.problemId : p.problemId,
        p.lastValidSource === undefined ? current.lastValidSource : p.lastValidSource,
        p.workspace === undefined ? current.workspace : p.workspace,
        Date.now(),
        id,
        owner,
        revision,
      )
      .first();
    if (!row) {
      const latest = await get(env, owner, id);
      throw new ApiError(
        409,
        'REVISION_CONFLICT',
        'A newer version exists. Save a copy or reload.',
        { currentRevision: latest.revision, program: latest },
      );
    }
    return Response.json({ program: row });
  }
  if (!restore && method === 'DELETE') {
    const revision = integer(
      (await body(request)).expectedRevision,
      'expectedRevision',
      1,
      Number.MAX_SAFE_INTEGER - 1,
    );
    const result = await env.DB.prepare(
      'UPDATE programs SET deleted_at=?,updated_at=?,revision=revision+1 WHERE id=? AND owner_id=? AND deleted_at IS NULL AND revision=? AND format_version=1 RETURNING id',
    )
      .bind(Date.now(), Date.now(), id, owner, revision)
      .first();
    if (!result) await mutationConflict(env, owner, id);
    return new Response(null, { status: 204 });
  }
  if (restore && method === 'POST') {
    const revision = integer(
      (await body(request)).expectedRevision,
      'expectedRevision',
      1,
      Number.MAX_SAFE_INTEGER - 1,
    );
    const row = await env.DB.prepare(
      `UPDATE programs SET deleted_at=NULL,updated_at=?,revision=revision+1 WHERE id=? AND owner_id=? AND deleted_at>? AND revision=? AND format_version=1 RETURNING ${fields}`,
    )
      .bind(Date.now(), id, owner, Date.now() - retention, revision)
      .first();
    if (!row) await mutationConflict(env, owner, id);
    return Response.json({ program: row });
  }
  return fail(405, 'METHOD_NOT_ALLOWED', 'Use a supported method.');
}
export async function cleanup(env: Env) {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM programs WHERE deleted_at IS NOT NULL AND deleted_at<=?').bind(
      now - retention,
    ),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now),
    env.DB.prepare('DELETE FROM otp_challenges WHERE expires_at<=?').bind(now - 86400000),
    env.DB.prepare('DELETE FROM rate_limits WHERE window<=?').bind(now - 86400000),
  ]);
}
