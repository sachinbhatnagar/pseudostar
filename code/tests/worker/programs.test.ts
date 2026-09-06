import { afterEach, beforeEach, expect, it } from 'vitest';
import { harness } from './harness';
let h: Awaited<ReturnType<typeof harness>>;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
it('isolates owners, retains raw drafts, rejects stale saves, deletes and restores', async () => {
  const a = await h.login('a@example.com');
  const b = await h.login('b@example.com');
  const created = await h.request(
    '/api/programs',
    'POST',
    {
      title: 'Draft',
      problemId: 'problem-1',
      draft: 'IF unfinished',
      workspace: '{"blocks":{}}',
      lastValidSource: 'OUTPUT 1',
    },
    a.cookie,
  );
  expect(created.status).toBe(201);
  const { program } = (await created.json()) as any;
  for (const method of ['GET', 'PUT', 'DELETE']) {
    expect(
      (
        await h.request(
          `/api/programs/${program.id}`,
          method,
          method === 'PUT'
            ? { expectedRevision: 1, title: 'Other', draft: 'OUTPUT 2' }
            : method === 'DELETE'
              ? { expectedRevision: 1 }
              : undefined,
          b.cookie,
        )
      ).status,
    ).toBe(404);
  }
  const updates = await Promise.all(
    ['one', 'two'].map((title) =>
      h.request(
        `/api/programs/${program.id}`,
        'PUT',
        { expectedRevision: 1, title, draft: 'INPUT ' },
        a.cookie,
      ),
    ),
  );
  expect(updates.map((r) => r.status).sort()).toEqual([200, 409]);
  const loaded = (await (
    await h.request(`/api/programs/${program.id}`, 'GET', undefined, a.cookie)
  ).json()) as any;
  expect(loaded.program.draft).toBe('INPUT ');
  expect(loaded.program.lastValidSource).toBe('OUTPUT 1');
  expect(loaded.program.workspace).toBe('{"blocks":{}}');
  expect(
    (
      await h.request(
        `/api/programs/${program.id}`,
        'DELETE',
        { expectedRevision: loaded.program.revision },
        a.cookie,
      )
    ).status,
  ).toBe(204);
  expect((await h.request(`/api/programs/${program.id}`, 'GET', undefined, a.cookie)).status).toBe(
    404,
  );
  expect(
    (
      await h.request(
        `/api/programs/${program.id}/restore`,
        'POST',
        { expectedRevision: 3 },
        b.cookie,
      )
    ).status,
  ).toBe(404);
  const deleted = (await (
    await h.request('/api/programs?deleted=true', 'GET', undefined, a.cookie)
  ).json()) as any;
  expect(deleted.programs).toHaveLength(1);
  expect(
    (
      await h.request(
        `/api/programs/${program.id}/restore`,
        'POST',
        { expectedRevision: 3 },
        a.cookie,
      )
    ).status,
  ).toBe(200);
  expect(await (await h.request('/api/programs', 'GET', undefined, b.cookie)).json()).toEqual({
    programs: [],
  });
});
it('validates storage bounds and rejects restore after 30 days', async () => {
  const a = await h.login();
  for (const bad of [
    { title: 'a'.repeat(121) },
    { draft: 'x'.repeat(204801) },
    { workspace: '[]' },
    { workspace: JSON.stringify({ nodes: Array.from({ length: 5001 }, () => ({})) }) },
    { formatVersion: 2 },
  ]) {
    expect(
      (await h.request('/api/programs', 'POST', { title: 'Draft', draft: '', ...bad }, a.cookie))
        .status,
    ).toBeGreaterThanOrEqual(400);
  }
  const { program } = (await (
    await h.request('/api/programs', 'POST', { title: 'Old', draft: '' }, a.cookie)
  ).json()) as any;
  await h.db
    .prepare('UPDATE programs SET deleted_at=? WHERE id=?')
    .bind(Date.now() - 31 * 86400000, program.id)
    .run();
  expect(
    (
      await h.request(
        `/api/programs/${program.id}/restore`,
        'POST',
        { expectedRevision: 3 },
        a.cookie,
      )
    ).status,
  ).toBe(404);
});
it('stores isolated monotonic progress and resets for new content versions', async () => {
  const a = await h.login('a@example.com');
  const b = await h.login('b@example.com');
  expect(
    (
      await h.request(
        '/api/progress/p1',
        'PUT',
        { contentVersion: 1, status: 'passed', highestHintViewed: 3 },
        a.cookie,
      )
    ).status,
  ).toBe(200);
  const same = (await (
    await h.request(
      '/api/progress/p1',
      'PUT',
      { contentVersion: 1, status: 'started', highestHintViewed: 0 },
      a.cookie,
    )
  ).json()) as any;
  expect(same.progress.status).toBe('passed');
  expect(same.progress.highestHintViewed).toBe(3);
  expect(await (await h.request('/api/progress', 'GET', undefined, b.cookie)).json()).toEqual({
    progress: [],
  });
  const next = (await (
    await h.request(
      '/api/progress/p1',
      'PUT',
      { contentVersion: 2, status: 'started', highestHintViewed: 0 },
      a.cookie,
    )
  ).json()) as any;
  expect(next.progress.status).toBe('started');
  expect(next.progress.highestHintViewed).toBe(0);
  expect(
    (await h.request('/api/progress/p1', 'PUT', { contentVersion: 1, status: 'passed' }, a.cookie))
      .status,
  ).toBe(409);
});
it('reapplies the migration without data loss and cleans expired records', async () => {
  const { readFile } = await import('node:fs/promises');
  const { cleanup } = await import('../../worker/programs');
  const a = await h.login();
  const { program } = (await (
    await h.request('/api/programs', 'POST', { title: 'Keep', draft: 'OUTPUT 1' }, a.cookie)
  ).json()) as any;
  for (const statement of (await readFile('migrations/0001_initial.sql', 'utf8'))
    .split(';')
    .filter((v) => v.trim()))
    await h.db.prepare(statement).run();
  expect((await h.request(`/api/programs/${program.id}`, 'GET', undefined, a.cookie)).status).toBe(
    200,
  );
  await h.db
    .prepare('UPDATE programs SET deleted_at=? WHERE id=?')
    .bind(Date.now() - 31 * 86400000, program.id)
    .run();
  await h.db.prepare('UPDATE sessions SET expires_at=0').run();
  await cleanup({ DB: h.db } as any);
  expect(await h.db.prepare('SELECT COUNT(*) AS count FROM programs').first('count')).toBe(0);
  expect(await h.db.prepare('SELECT COUNT(*) AS count FROM sessions').first('count')).toBe(0);
});
it('requires revisions for delete and restore and rejects stale requests and replay', async () => {
  const a = await h.login();
  const { program } = (await (
    await h.request(
      '/api/programs',
      'POST',
      { title: 'Revision test', draft: 'OUTPUT 1' },
      a.cookie,
    )
  ).json()) as any;
  const path = `/api/programs/${program.id}`;
  for (const value of [undefined, -1, 0, 1.5, '1']) {
    expect((await h.request(path, 'DELETE', { expectedRevision: value }, a.cookie)).status).toBe(
      400,
    );
    expect(
      (await h.request(path + '/restore', 'POST', { expectedRevision: value }, a.cookie)).status,
    ).toBe(400);
  }
  await h.request(
    path,
    'PUT',
    { expectedRevision: 1, title: 'Newer', draft: 'OUTPUT 2' },
    a.cookie,
  );
  const stale = await h.request(path, 'DELETE', { expectedRevision: 1 }, a.cookie);
  expect(stale.status).toBe(409);
  expect(((await stale.json()) as any).error).toMatchObject({
    code: 'REVISION_CONFLICT',
    currentRevision: 2,
    program: { draft: 'OUTPUT 2', deletedAt: null },
  });
  const deletes = await Promise.all(
    Array.from({ length: 3 }, () => h.request(path, 'DELETE', { expectedRevision: 2 }, a.cookie)),
  );
  expect(deletes.map((r) => r.status).sort()).toEqual([204, 409, 409]);
  const replay = await h.request(path, 'DELETE', { expectedRevision: 2 }, a.cookie);
  expect(replay.status).toBe(409);
  expect(((await replay.json()) as any).error.currentRevision).toBe(3);
  expect((await h.request(path, 'DELETE', { expectedRevision: 3 }, a.cookie)).status).toBe(409);
  expect(
    (await h.request(path + '/restore', 'POST', { expectedRevision: 2 }, a.cookie)).status,
  ).toBe(409);
  const restores = await Promise.all(
    Array.from({ length: 3 }, () =>
      h.request(path + '/restore', 'POST', { expectedRevision: 3 }, a.cookie),
    ),
  );
  expect(restores.map((r) => r.status).sort()).toEqual([200, 409, 409]);
  const restored = await h.request(path + '/restore', 'POST', { expectedRevision: 3 }, a.cookie);
  expect(restored.status).toBe(409);
  expect(((await restored.json()) as any).error).toMatchObject({
    currentRevision: 4,
    program: { deletedAt: null, draft: 'OUTPUT 2' },
  });
  expect(
    (await h.request(path + '/restore', 'POST', { expectedRevision: 4 }, a.cookie)).status,
  ).toBe(409);
});
it('accepts 120 Unicode code points for titles and rejects 121 on create and update', async () => {
  const account = await h.login();
  for (const character of ['学', '🌟']) {
    const title = character.repeat(120);
    const created = await h.request('/api/programs', 'POST', { title, draft: '' }, account.cookie);
    expect(created.status).toBe(201);
    const { program } = (await created.json()) as {
      program: { id: string; title: string; revision: number };
    };
    expect(program.title).toBe(title);
    const path = `/api/programs/${program.id}`;
    const updated = await h.request(
      path,
      'PUT',
      { expectedRevision: program.revision, title: ` ${title} `, draft: '' },
      account.cookie,
    );
    expect(updated.status).toBe(200);
    const saved = (await updated.json()) as { program: { title: string; revision: number } };
    expect(saved.program.title).toBe(title);
    expect(
      (
        await h.request(
          '/api/programs',
          'POST',
          { title: title + character, draft: '' },
          account.cookie,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await h.request(
          path,
          'PUT',
          { expectedRevision: saved.program.revision, title: title + character, draft: '' },
          account.cookie,
        )
      ).status,
    ).toBe(400);
  }
  expect(
    (await h.request('/api/programs', 'POST', { title: '   ', draft: '' }, account.cookie)).status,
  ).toBe(400);
  expect(
    (
      await h.request(
        '/api/programs',
        'POST',
        { title: 'Source byte limit', draft: '学'.repeat(68267) },
        account.cookie,
      )
    ).status,
  ).toBe(400);
});
