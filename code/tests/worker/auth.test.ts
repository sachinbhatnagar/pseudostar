import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { harness } from './harness';
import { hmac } from '../../worker/crypto';
let h: Awaited<ReturnType<typeof harness>>;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
describe('real Worker OTP with D1 and intercepted Resend transport', () => {
  it('normalizes email, sends rendered bodies, creates a secure session and revokes it', async () => {
    const user = await h.login('Learner@Example.com');
    expect(user.user.email).toBe('learner@example.com');
    expect(h.messages[0].html).toContain('<!DOCTYPE');
    const result = await h.request('/api/session', 'GET', undefined, user.cookie);
    expect(await result.json()).toEqual({ user: user.user });
    const logout = await h.request('/api/auth/logout', 'POST', undefined, user.cookie);
    expect(logout.status).toBe(204);
    expect(logout.headers.get('set-cookie')).toContain('Secure');
    expect(await (await h.request('/api/session', 'GET', undefined, user.cookie)).json()).toEqual({
      user: null,
    });
  });
  it('accepts a leading zero exactly once under concurrent verification', async () => {
    const c = await h.challenge();
    await h.db
      .prepare('UPDATE otp_challenges SET digest=? WHERE id=?')
      .bind(
        await hmac('test-only-secret-with-more-than-32-characters', `otp:${c.challengeId}:004219`),
        c.challengeId,
      )
      .run();
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        h.request('/api/auth/verify', 'POST', { challengeId: c.challengeId, code: '004219' }),
      ),
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(
      (await h.request('/api/auth/verify', 'POST', { challengeId: c.challengeId, code: '004219' }))
        .status,
    ).toBe(400);
    expect(await h.db.prepare('SELECT COUNT(*) AS count FROM sessions').first('count')).toBe(1);
  });
  it('locks after five wrong codes and rejects expiry', async () => {
    const c = await h.challenge();
    const wrong = c.code === '000000' ? '000001' : '000000';
    for (let i = 0; i < 5; i++)
      expect((await h.request('/api/auth/verify', 'POST', { ...c, code: wrong })).status).toBe(400);
    expect((await h.request('/api/auth/verify', 'POST', c)).status).toBe(400);
    const expired = await h.challenge('second@example.com');
    await h.db
      .prepare('UPDATE otp_challenges SET expires_at=0 WHERE id=?')
      .bind(expired.challengeId)
      .run();
    expect((await h.request('/api/auth/verify', 'POST', expired)).status).toBe(400);
    expect(await h.db.prepare('SELECT COUNT(*) AS count FROM users').first('count')).toBe(0);
  });
  it('enforces cooldown atomically and preserves a code when delivery fails', async () => {
    const c = await h.challenge();
    expect(
      (await h.request('/api/auth/request-code', 'POST', { email: 'learner@example.com' })).status,
    ).toBe(429);
    await h.db.prepare('UPDATE rate_limits SET window=window-61000').run();
    h.rejectMail(true);
    expect(
      (await h.request('/api/auth/request-code', 'POST', { email: 'learner@example.com' })).status,
    ).toBe(503);
    expect((await h.request('/api/auth/verify', 'POST', c)).status).toBe(200);
  });
  it('invalidates an older code only after a successful resend', async () => {
    const first = await h.challenge();
    await h.db.prepare('UPDATE rate_limits SET window=window-61000').run();
    const second = await h.challenge();
    expect((await h.request('/api/auth/verify', 'POST', first)).status).toBe(400);
    expect((await h.request('/api/auth/verify', 'POST', second)).status).toBe(200);
  });
  it('rejects foreign origins, oversized bodies and unauthenticated API access', async () => {
    expect(
      (
        await h.request(
          '/api/auth/request-code',
          'POST',
          { email: 'a@example.com' },
          undefined,
          'https://evil.test',
        )
      ).status,
    ).toBe(403);
    expect(
      (await h.request('/api/auth/request-code', 'POST', { email: 'a'.repeat(1500001) })).status,
    ).toBe(413);
    expect((await h.request('/api')).status).toBe(404);
    const response = await h.request('/api/programs');
    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
it('allows one concurrent request during cooldown', async () => {
  const results = await Promise.all(
    Array.from({ length: 4 }, () =>
      h.request('/api/auth/request-code', 'POST', { email: 'parallel@example.com' }),
    ),
  );
  expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  expect(h.messages).toHaveLength(1);
});
it('limits each email to five sends per hour', async () => {
  for (let i = 0; i < 5; i++) {
    expect(
      (await h.request('/api/auth/request-code', 'POST', { email: 'limited@example.com' })).status,
    ).toBe(200);
    await h.db.prepare('UPDATE rate_limits SET window=window-61000').run();
  }
  expect(
    (await h.request('/api/auth/request-code', 'POST', { email: 'limited@example.com' })).status,
  ).toBe(429);
  expect(h.messages).toHaveLength(5);
});
it('limits an IP to twenty sends per hour', async () => {
  for (let i = 0; i < 20; i++)
    expect(
      (await h.request('/api/auth/request-code', 'POST', { email: `learner${i}@example.com` }))
        .status,
    ).toBe(200);
  expect(
    (await h.request('/api/auth/request-code', 'POST', { email: 'other@example.com' })).status,
  ).toBe(429);
});
it('rejects expired sessions and omits secrets from database records', async () => {
  const account = await h.login();
  const record = (await h.db.prepare('SELECT * FROM sessions').first()) as any;
  expect(record.token_hash).not.toBe(account.cookie.split('=')[1]);
  const challenge = (await h.db.prepare('SELECT * FROM otp_challenges').first()) as any;
  expect(challenge.digest).toMatch(/^[a-f0-9]{64}$/);
  await h.db.prepare('UPDATE sessions SET expires_at=0').run();
  expect(await (await h.request('/api/session', 'GET', undefined, account.cookie)).json()).toEqual({
    user: null,
  });
});

it('defaults the display name to email and lets only the signed-in user change it', async () => {
  const h = await harness();
  try {
    const a = await h.login('named@example.com');
    const b = await h.login('other-name@example.com');
    const current = async (cookie: string) =>
      ((await (await h.request('/api/session', 'GET', undefined, cookie)).json()) as any).user;
    expect((await current(a.cookie)).name).toBe('named@example.com');
    expect((await h.request('/api/profile', 'PATCH', { name: 'No session' })).status).toBe(401);
    for (const name of ['', '   ', 'x'.repeat(101)])
      expect((await h.request('/api/profile', 'PATCH', { name }, a.cookie)).status).toBe(400);
    const response = await h.request(
      '/api/profile',
      'PATCH',
      { name: '  Sachin  ', id: 'another-user' },
      a.cookie,
    );
    expect(response.status).toBe(200);
    expect((await current(a.cookie)).name).toBe('Sachin');
    expect((await current(a.cookie)).email).toBe('named@example.com');
    expect((await current(b.cookie)).name).toBe('other-name@example.com');
  } finally {
    await h.close();
  }
});
