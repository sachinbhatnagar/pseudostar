# PseudoStar

Pseudocode practice with Blockly and text editors, a browser execution engine, problems, email sign-in and saved programs. See the [release spec](../docs/superpowers/specs/2026-09-06-pseudostar-design.md). Local implementation does not prove a working deployment.

## Build without credentials

Run from `code/`. Use Node 24 LTS, npm and `unzip`.

```sh
npm ci
node scripts/setup-fonts.mjs
npm run build
node node_modules/typescript/bin/tsc -p worker/tsconfig.json
node --test scripts/preflight.test.mjs
```

Font setup downloads from Fontshare and stops if its licence changes. No Cloudflare or Resend credentials are needed. See [font usage](public/fonts/README.md).

## Architecture

| Path            | Purpose                                                                       |
| --------------- | ----------------------------------------------------------------------------- |
| `src/`          | React UI, Blockly, text editor, drafts, language and browser workers          |
| `worker/`       | Same-origin API, OTP, sessions, programs, progress and cleanup                |
| `migrations/`   | D1 schema for users, challenges, sessions, programs, progress and rate limits |
| `emails/`       | React Email HTML/plain-text renderer                                          |
| `.storybook/`   | Component and email previews                                                  |
| `tests/worker/` | Production Worker in Miniflare, local D1 and intercepted Resend transport     |
| `dist/`         | Vite assets served by the Worker's ASSETS binding                             |

One Worker serves assets and API. D1 stores accounts and programs. Resend delivers codes. API mutations require the configured origin. HTTPS sessions use a Secure, HttpOnly cookie. Scheduled cleanup removes expired records and programs deleted more than 30 days ago. See [API contracts](worker/API.md).

Guest sessions keep a separate local program library, including delete and restore. Signed-in accounts save to D1 and keep a local recovery draft. Invalid source and the last valid source are retained. Source text is canonical; saved programs rebuild their block layout from that source.

## Local development

```sh
cp .dev.vars.example .dev.vars
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local
npm run build
node node_modules/wrangler/bin/wrangler.js dev --ip 127.0.0.1 --port 8787 --var APP_ORIGIN:http://127.0.0.1:8787
```

Open `http://127.0.0.1:8787`. Keep the origin exact: localhost and 127.0.0.1 differ. Without secrets, sign-in cannot complete. Leave the Resend key empty until delivery is authorized. Local Wrangler can send real email if given a real key.

For hot reload, run `npm run dev` in a second terminal and restart Wrangler with `--var APP_ORIGIN:http://127.0.0.1:5173`. Open that exact Vite origin. The Vite proxy sends `/api` to port 8787. If Vite's port changes, update APP_ORIGIN too. Do not use `--remote` for local work.

## Verified locally - 2026-09-06

- TypeScript checks and production build pass.
- 300 unit/content/editor/runner/recovery tests pass.
- 23 Worker/D1 integration tests pass with intercepted email delivery.
- 28 Chrome browser workflows pass with isolated API fixtures, including desktop, tablet, phone, keyboard and reduced motion.
- Four deployment-preflight tests pass. Worker bundling passes Wrangler dry-run.
- Storybook builds; four email frames and six sign-in interaction stories pass browser checks.
- The client bundle contains no private model-answer imports or server secret names.

Live Resend delivery, remote D1, Cloudflare deployment and production smoke tests remain unverified until credentials are supplied.

## Checks

```sh
npm run typecheck
npm test
npm run test:preflight
npm run test:worker
npm run build-storybook
PLAYWRIGHT_CHANNEL=chrome node tests/emails/storybook.browser.mjs
```

Run `npm run test:e2e` with the Vite server on port 5173. Install Chromium with `npm exec playwright install chromium` if it is not present, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed browser. These browser tests use isolated API fixtures; the Worker suite separately exercises D1 and authentication.

Worker tests require loopback access. Their Resend transport is intercepted: no email or deployment. Browser checks require the selected browser. Email previews do not verify delivery. Review failures before release; build success does not test isolation, autosave or two-tab conflicts.

## Deployment

Follow [Cloudflare and Resend setup](docs/deployment.md) when credentials are available. Config placeholders deliberately prevent preflight from passing.

```sh
node scripts/preflight.mjs --config-only
node scripts/preflight.mjs
```

Both commands are offline. The first checks config and source assets; the second also checks build files. Neither validates remote resources or secrets. After setup, `node scripts/deploy.mjs` checks config, builds, checks assets, shows Cloudflare identity and deploys. Remote migrations remain a separate operation.

Use `npm run fonts:setup`, `npm run deploy:preflight`, `npm run test:preflight`, and `npm run deploy` for these workflows. Build and postinstall do not change remote databases or secrets.
