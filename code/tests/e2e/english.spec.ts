import { test, expect, guest, write, editor } from './fixtures';
import { exercises } from '../../src/english/content';
import {
  newAttempt,
  RUBRIC_VERSION,
  type Attempt,
  type Award,
  type Feedback,
} from '../../src/english/model';
import type { Page } from '@playwright/test';

async function openGuestEnglish(page: Page) {
  await guest(page);
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).click();
  await page.getByRole('option', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: /Grade 8/ }).click();
  await expect(page.getByRole('heading', { name: /A little practice/ })).toBeVisible();
}
async function startLetter(page: Page) {
  await page.goto('/english/exercises/g8-welcome-letter');
  await page.getByRole('button', { name: 'Start this exercise', exact: true }).click();
  await expect(page).toHaveURL(/\/english\/attempts\//);
}
const first =
  'Dear Sam, Welcome to the nature club. On Wednesday we meet in Room 6 before a short courtyard walk. Bring water. You can sketch a leaf alone or with a partner, and the club supplies the materials.';
const revised =
  first +
  ' If you feel unsure, ask to work with me. We can choose a leaf together before we start drawing.';

test('guest revisions survive grade changes, refresh and history navigation', async ({ page }) => {
  await openGuestEnglish(page);
  await startLetter(page);
  const url = page.url();
  const response = page.getByRole('textbox', { name: 'Your writing' });
  await response.fill(first);
  await page.getByRole('button', { name: 'Save my response', exact: true }).click();
  await expect(page.getByText('Saved without AI evaluation.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit revision' })).toBeDisabled();
  await response.fill(revised);
  await page.getByRole('button', { name: 'Submit revision' }).click();
  await expect(page.locator('.en-revision')).toHaveCount(2);
  await expect(page.locator('.en-main').getByRole('combobox', { name: 'Your grade' })).toHaveCount(
    0,
  );
  await expect(page.getByRole('combobox', { name: 'Your grade' })).not.toBeVisible();
  await page.getByRole('button', { name: /user settings/i }).click();
  await page.getByRole('combobox', { name: 'Your grade' }).click();
  await page.getByRole('option', { name: '10', exact: true }).click();
  await page.getByRole('link', { name: 'Writing history', exact: true }).click();
  await expect(page.locator('.en-history-row')).toContainText('Grade 8');
  await expect(page.locator('.en-history-row')).toContainText('2 submitted versions');
  await page.getByRole('link', { name: /Welcome to the club/ }).click();
  await expect(page).toHaveURL(url);
  await page.reload();
  await expect(response).toHaveValue(revised);
  await page.getByRole('button', { name: /user settings/i }).click();
  await expect(page.getByRole('combobox', { name: 'Your grade' })).toHaveText('10');
  await page.locator('.en-revision').first().locator('summary').click();
  await expect(
    page.locator('.en-revision').first().getByText(first, { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.en-revision').last().getByText(revised, { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'My progress', exact: true }).click();
  await expect(page.locator('.en-points strong')).toHaveText('0');
  await page.goBack();
  await expect(response).toHaveValue(revised);
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Practice that adds up.' })).toBeVisible();
});

test('workspace switching preserves ICT draft and unknown English routes recover', async ({
  page,
}) => {
  await guest(page);
  await write(page, 'OUTPUT "Keep my ICT draft"');
  const ictHeader = await page.locator('.workspace-header:visible').boundingBox();
  const ictSwitcher = await page
    .getByRole('combobox', { name: 'Workspace', exact: true })
    .boundingBox();
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).click();
  await page.getByRole('option', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: /Grade 9/ }).click();
  const englishHeader = await page.locator('.workspace-header:visible').boundingBox();
  const englishSwitcher = await page
    .getByRole('combobox', { name: 'Workspace', exact: true })
    .boundingBox();
  expect(englishHeader!.height).toBe(ictHeader!.height);
  expect(englishSwitcher!.x).toBeCloseTo(ictSwitcher!.x, 0);
  await page.goto('/english/exercises/not-an-exercise');
  await expect(page.getByRole('heading', { name: 'This page is not available.' })).toBeVisible();
  await page.getByRole('link', { name: 'Return to your dashboard' }).click();
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).click();
  await page.getByRole('option', { name: 'ICT', exact: true }).click();
  await expect(page).toHaveURL(/\/ict$/);
  await expect(editor(page)).toHaveText('OUTPUT "Keep my ICT draft"');
  await page.reload();
  await expect(editor(page)).toHaveText('OUTPUT "Keep my ICT draft"');
});

test('timed guest writing retains clock, planning and text on a narrow screen', async ({
  page,
}) => {
  await openGuestEnglish(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/english/exercises/g8-quiet-corner');
  await page.getByRole('button', { name: 'Start this exercise' }).click();
  await page.getByRole('button', { name: 'Start timer', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Planning notes' })
    .fill('Propose a trial, share the space, review supervision.');
  await page.getByRole('button', { name: 'Write', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Your writing' })
    .fill('We need a calm place to read at lunch, while leaving shelter for others.');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start timer', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Planning notes' })).toHaveValue(
    'Propose a trial, share the space, review supervision.',
  );
  await expect(page.getByRole('button', { name: 'Write', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('textbox', { name: 'Your writing' })).toHaveValue(
    /We need a calm place/,
  );
  await page.getByRole('button', { name: 'Proofread', exact: true }).click();
  await page.getByRole('button', { name: 'Save my response' }).click();
  await expect(page.locator('.en-revision')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mock account feedback and fresh work update history and monthly points', async ({
  page,
  api,
}) => {
  api.user = { id: 'alice', email: 'alice@example.test' };
  const attempts = new Map<string, Attempt>();
  const awards: Award[] = [];
  const unexpected: string[] = [];
  let holdRefresh = false;
  let refreshHeld = false;
  let releaseRefresh!: () => void;
  const pendingRefresh = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  await page.route('**/api/english/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/english', '');
    const method = request.method();
    expect(request.headers()['x-pseudostar-user']).toBe('alice');
    if (path === '/profile') return route.fulfill({ json: { grade: 8 } });
    if (path === '/exercises' && method === 'GET')
      return route.fulfill({ json: { exercises: [] } });
    if (path === '/attempts' && method === 'GET') {
      const snapshot = JSON.stringify({ attempts: [...attempts.values()], awards });
      if (holdRefresh) {
        holdRefresh = false;
        refreshHeld = true;
        await pendingRefresh;
      }
      return route.fulfill({ contentType: 'application/json', body: snapshot });
    }
    const body = request.postDataJSON();
    if (path === '/attempts' && method === 'POST') {
      const exercise = exercises.find((exercise) => exercise.id === body.exerciseId)!;
      const attempt = newAttempt(exercise, body.mode, body.parentId ?? null);
      attempts.set(attempt.id, attempt);
      return route.fulfill({ status: 201, json: { attempt } });
    }
    const match = /^\/attempts\/([^/]+)(\/submit)?$/.exec(path);
    const existing = match && attempts.get(match[1]);
    if (existing && body.expectedVersion === existing.version) {
      if (method === 'PUT' && !match[2]) {
        const attempt = {
          ...existing,
          response: body.response,
          plan: body.plan,
          stage: body.stage,
          startedAt: body.startedAt,
          assisted: body.assisted,
          version: existing.version + 1,
          updatedAt: Date.now(),
        };
        attempts.set(attempt.id, attempt);
        return route.fulfill({ json: { attempt } });
      }
      if (method === 'POST' && match[2]) {
        const revision = existing.revisions.length > 0;
        const feedback: Feedback = {
          strengths: ['You give the new member useful practical details.'],
          corrections: [],
          nextStep: 'Add a specific offer of help for a nervous reader.',
          ratings: [
            {
              skill: 'audience',
              rating: revision ? 'Strong' : 'Secure',
              score: revision ? 4 : 3,
              evidence: existing.response.response,
              explanation: 'The letter addresses a new member directly.',
            },
          ],
          improvement: {
            meaningful: revision,
            explanation: revision ? 'The added offer of a partner answers a concern directly.' : '',
          },
          substantive: true,
        };
        const attempt: Attempt = {
          ...existing,
          version: existing.version + 1,
          updatedAt: Date.now(),
          revisions: [
            ...existing.revisions,
            {
              id: crypto.randomUUID(),
              response: { ...existing.response },
              plan: existing.plan,
              submittedAt: Date.now(),
              assisted: existing.assisted,
              overTime: false,
              feedback,
              error: null,
              rubricVersion: RUBRIC_VERSION,
            },
          ],
        };
        if (!revision) holdRefresh = true;
        const kind = revision ? 'revision' : 'completion';
        if (
          !awards.some((award) => award.exerciseId === existing.exercise.id && award.kind === kind)
        )
          awards.push({
            id: crypto.randomUUID(),
            exerciseId: existing.exercise.id,
            exerciseVersion: 1,
            attemptId: existing.id,
            kind,
            points: revision ? 5 : 10,
            earnedAt: Date.now(),
          });
        attempts.set(attempt.id, attempt);
        return route.fulfill({ json: { attempt } });
      }
    }
    unexpected.push(method + ' ' + path);
    return route.fulfill({
      status: 400,
      json: { error: { message: 'Unexpected English mock request.' } },
    });
  });
  await page.goto('/english');
  await expect(page.getByRole('heading', { name: /A little practice/ })).toBeVisible();
  await startLetter(page);
  await page.getByRole('textbox', { name: 'Your writing' }).fill(first);
  await page.getByRole('button', { name: 'Submit for assessment', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is working' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Assessment score' })).toContainText('75');
  await expect(page.getByRole('button', { name: 'Download my response' })).toHaveCount(0);
  await expect(page.getByText('Worked example · different material', { exact: true })).toHaveCount(
    0,
  );
  await expect.poll(() => refreshHeld).toBe(true);
  await page.getByRole('textbox', { name: 'Your writing' }).fill(revised);
  await expect.poll(() => [...attempts.values()][0].response.response).toBe(revised);
  const refreshed = page.waitForResponse(
    (r) => r.url().endsWith('/api/english/attempts') && r.request().method() === 'GET',
  );
  releaseRefresh();
  await refreshed;
  await page.getByRole('link', { name: 'Writing history', exact: true }).click();
  await page.getByRole('link', { name: /Welcome to the club/ }).click();
  await expect(page.getByRole('textbox', { name: 'Your writing' })).toHaveValue(revised);
  await page.getByRole('button', { name: 'Submit revision' }).click();
  await expect(page.locator('.en-revision')).toHaveCount(2);
  await expect(page.locator('.en-revision').last()).toContainText('+25 percentage points');
  await expect(page.locator('.en-revision').last()).toContainText('The added offer of a partner');
  await page.getByRole('button', { name: 'Try a fresh independent task' }).click();
  await expect(
    page.getByRole('heading', { name: 'A key in the envelope', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.en-attempt > header')).toContainText('Independent check');
  expect([...attempts.values()].at(-1)?.parentId).toBe([...attempts.values()][0].id);
  await page.getByRole('link', { name: 'My progress', exact: true }).click();
  await expect(page.locator('.en-points strong')).toHaveText('15');
  await expect(page.getByRole('table', { name: 'Assessment score history' })).toContainText(
    '75/100',
  );
  await expect(page.getByRole('table', { name: 'Assessment score history' })).toContainText(
    '100/100',
  );
  const month = new Date().toISOString().slice(0, 7);
  await expect(page.getByRole('row', { name: new RegExp(month) })).toContainText('15');
  await page.getByRole('link', { name: 'Writing history', exact: true }).click();
  await expect(page.locator('.en-history-row')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.en-history-row')).toHaveCount(2);
  expect(unexpected).toEqual([]);
});

test('a lost help response recovers its saved version before retry', async ({ page, api }) => {
  api.user = { id: 'alice', email: 'alice@example.test' };
  let attempt = newAttempt(
    exercises.find((e) => e.id === 'g8-welcome-letter')!,
    'independent',
  );
  attempt.response = { response: first };
  let helpCalls = 0;
  await page.route('**/api/english/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path.endsWith('/profile')) return route.fulfill({ json: { grade: 8 } });
    if (path.endsWith('/exercises')) return route.fulfill({ json: { exercises: [] } });
    if (path.endsWith('/attempts'))
      return route.fulfill({ json: { attempts: [attempt], awards: [] } });
    if (path.endsWith('/help')) {
      expect(request.postDataJSON().expectedVersion).toBe(attempt.version);
      attempt = { ...attempt, version: attempt.version + 1, assisted: true };
      helpCalls++;
      if (helpCalls === 1) return route.abort('failed');
      return route.fulfill({ json: { attempt, hint: 'Check the offer of help.' } });
    }
    return route.fulfill({ json: { attempt } });
  });
  await page.goto('/english/attempts/' + attempt.id);
  await page.getByRole('button', { name: 'Use coaching instead', exact: true }).click();
  await expect(page.locator('.en-attempt > header')).toContainText('With coaching');
  await page.getByRole('button', { name: 'Ask for a hint', exact: true }).click();
  await expect(page.getByText('Check the offer of help.', { exact: true })).toBeVisible();
  expect(helpCalls).toBe(2);
});

test('late generation does not leave the workspace chosen while waiting', async ({ page, api }) => {
  api.user = { id: 'alice', email: 'alice@example.test' };
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let generationStarted = false;
  await page.route('**/api/english/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/profile')) return route.fulfill({ json: { grade: 8 } });
    if (path.endsWith('/attempts')) return route.fulfill({ json: { attempts: [], awards: [] } });
    if (route.request().method() === 'POST') {
      generationStarted = true;
      await pending;
      return route.fulfill({ json: { exercise: exercises[0] } });
    }
    return route.fulfill({ json: { exercises: [] } });
  });
  await page.goto('/english/tools/sentence-surgery');
  await page.getByRole('button', { name: '+ Create New Practice' }).click();
  await expect.poll(() => generationStarted).toBe(true);
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).click();
  await page.getByRole('option', { name: 'ICT', exact: true }).click();
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/english/exercises') && r.request().method() === 'POST',
  );
  release();
  await (await response).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.getByRole('combobox', { name: 'Workspace', exact: true })).toHaveText('ICT');
  await expect(page).toHaveURL(/\/ict$/);
});

test('a delayed English name response cannot restore a signed-out account', async ({
  page,
  api,
}) => {
  api.user = { id: 'alice', email: 'alice@example.test' };
  await page.route('**/api/english/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      json: path.endsWith('/profile')
        ? { grade: 8 }
        : path.endsWith('/exercises')
          ? { exercises: [] }
          : { attempts: [], awards: [] },
    });
  });
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let savingName = false;
  await page.route('**/api/profile', async (route) => {
    savingName = true;
    await pending;
    return route.fulfill({
      json: { user: { id: 'alice', email: 'alice@example.test', name: 'Alice' } },
    });
  });
  await page.goto('/english');
  await page.getByRole('button', { name: /user settings/i }).click();
  await page.getByRole('button', { name: 'alice@example.test', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Alice');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect.poll(() => savingName).toBe(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  const response = page.waitForResponse((r) => r.url().endsWith('/api/profile'));
  release();
  await (await response).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(
    page.getByRole('button', { name: 'Try a practice session without signing in' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alice', exact: true })).toHaveCount(0);
});

test('shared menus support keyboard selection, Escape and mobile settings', async ({ page }) => {
  await guest(page);
  const workspace = page.getByRole('combobox', { name: 'Workspace', exact: true });
  await workspace.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(page.getByRole('option', { name: 'ICT', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('option', { name: 'English', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /Grade 8/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const settings = page.getByRole('button', { name: /user settings/i });
  await settings.click();
  const panel = page.getByRole('dialog', { name: 'User settings' });
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.getByRole('combobox', { name: 'Your grade' }).click();
  await page.keyboard.press('Escape');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(settings).toBeFocused();
});
