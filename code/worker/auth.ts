import type { Env } from './env';
import { code, hash, hmac, token } from './crypto';
import { body, fail, str } from './validation';
import { limit } from './rate-limit';
import { sendCode } from './resend';
import { cookie, SESSION_AGE } from './sessions';
function ip(request: Request) {
  return request.headers.get('CF-Connecting-IP') ?? 'local';
}
export async function requestCode(request: Request, env: Env) {
  const b = await body(request);
  const email = str(b.email, 'email', 254).trim().toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
    fail(400, 'INVALID_EMAIL', 'Enter an email address.');
  await limit(env, `send-ip:${ip(request)}`, 3600, 20);
  await limit(env, `cooldown:${email}`, 60, 1);
  await limit(env, `send-email:${email}`, 3600, 5);
  const challengeId = crypto.randomUUID();
  const value = code();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO otp_challenges(id,email,digest,created_at,expires_at,send_status) VALUES(?,?,?,?,?,'pending')",
  )
    .bind(
      challengeId,
      email,
      await hmac(env.OTP_HMAC_SECRET, `otp:${challengeId}:${value}`),
      now,
      now + 600000,
    )
    .run();
  try {
    await sendCode(env, email, value, challengeId);
  } catch {
    await env.DB.prepare("UPDATE otp_challenges SET send_status='failed' WHERE id=?")
      .bind(challengeId)
      .run();
    fail(503, 'SEND_FAILED', 'The email could not be sent. Try again later.');
  }
  // An older, slower delivery must not invalidate a newer accepted challenge.
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE otp_challenges SET consumed_at=? WHERE email=? AND id<>? AND created_at<=? AND consumed_at IS NULL AND send_status='sent'",
    ).bind(Date.now(), email, challengeId, now),
    env.DB.prepare(
      "UPDATE otp_challenges SET send_status='sent', consumed_at=CASE WHEN EXISTS(SELECT 1 FROM otp_challenges WHERE email=? AND created_at>? AND send_status='sent') THEN ? ELSE consumed_at END WHERE id=?",
    ).bind(email, now, Date.now(), challengeId),
  ]);
  return Response.json({ challengeId });
}
export async function verify(request: Request, env: Env) {
  const b = await body(request);
  const id = str(b.challengeId, 'challengeId', 100);
  const value = str(b.code, 'code', 6);
  if (!/^\d{6}$/.test(value)) fail(400, 'INVALID_CODE', 'Enter the six-digit code.');
  await limit(env, `verify-ip:${ip(request)}`, 3600, 100);
  await limit(env, `verify-challenge:${id}`, 600, 20);
  const digest = await hmac(env.OTP_HMAC_SECRET, `otp:${id}:${value}`);
  const now = Date.now();
  const claim = token();
  const sessionToken = token();
  const userId = crypto.randomUUID();
  // The claim ties all later batch statements to the one successful conditional update.
  const results = await env.DB.batch([
    env.DB.prepare(
      "UPDATE otp_challenges SET attempts=attempts+CASE WHEN digest=? THEN 0 ELSE 1 END, consumed_at=CASE WHEN digest=? THEN ? ELSE NULL END, claim=CASE WHEN digest=? THEN ? ELSE NULL END WHERE id=? AND send_status='sent' AND consumed_at IS NULL AND expires_at>? AND attempts<5 RETURNING claim",
    ).bind(digest, digest, now, digest, claim, id, now),
    env.DB.prepare(
      'INSERT INTO users(id,email,created_at) SELECT ?,email,? FROM otp_challenges WHERE id=? AND claim=? ON CONFLICT(email) DO NOTHING',
    ).bind(userId, now, id, claim),
    env.DB.prepare(
      'INSERT INTO sessions(token_hash,user_id,created_at,expires_at) SELECT ?,u.id,?,? FROM users u JOIN otp_challenges c ON c.email=u.email WHERE c.id=? AND c.claim=?',
    ).bind(await hash(sessionToken), now, now + SESSION_AGE * 1000, id, claim),
    env.DB.prepare(
      'SELECT u.id,u.email FROM users u JOIN otp_challenges c ON c.email=u.email WHERE c.id=? AND c.claim=?',
    ).bind(id, claim),
  ]);
  const user = results[3].results[0];
  if (!user)
    fail(400, 'CODE_REJECTED', 'This code is wrong, expired, or already used. Request a new code.');
  return Response.json({ user }, { headers: { 'Set-Cookie': cookie(env, sessionToken) } });
}
