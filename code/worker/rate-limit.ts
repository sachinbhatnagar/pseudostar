import type { Env } from './env';
import { hmac } from './crypto';
import { fail } from './validation';
export async function limit(env: Env, key: string, seconds: number, max: number, now = Date.now()) {
  const identity = await hmac(env.OTP_HMAC_SECRET, `rate:${key}`);
  const result = await env.DB.prepare(
    `INSERT INTO rate_limits(identity,window,count) VALUES(?,?,1)
    ON CONFLICT(identity) DO UPDATE SET window=CASE WHEN window<=? THEN excluded.window ELSE window END,
    count=CASE WHEN window<=? THEN 1 ELSE count+1 END WHERE window<=? OR count<? RETURNING count`,
  )
    .bind(identity, now, now - seconds * 1000, now - seconds * 1000, now - seconds * 1000, max)
    .first();
  if (!result) fail(429, 'RATE_LIMITED', 'Wait before trying again.');
}
