import { afterEach, beforeEach, expect, it } from 'vitest';
import { harness, origin } from './harness';
let h: Awaited<ReturnType<typeof harness>>;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
function scoped(path: string, method: string, user: string, data?: unknown, cookie?: string) {
  return h.mf.dispatchFetch(origin + path, {
    method,
    headers: {
      origin,
      'content-type': 'application/json',
      'X-Pseudostar-User': user,
      ...(cookie ? { cookie } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
it('rejects A header with B session before reads, writes, progress, and logout', async () => {
  const a = await h.login('a@example.com'),
    b = await h.login('b@example.com');
  const { program } = (await (
    await h.request('/api/programs', 'POST', { title: 'B private', draft: 'OUTPUT 2' }, b.cookie)
  ).json()) as { program: { id: string; revision: number } };
  const requests: [string, string, unknown?][] = [
    ['/api/programs', 'GET'],
    [`/api/programs/${program.id}`, 'GET'],
    ['/api/programs', 'POST', { title: 'A draft', draft: 'OUTPUT 1' }],
    [
      `/api/programs/${program.id}`,
      'PUT',
      { expectedRevision: program.revision, title: 'Changed', draft: 'OUTPUT 3' },
    ],
    [`/api/programs/${program.id}`, 'DELETE', { expectedRevision: program.revision }],
    [`/api/programs/${program.id}/restore`, 'POST', { expectedRevision: program.revision }],
    ['/api/progress', 'GET'],
    ['/api/progress/p1', 'PUT', { contentVersion: 1, status: 'passed' }],
    ['/api/auth/logout', 'POST'],
  ];
  for (const [path, method, data] of requests) {
    const response = await scoped(path, method, a.user.id, data, b.cookie);
    expect(response.status, `${method} ${path}`).toBe(409);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('ACCOUNT_CHANGED');
    expect(body.error.message).toContain('reload');
    expect(response.headers.get('set-cookie')).toBeNull();
  }
  expect(await h.db.prepare('SELECT COUNT(*) AS count FROM programs').first('count')).toBe(1);
  expect(
    await h.db
      .prepare('SELECT draft,revision,deleted_at FROM programs WHERE id=?')
      .bind(program.id)
      .first(),
  ).toEqual({ draft: 'OUTPUT 2', revision: 1, deleted_at: null });
  expect(await h.db.prepare('SELECT COUNT(*) AS count FROM progress').first('count')).toBe(0);
  expect(await (await h.request('/api/session', 'GET', undefined, b.cookie)).json()).toEqual({
    user: b.user,
  });
});
it('accepts matching account headers including logout', async () => {
  const b = await h.login();
  const response = await scoped(
    '/api/programs',
    'POST',
    b.user.id,
    { title: 'Mine', draft: '' },
    b.cookie,
  );
  expect(response.status).toBe(201);
  expect((await scoped('/api/programs', 'GET', b.user.id, undefined, b.cookie)).status).toBe(200);
  expect(
    (
      await scoped(
        '/api/progress/p1',
        'PUT',
        b.user.id,
        { contentVersion: 1, status: 'started' },
        b.cookie,
      )
    ).status,
  ).toBe(200);
  expect((await scoped('/api/auth/logout', 'POST', b.user.id, undefined, b.cookie)).status).toBe(
    204,
  );
  expect(await (await h.request('/api/session', 'GET', undefined, b.cookie)).json()).toEqual({
    user: null,
  });
});
it('returns 401 before account comparison when the session is absent or expired', async () => {
  const b = await h.login();
  await h.db.prepare('UPDATE sessions SET expires_at=0').run();
  for (const cookie of [undefined, b.cookie])
    for (const [path, method] of [
      ['/api/programs', 'GET'],
      ['/api/progress', 'GET'],
      ['/api/auth/logout', 'POST'],
    ]) {
      expect((await scoped(path, method, 'old-account', undefined, cookie)).status).toBe(401);
    }
  expect((await h.request('/api/auth/logout', 'POST')).status).toBe(401);
});
it('ignores account headers on public OTP routes and session discovery', async () => {
  const response = await scoped('/api/auth/request-code', 'POST', 'old-account', {
    email: 'new@example.com',
  });
  expect(response.status).toBe(200);
  const { challengeId } = (await response.json()) as { challengeId: string };
  const code = h.messages.at(-1)!.text.match(/\b\d{6}\b/)![0];
  expect(
    (await scoped('/api/auth/verify', 'POST', 'old-account', { challengeId, code })).status,
  ).toBe(200);
  expect(await (await scoped('/api/session', 'GET', 'old-account')).json()).toEqual({ user: null });
});
