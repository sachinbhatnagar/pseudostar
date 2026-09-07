import type { Env } from './env';
import { body, fail, integer, str } from './validation';
const fields =
  'problem_id AS problemId,content_version AS contentVersion,status,highest_hint_viewed AS highestHintViewed,last_checked_at AS lastCheckedAt';
export async function progress(request: Request, env: Env, owner: string, id?: string) {
  if (!id && request.method === 'GET')
    return Response.json({
      progress: (
        await env.DB.prepare(`SELECT ${fields} FROM progress WHERE user_id=? ORDER BY problem_id`)
          .bind(owner)
          .all()
      ).results,
    });
  if (id && request.method === 'PUT') {
    str(id, 'problemId', 120);
    const b = await body(request);
    const version = integer(b.contentVersion, 'contentVersion', 1, 2147483647);
    const hint = integer(b.highestHintViewed ?? 0, 'highestHintViewed', 0, 3);
    if (b.status !== 'started' && b.status !== 'passed')
      fail(400, 'INVALID_FIELD', 'Check status.');
    // Progress records learner-reported checks. It is not a server certification.
    const row = await env.DB.prepare(
      `INSERT INTO progress(user_id,problem_id,content_version,status,highest_hint_viewed,last_checked_at) VALUES(?,?,?,?,?,?)
      ON CONFLICT(user_id,problem_id) DO UPDATE SET content_version=excluded.content_version,
      status=CASE WHEN progress.content_version=excluded.content_version AND progress.status='passed' THEN 'passed' ELSE excluded.status END,
      highest_hint_viewed=CASE WHEN progress.content_version=excluded.content_version THEN MAX(progress.highest_hint_viewed,excluded.highest_hint_viewed) ELSE excluded.highest_hint_viewed END,
      last_checked_at=excluded.last_checked_at WHERE excluded.content_version>=progress.content_version RETURNING ${fields}`,
    )
      .bind(owner, id, version, b.status, hint, Date.now())
      .first();
    if (!row) fail(409, 'CONTENT_VERSION_CONFLICT', 'Reload the current problem version.');
    return Response.json({ progress: row });
  }
  return fail(405, 'METHOD_NOT_ALLOWED', 'Use a supported method.');
}
