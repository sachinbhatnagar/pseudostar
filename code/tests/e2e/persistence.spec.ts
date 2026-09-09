import { test, expect, editor, guest, write, signIn, saveStatus } from './fixtures';
import type { Page } from '@playwright/test';
async function nameProgram(page: Page, title: string) {
  const naming = page.getByRole('dialog', { name: 'Save with a different name' });
  await naming.getByRole('textbox', { name: 'New program name' }).fill(title);
  await naming.getByRole('button', { name: 'Save program', exact: true }).click();
  await expect(naming).not.toBeVisible();
}

test('OTP errors use nested API messages; a valid code opens the signed-in studio', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email address' }).fill('alice@example.test');
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('button', { name: /Resend in/ })).toBeDisabled();
  api.rejectNextCode();
  await page.getByRole('textbox', { name: 'Sign-in code' }).fill('999999');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('That code is incorrect. Try again.');
  await page.getByRole('textbox', { name: 'Sign-in code' }).fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  expect(api.authRequests).toEqual([
    { path: '/auth/request-code', body: { email: 'alice@example.test' } },
    { path: '/auth/verify', body: { challengeId: 'test-challenge', code: '999999' } },
    { path: '/auth/verify', body: { challengeId: 'test-challenge', code: '123456' } },
  ]);
});

test('first-create autosave drains newer edits without overlap and restores on reload', async ({
  page,
  api,
}) => {
  const release = api.holdNextSave();
  await page.goto('/');
  await signIn(page);
  await expect.poll(() => api.saves.length).toBe(1);
  expect(api.saves[0]).toMatchObject({ method: 'POST', body: { expectedRevision: 0 } });
  await write(page, 'OUTPUT "newest draft"');
  await page.getByRole('textbox', { name: 'Program name' }).fill('Queue recovery');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saving…');
  release();
  await expect(saveStatus(page)).toHaveText('Saved');
  expect(api.saves).toHaveLength(2);
  expect(api.saves[1]).toMatchObject({
    method: 'PUT',
    path: '/programs/test-program-1',
    body: { title: 'Queue recovery', draft: 'OUTPUT "newest draft"', expectedRevision: 1 },
  });
  expect(api.maxActiveSaves).toBe(1);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Program name' })).toHaveValue('Queue recovery');
  await expect(editor(page)).toHaveText('OUTPUT "newest draft"', { useInnerText: true });
  await expect(saveStatus(page)).toHaveText('Saved');
  expect([...api.programs.values()]).toHaveLength(1);
});

test('new programs save independently and a saved program loads from the library', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await write(page, 'OUTPUT "first"');
  await page.getByRole('textbox', { name: 'Program name' }).fill('First program');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Program name' })).toHaveValue('');
  await write(page, 'OUTPUT "second"');
  await page.getByRole('textbox', { name: 'Program name' }).fill('Second program');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  expect([...api.programs.values()].map((entry) => entry.program.title).sort()).toEqual([
    'First program',
    'Second program',
  ]);
  await page.getByRole('button', { name: 'My programs', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'My programs' });
  await dialog.getByRole('button', { name: 'First program', exact: true }).click();
  await nameProgram(page, 'First program revised');
  await expect(dialog).not.toBeVisible();
  await expect(editor(page)).toHaveText('OUTPUT "first"', { useInnerText: true });
  await expect(page.getByRole('textbox', { name: 'Program name' })).toHaveValue(
    'First program revised',
  );
  await expect(saveStatus(page)).toHaveText('Saved');
});

test('offline save keeps the draft and retries the last acknowledged revision', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  const before = [...api.programs.values()][0].program;
  api.failNextSave('offline');
  await write(page, 'OUTPUT "offline work"');
  await expect(saveStatus(page)).toHaveText('Offline draft');
  await expect(page.getByRole('alert')).toContainText('connection is unavailable');
  await expect(editor(page)).toHaveText('OUTPUT "offline work"', { useInnerText: true });
  expect([...api.programs.values()][0].program).toEqual(before);
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(api.saves.at(-1)?.body).toMatchObject({
    draft: 'OUTPUT "offline work"',
    expectedRevision: before.revision,
  });
  await page.reload();
  await expect(editor(page)).toHaveText('OUTPUT "offline work"', { useInnerText: true });
});

test('conflict preserves the remote program and saves local edits as a copy', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  const remote = [...api.programs.values()][0].program;
  remote.revision++;
  remote.draft = 'OUTPUT "other tab"';
  await write(page, 'OUTPUT "my conflicted work"');
  await expect(saveStatus(page)).toHaveText('Conflict');
  await expect(page.getByRole('alert')).toContainText('A newer revision exists. Save a copy.');
  await page.getByRole('button', { name: 'Compare cloud version', exact: true }).click();
  const comparison = page.getByRole('dialog', { name: 'Compare saved versions' });
  await expect(comparison.locator('pre')).toHaveText([
    'OUTPUT "my conflicted work"',
    'OUTPUT "other tab"',
  ]);
  await expect(
    comparison.getByRole('heading', { name: `Cloud revision ${remote.revision}` }),
  ).toBeVisible();
  await comparison.getByRole('button', { name: 'Keep my changes as a copy', exact: true }).click();
  await expect(comparison).not.toBeVisible();
  await nameProgram(page, 'My conflict copy');
  await expect(saveStatus(page)).toHaveText('Saved');
  expect(api.programs.size).toBe(2);
  expect(api.programs.get(remote.id)?.program.draft).toBe('OUTPUT "other tab"');
  const copy = [...api.programs.values()].find((entry) => entry.program.id !== remote.id)!.program;
  expect(copy).toMatchObject({ draft: 'OUTPUT "my conflicted work"', revision: 1 });
  expect(copy.title).toMatch(/ copy$/);
  expect(api.saves.at(-1)).toMatchObject({ method: 'POST', body: { expectedRevision: 0 } });
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('guest and two accounts keep separate drafts across sign-out and reload', async ({
  page,
  api,
}) => {
  await guest(page);
  await write(page, 'OUTPUT "guest private"');
  await page.getByRole('button', { name: 'Sign in to save', exact: true }).click();
  await signIn(page);
  await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
  await expect(editor(page)).not.toContainText('guest private');
  await write(page, 'OUTPUT "alice private"');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
  expect(api.saves.filter((call) => call.owner === 'alice').at(-1)?.body.draft).toBe(
    'OUTPUT "alice private"',
  );
  await signIn(page, 'bob@example.test');
  await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
  await expect(editor(page)).not.toContainText('alice private');
  await expect(editor(page)).not.toContainText('guest private');
  await write(page, 'OUTPUT "bob private"');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  await page.reload();
  await expect(editor(page)).toHaveText('OUTPUT "bob private"', { useInnerText: true });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Try a practice session without signing in' }).click();
  await expect(editor(page)).toHaveText('OUTPUT "guest private"', { useInnerText: true });
  expect(
    api.saves
      .filter((call) => call.owner === 'bob')
      .every((call) => !call.body.draft.includes('alice private')),
  ).toBe(true);
});

test('saved-program search is case-insensitive, handles no match, and opens a result', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  for (const title of ['Alpha practice', 'Beta loops']) {
    await page.getByRole('textbox', { name: 'Program name' }).fill(title);
    await write(page, `OUTPUT "${title}"`);
    await page.getByRole('button', { name: 'Save now' }).click();
    await expect(saveStatus(page)).toHaveText('Saved');
    if (title === 'Alpha practice')
      await page.getByRole('button', { name: 'New', exact: true }).click();
  }
  await page.getByRole('button', { name: 'My programs', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'My programs' });
  const search = dialog.getByRole('textbox', { name: 'Search saved programs' });
  await search.fill('ALPHA');
  await expect(dialog.locator('.saved-row')).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: 'Alpha practice', exact: true })).toBeVisible();
  await search.fill('no such saved program');
  await expect(dialog.locator('.saved-row')).toHaveCount(0);
  await expect(dialog.getByText('No saved programs match.', { exact: true })).toBeVisible();
  await search.fill('');
  await expect(dialog.locator('.saved-row')).toHaveCount(2);
  await search.fill('bEtA');
  await dialog.getByRole('button', { name: 'Beta loops', exact: true }).click();
  await nameProgram(page, 'Beta loops revised');
  await expect(dialog).not.toBeVisible();
  await expect(editor(page)).toHaveText('OUTPUT "Beta loops"', { useInnerText: true });
  expect(api.programs.size).toBe(2);
});

test('copy clips a maximum-length title and saves as a new revision-1 program', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('textbox', { name: 'Program name' }).fill('A'.repeat(120));
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  const previousIds = new Set(api.programs.keys());
  await page.getByRole('button', { name: 'Save copy', exact: true }).click();
  await nameProgram(page, 'A'.repeat(115) + ' copy');
  await expect(page.getByRole('textbox', { name: 'Program name' })).toHaveValue(
    'A'.repeat(115) + ' copy',
  );
  await expect(saveStatus(page)).toHaveText('Saved');
  const copy = [...api.programs.values()].find(
    (entry) => !previousIds.has(entry.program.id),
  )!.program;
  expect(copy.revision).toBe(1);
  expect(copy.title).toHaveLength(120);
  expect(api.saves.at(-1)).toMatchObject({ method: 'POST', body: { expectedRevision: 0 } });
});

test('cloud save and load retain recovery source for an invalid draft after reload', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('textbox', { name: 'Program name' }).fill('Recoverable draft');
  await write(page, 'OUTPUT "last valid cloud"');
  await editor(page).fill('OUTPUT "unfinished');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  expect(api.saves.at(-1)?.body).toMatchObject({
    draft: 'OUTPUT "unfinished',
    lastValidSource: 'OUTPUT "last valid cloud"',
  });
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT "Hello"');
  await page.getByRole('button', { name: 'My programs', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'My programs' })
    .getByRole('button', { name: 'Recoverable draft', exact: true })
    .click();
  await nameProgram(page, 'Recoverable draft revised');
  await expect(editor(page)).toHaveText('OUTPUT "unfinished');
  await expect(
    page.getByRole('button', { name: 'Restore last valid program', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(editor(page)).toHaveText('OUTPUT "unfinished');
  await page.getByRole('button', { name: 'Restore last valid program', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT "last valid cloud"');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByRole('log').locator('pre')).toHaveText(['last valid cloud']);
});

test('pending sign-out makes the studio inert until both save and logout finish', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  const releaseSave = api.holdNextSave(),
    releaseLogout = api.holdLogout();
  await write(page, 'OUTPUT "before logout"');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  const studio = page.locator('main.production-studio');
  await expect(studio).toHaveAttribute('inert', '');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saving your work and signing out…' }),
  ).toBeVisible();
  await expect.poll(() => api.saves.at(-1)?.body.draft).toBe('OUTPUT "before logout"');
  expect(api.authRequests.some((request) => request.path === '/auth/logout')).toBe(false);
  await page.keyboard.type('must not enter the draft');
  await expect(page.locator('.cm-content')).toHaveText('OUTPUT "before logout"');
  releaseSave();
  await expect
    .poll(() => api.authRequests.some((request) => request.path === '/auth/logout'))
    .toBe(true);
  await expect(studio).toHaveAttribute('inert', '');
  await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveCount(0);
  releaseLogout();
  await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
  expect([...api.programs.values()][0].program.draft).toBe('OUTPUT "before logout"');
});

test('immediate reopen flushes edits before fetching the current program', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('textbox', { name: 'Program name' }).fill('Reopen current');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  const cursor = api.requests.length,
    release = api.holdNextSave();
  await write(page, 'OUTPUT "latest before reopen"');
  await page.getByRole('button', { name: 'My programs', exact: true }).click();
  await expect.poll(() => api.saves.at(-1)?.body.draft).toBe('OUTPUT "latest before reopen"');
  expect(
    api.requests
      .slice(cursor)
      .some((request) => request.method === 'GET' && request.path.startsWith('/programs')),
  ).toBe(false);
  release();
  const dialog = page.getByRole('dialog', { name: 'My programs' });
  await dialog.getByRole('button', { name: 'Reopen current', exact: true }).click();
  await nameProgram(page, 'Reopen current revised');
  await expect(dialog).not.toBeVisible();
  await expect(editor(page)).toHaveText('OUTPUT "latest before reopen"');
  await expect(saveStatus(page)).toHaveText('Saved');
  const requests = api.requests
    .slice(cursor)
    .filter((request) => request.path.startsWith('/programs'));
  expect(requests.map((request) => request.method)).toEqual(['PUT', 'GET', 'GET', 'GET', 'PUT']);
  expect([...api.programs.values()][0].program.draft).toBe('OUTPUT "latest before reopen"');
});

test('delete moves a program to trash without creating a copy, and restore reopens it', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('textbox', { name: 'Program name' }).fill('Restore this program');
  await write(page, 'OUTPUT "recover from trash"');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  const original = [...api.programs.values()][0].program;
  await page.getByRole('button', { name: 'My programs', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'My programs' });
  await dialog
    .locator('.saved-row')
    .filter({ has: page.getByRole('button', { name: 'Restore this program', exact: true }) })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Restore this program', exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole('button', { name: 'Restore this program copy', exact: true }),
  ).toHaveCount(0);
  expect(api.programs.get(original.id)?.program).toMatchObject({
    revision: original.revision + 1,
    deletedAt: expect.any(Number),
  });
  await dialog.getByRole('button', { name: 'Recently deleted', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Restore this program', exact: true }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(dialog.getByText('No deleted programs.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Show active programs', exact: true }).click();
  await dialog.getByRole('button', { name: 'Restore this program', exact: true }).click();
  await nameProgram(page, 'Restore this program revised');
  await expect(dialog).not.toBeVisible();
  await expect(editor(page)).toHaveText('OUTPUT "recover from trash"');
  expect(api.programs.get(original.id)?.program).toMatchObject({
    revision: original.revision + 3,
    deletedAt: null,
  });
  expect(api.requests).toContainEqual({ method: 'DELETE', path: `/programs/${original.id}` });
  expect(api.requests).toContainEqual({ method: 'POST', path: `/programs/${original.id}/restore` });
});

test('Check my logic shows failed and passed cases and persists signed-in progress', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('button', { name: 'Choose a problem', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /The inclusive gate/ })
    .click();
  await page.getByRole('button', { name: 'Check my logic', exact: true }).click();
  const results = page.getByRole('region', { name: 'Challenge results' });
  await expect(
    results.getByRole('heading', { name: 'A useful clue for your next try.' }),
  ).toBeVisible();
  await expect(results.locator('summary').first()).toContainText('Try again');
  await expect.poll(() => api.progress.get('alice:ref-1-1')?.status).toBe('started');
  await write(
    page,
    'INPUT number\nIF number >= 1 AND number <= 10 THEN\n    OUTPUT "That is correct"\nELSE\n    OUTPUT "That is incorrect"\nENDIF',
  );
  await page.getByRole('button', { name: 'Check my logic', exact: true }).click();
  await expect(
    results.getByRole('heading', { name: 'Your program passed these checks.' }),
  ).toBeVisible();
  const summaries = results.locator('summary');
  expect(await summaries.count()).toBeGreaterThan(1);
  for (const text of await summaries.allTextContents()) expect(text).toContain('Passed');
  await expect(results.locator('summary').filter({ hasText: 'Try again' })).toHaveCount(0);
  await expect.poll(() => api.progress.get('alice:ref-1-1')?.status).toBe('passed');
  expect(api.progress.get('alice:ref-1-1')).toMatchObject({
    problemId: 'ref-1-1',
    highestHintViewed: 0,
  });
});

test('guest library keeps programs across New, challenge switches, and reload', async ({
  page,
  api,
}) => {
  await guest(page);
  await page.getByRole('textbox', { name: 'Program name' }).fill('Guest first');
  await write(page, 'OUTPUT "first local program"');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('textbox', { name: 'Program name' }).fill('Guest second');
  await write(page, 'OUTPUT "second local program"');
  await page.getByRole('button', { name: 'Browse all problems', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /The inclusive gate/ })
    .click();
  await page.reload();
  await page.getByRole('button', { name: 'My programs', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'My programs' });
  await expect(
    dialog.getByText('Saved in this browser. Sign in to keep programs online across devices.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Guest first', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Guest second', exact: true })).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'The inclusive gate', exact: true }),
  ).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Search saved programs' }).fill('FIRST');
  await expect(dialog.locator('.saved-row')).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Guest first', exact: true }).click();
  await nameProgram(page, 'Guest first revised');
  await expect(editor(page)).toHaveText('OUTPUT "first local program"');
  await page.reload();
  await expect(editor(page)).toHaveText('OUTPUT "first local program"');
  await page.getByRole('button', { name: 'My programs', exact: true }).click();
  await dialog.getByRole('button', { name: 'Guest second', exact: true }).click();
  await nameProgram(page, 'Guest second revised');
  await expect(editor(page)).toHaveText('OUTPUT "second local program"');
  expect(api.saves).toEqual([]);
  expect(
    api.requests.every(
      (request) => request.method === 'GET' && ['/session', '/problems'].includes(request.path),
    ),
  ).toBe(true);
});

test('guest delete and restore preserve local programs without cloud writes', async ({
  page,
  api,
}) => {
  await guest(page);
  await page.getByRole('textbox', { name: 'Program name' }).fill('Guest recovery');
  await write(page, 'OUTPUT "local recovery"');
  await page.getByRole('button', { name: 'My programs', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'My programs' });
  await dialog
    .locator('.saved-row')
    .filter({ has: page.getByRole('button', { name: 'Guest recovery', exact: true }) })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(dialog.getByRole('button', { name: 'Guest recovery', exact: true })).toHaveCount(0);
  await expect(
    dialog.getByRole('button', { name: 'Guest recovery copy', exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Recently deleted', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Guest recovery', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(dialog.getByText('No deleted programs.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Show active programs', exact: true }).click();
  await dialog.getByRole('button', { name: 'Guest recovery', exact: true }).click();
  await nameProgram(page, 'Guest recovery revised');
  await expect(editor(page)).toHaveText('OUTPUT "local recovery"');
  await page.reload();
  await expect(editor(page)).toHaveText('OUTPUT "local recovery"');
  expect(
    api.requests.every(
      (request) => request.method === 'GET' && ['/session', '/problems'].includes(request.path),
    ),
  ).toBe(true);
});

test('a failed list refresh after deletion cannot make later saves target the deleted program', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('textbox', { name: 'Program name' }).fill('Delete safely');
  await write(page, 'OUTPUT "keep after delete"');
  await page.getByRole('button', { name: 'My programs', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'My programs' });
  await expect(dialog).toBeVisible();
  const deletedId = [...api.programs.keys()][0];
  api.failNextList();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('The program list is unavailable.');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Program name' })).toHaveValue('');
  const cursor = api.saves.length;
  await write(page, 'OUTPUT "edited safe copy"');
  await page.getByRole('textbox', { name: 'Program name' }).fill('Fresh after deletion');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  expect(api.saves.slice(cursor).every((call) => call.path !== `/programs/${deletedId}`)).toBe(
    true,
  );
  expect(api.saves.at(-1)?.body.draft).toBe('OUTPUT "edited safe copy"');
  expect(api.programs.get(deletedId)?.program.deletedAt).not.toBeNull();
});

test('renaming an existing program preserves its identity and autosaves only one entry', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('textbox', { name: 'Program name' }).fill('Original');
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  const id = [...api.programs.keys()][0];
  await page.getByRole('button', { name: 'My programs', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'My programs' })
    .getByRole('button', { name: 'Original', exact: true })
    .click();
  const naming = page.getByRole('dialog', { name: 'Save with a different name' });
  await naming.getByRole('textbox', { name: 'New program name' }).fill(' original ');
  await naming.getByRole('button', { name: 'Save program', exact: true }).click();
  await expect(naming.getByRole('alert')).toHaveText('Choose a different name.');
  expect(api.programs.size).toBe(1);
  await nameProgram(page, 'My revised logic');
  for (const source of ['OUTPUT 2', 'OUTPUT 3']) {
    await write(page, source);
    await expect(saveStatus(page)).toHaveText('Saved');
    expect(api.programs.size).toBe(1);
    expect(api.programs.get(id)?.program).toMatchObject({
      title: 'My revised logic',
      draft: source,
    });
  }
});

test('named copies reject duplicate names and further edits update the same copy', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await signIn(page);
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect(saveStatus(page)).toHaveText('Saved');
  await page.getByRole('button', { name: 'Save copy', exact: true }).click();
  await nameProgram(page, 'One copy');
  await write(page, 'OUTPUT 8');
  await expect(saveStatus(page)).toHaveText('Saved');
  expect(api.programs.size).toBe(2);
  await page.getByRole('button', { name: 'Save copy', exact: true }).click();
  const naming = page.getByRole('dialog', { name: 'Save with a different name' });
  await naming.getByRole('textbox', { name: 'New program name' }).fill('MY FIRST PROGRAM');
  await naming.getByRole('button', { name: 'Save program', exact: true }).click();
  await expect(naming.getByRole('alert')).toContainText('already uses this name');
  expect(api.programs.size).toBe(2);
});

for (const signedIn of [false, true]) {
  test(`unnamed drafts stay outside the library and deleting creates no copies (${signedIn ? 'account' : 'guest'})`, async ({
    page,
    api,
  }) => {
    await page.goto('/');
    if (signedIn) {
      await page.getByRole('textbox', { name: 'Email address' }).fill('alice@example.test');
      await page.getByRole('button', { name: 'Email me a code', exact: true }).click();
      await page.getByRole('textbox', { name: 'Sign-in code' }).fill('123456');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    } else
      await page.getByRole('button', { name: 'Try a practice session without signing in' }).click();
    await write(page, 'OUTPUT 42');
    await page.getByRole('button', { name: 'My programs', exact: true }).click();
    const library = page.getByRole('dialog', { name: 'My programs' });
    await expect(library.locator('.saved-row')).toHaveCount(0);
    await library.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await expect(editor(page)).toHaveText('OUTPUT 42');
    await page.getByRole('button', { name: 'Save now', exact: true }).click();
    await nameProgram(page, 'Named once');
    await page.getByRole('button', { name: 'My programs', exact: true }).click();
    await expect(library.locator('.saved-row')).toHaveCount(1);
    await library.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(library.locator('.saved-row')).toHaveCount(0);
    await library.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await write(page, 'OUTPUT 99');
    await page.getByRole('button', { name: 'My programs', exact: true }).click();
    await expect(library.locator('.saved-row')).toHaveCount(0);
    await library.getByRole('button', { name: 'Recently deleted', exact: true }).click();
    await expect(library.locator('.saved-row')).toHaveCount(1);
    if (signedIn) expect(api.programs.size).toBe(1);
  });
}
