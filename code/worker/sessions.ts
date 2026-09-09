import type { Env } from './env';
import { hash } from './crypto';
export const SESSION_AGE = 30 * 24 * 60 * 60;
export function cookieName(env: Env) {
  return new URL(env.APP_ORIGIN).protocol === 'https:' ? '__Host-pseudostar' : 'pseudostar';
}
export function cookie(env: Env, value: string, clear = false) {
  return `${cookieName(env)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_AGE}${new URL(env.APP_ORIGIN).protocol === 'https:' ? '; Secure' : ''}`;
}
export function readToken(request: Request, env: Env) {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${cookieName(env)}=`))
    ?.split('=')[1];
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export async function session(request: Request, env: Env) {
  const value = readToken(request, env);
  if (!value) return null;
  return env.DB.prepare(
    'SELECT u.id,u.email,COALESCE(u.name,u.email) AS name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',
  )
    .bind(await hash(value), Date.now())
    .first<{ id: string; email: string; name: string }>();
}
export async function logout(request: Request, env: Env) {
  const value = readToken(request, env);
  if (value)
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?')
      .bind(await hash(value))
      .run();
  return new Response(null, { status: 204, headers: { 'Set-Cookie': cookie(env, '', true) } });
}
