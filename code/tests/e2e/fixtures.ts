import { test as base, expect, type Page, type Route } from '@playwright/test';

type User = { id: string; email: string };
type Program = {
  id: string;
  title: string;
  draft: string;
  problemId: string | null;
  revision: number;
  lastValidSource?: string | null;
  updatedAt: number;
  deletedAt: number | null;
};
type SaveBody = {
  title: string;
  draft: string;
  lastValidSource?: string;
  problemId: string | null;
  expectedRevision: number;
};
type SaveCall = { owner: string; method: string; path: string; body: SaveBody };
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

// All API traffic is intercepted before navigation. Nothing reaches a real account.
export class TestApi {
  user: User | null = null;
  readonly saves: SaveCall[] = [];
  readonly authRequests: Array<{ path: string; body: Record<string, unknown> }> = [];
  readonly requests: Array<{ path: string; method: string }> = [];
  readonly unexpected: string[] = [];
  readonly progress = new Map<string, Record<string, unknown>>();
  readonly programs = new Map<string, { owner: string; program: Program }>();
  maxActiveSaves = 0;
  private activeSaves = 0;
  private serial = 0;
  private email = '';
  private nextGate: ReturnType<typeof gate> | null = null;
  private logoutGate: ReturnType<typeof gate> | null = null;
  private gates: Array<ReturnType<typeof gate>> = [];
  private failSave: number | 'offline' | null = null;
  private failVerify = false;
  private failList = false;
  holdNextSave() {
    const hold = gate();
    this.nextGate = hold;
    this.gates.push(hold);
    return hold.release;
  }
  holdLogout() {
    const hold = gate();
    this.logoutGate = hold;
    this.gates.push(hold);
    return hold.release;
  }
  failNextSave(status: number | 'offline') {
    this.failSave = status;
  }
  rejectNextCode() {
    this.failVerify = true;
  }
  failNextList() {
    this.failList = true;
  }
  releaseAll() {
    this.gates.forEach((hold) => hold.release());
  }
  private error(route: Route, status: number, message: string) {
    return route.fulfill({ status, json: { error: { code: `TEST_${status}`, message } } });
  }
  async handle(route: Route) {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace(/^\/api/, '');
    const method = req.method();
    this.requests.push({ path, method });
    const body = req.postData() ? req.postDataJSON() : {};
    if (path.startsWith('/programs') || path.startsWith('/progress') || path === '/auth/logout') {
      if (!this.user || req.headers()['x-pseudostar-user'] !== this.user.id) {
        this.unexpected.push(`Incorrect account header: ${method} ${path}`);
        return this.error(route, 403, 'The account changed. Reload the page.');
      }
    }
    if (path === '/problems' && method === 'GET') return route.fulfill({ json: { problems: [] } });
    if (path === '/session' && method === 'GET')
      return route.fulfill({ json: { user: this.user } });
    if (path.startsWith('/auth/')) {
      this.authRequests.push({ path, body });
      if (path === '/auth/request-code' && method === 'POST') {
        this.email = body.email;
        return route.fulfill({ json: { challengeId: 'test-challenge' } });
      }
      if (path === '/auth/verify' && method === 'POST') {
        if (this.failVerify || body.code !== '123456' || body.challengeId !== 'test-challenge') {
          this.failVerify = false;
          return this.error(route, 400, 'That code is incorrect. Try again.');
        }
        this.user = { id: this.email === 'bob@example.test' ? 'bob' : 'alice', email: this.email };
        return route.fulfill({ json: { user: this.user } });
      }
      if (path === '/auth/logout' && method === 'POST') {
        if (this.logoutGate) await this.logoutGate.promise;
        this.user = null;
        return route.fulfill({ json: { ok: true } });
      }
    }
    if (!this.user) {
      this.unexpected.push(`Unauthenticated ${method} ${path}`);
      return this.error(route, 401, 'Sign in first.');
    }
    const owner = this.user.id;
    if (path === '/progress' && method === 'GET') {
      return route.fulfill({
        json: {
          progress: [...this.progress.entries()]
            .filter(([key]) => key.startsWith(owner + ':'))
            .map(([, value]) => value),
        },
      });
    }
    if (path.startsWith('/progress/') && method === 'PUT') {
      this.progress.set(`${owner}:${path.split('/')[2]}`, body);
      return route.fulfill({ json: { ok: true } });
    }
    if (path === '/programs' && method === 'GET') {
      if (this.failList) {
        this.failList = false;
        return this.error(route, 503, 'The program list is unavailable.');
      }
      const deleted = url.searchParams.get('deleted') === 'true';
      return route.fulfill({
        json: {
          programs: [...this.programs.values()]
            .filter(
              (value) => value.owner === owner && Boolean(value.program.deletedAt) === deleted,
            )
            .map(({ program: { draft: _, lastValidSource: __, ...metadata } }) => metadata),
        },
      });
    }
    const match = /^\/programs\/([^/]+)$/.exec(path);
    const restore = /^\/programs\/([^/]+)\/restore$/.exec(path);
    if ((match && method === 'DELETE') || (restore && method === 'POST')) {
      const entry = this.programs.get((match ?? restore)![1]);
      if (!entry || entry.owner !== owner) return this.error(route, 404, 'Program not found.');
      if (
        entry.program.revision !== body.expectedRevision ||
        Boolean(entry.program.deletedAt) !== Boolean(restore)
      ) {
        return this.error(route, 409, 'A newer revision exists. Reload the list.');
      }
      entry.program = {
        ...entry.program,
        revision: entry.program.revision + 1,
        deletedAt: restore ? null : Date.now(),
        updatedAt: Date.now(),
      };
      return restore
        ? route.fulfill({ json: { program: entry.program } })
        : route.fulfill({ status: 204 });
    }
    if (match && method === 'GET') {
      const entry = this.programs.get(match[1]);
      return entry?.owner === owner && !entry.program.deletedAt
        ? route.fulfill({ json: { program: entry.program } })
        : this.error(route, 404, 'Program not found.');
    }
    if ((path === '/programs' && method === 'POST') || (match && method === 'PUT')) {
      const failure = this.failSave,
        hold = this.nextGate;
      this.failSave = null;
      this.nextGate = null;
      this.saves.push({ owner, method, path, body: structuredClone(body) });
      this.activeSaves++;
      this.maxActiveSaves = Math.max(this.maxActiveSaves, this.activeSaves);
      try {
        if (hold) await hold.promise;
        if (failure === 'offline') return await route.abort('internetdisconnected');
        if (failure)
          return await this.error(
            route,
            failure,
            failure === 409
              ? 'A newer revision exists. Save a copy.'
              : 'The save service is unavailable.',
          );
        if (typeof body.title !== 'string' || body.title.length > 120)
          return await this.error(route, 400, 'Title must be at most 120 characters.');
        const previous = match ? this.programs.get(match[1]) : undefined;
        if (match && (previous?.owner !== owner || previous.program.deletedAt))
          return await this.error(route, 404, 'Program not found.');
        if (body.expectedRevision !== (previous?.program.revision ?? 0))
          return await this.error(route, 409, 'A newer revision exists. Save a copy.');
        const program: Program = {
          id: match?.[1] ?? `test-program-${++this.serial}`,
          title: body.title,
          draft: body.draft,
          problemId: body.problemId,
          lastValidSource: body.lastValidSource,
          revision: (previous?.program.revision ?? 0) + 1,
          updatedAt: Date.now(),
          deletedAt: null,
        };
        this.programs.set(program.id, { owner, program });
        return await route.fulfill({ json: { program }, status: method === 'POST' ? 201 : 200 });
      } finally {
        this.activeSaves--;
      }
    }
    this.unexpected.push(`${method} ${path}`);
    return this.error(route, 501, `No test fixture for ${method} ${path}`);
  }
}

export const test = base.extend<{ api: TestApi }>({
  api: [
    async ({ context, page }, use) => {
      const api = new TestApi(),
        errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await context.route('**/api/**', (route) => api.handle(route));
      await use(api);
      // Close before removing routes so a late autosave cannot reach the real API.
      await page.close();
      api.releaseAll();
      await context.unrouteAll({ behavior: 'ignoreErrors' });
      expect(api.unexpected, 'Every API request must have an explicit test fixture').toEqual([]);
      expect(errors, 'No uncaught browser errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
export const editor = (page: Page) => page.getByRole('textbox', { name: 'Pseudocode editor' });
export const saveStatus = (page: Page) => page.locator('.workspace-status').getByRole('status');
export async function guest(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a practice session without signing in' }).click();
  await expect(page.getByRole('textbox', { name: 'Program name' })).toBeVisible();
  if (!(await page.getByRole('textbox', { name: 'Program name' }).inputValue()))
    await page.getByRole('textbox', { name: 'Program name' }).fill('My first program');
}
export async function write(page: Page, source: string) {
  await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
  await editor(page).fill(source);
  await expect(editor(page)).toHaveText(source, { useInnerText: true });
}
export async function signIn(page: Page, email = 'alice@example.test') {
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('button', { name: 'Email me a code', exact: true }).click();
  await page.getByRole('textbox', { name: 'Sign-in code' }).fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  if (!(await page.getByRole('textbox', { name: 'Program name' }).inputValue()))
    await page.getByRole('textbox', { name: 'Program name' }).fill('My first program');
}
