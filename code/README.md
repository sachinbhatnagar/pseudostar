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

Set `APP_ORIGIN=http://127.0.0.1:5173` in local `.dev.vars`. Keep credentials outside source control.

```sh
npm run db:local
npm run build
npm run dev:api
```

Run `npm run dev` in a second terminal and open `http://127.0.0.1:5173`. The API script sets an explicit local upstream so the production custom domain does not affect local origin checks. If the Vite port changes, update the local origin and upstream together. Local Wrangler sends real email when given a real Resend key. Do not use `--remote` for local work.

## Current behavior

- Unnamed drafts stay in device recovery only. Save now asks for a name. Deleting the open program clears the editor without creating a copy.
- Opening a saved program asks for a different name, then updates that same entry. Explicit Save copy asks for an unused name.
- Active program names are unique per account and in the guest library. Migration `0002_unique_program_names.sql` retains old duplicates under distinct names. It is applied to the production database.
- Show Solution requires confirmation, then compares the current draft and reference in aligned columns. Use solution replaces the current draft only after a second confirmation.
- Signed-in learners can use Explain Pseudocode or right-click a block for Explain Purpose. Groq explains current code, using the current learner code and private reference context. Explanations describe existing code only; What's next for you? lists remaining requirements separately. The shared allowance is 200 explanations per account per UTC day. Failed provider requests return their allowance.
- The copyright link opens the Studio 8 Collective attribution.
- The top toolbar includes Save now and icons. Full screen retains the block picker and all editor modes.
- Incomplete block edits remain editable. Field validation waits for the edit to finish.

## Verified locally - 2026-09-06

- TypeScript checks and production build pass.
- 305 unit/content/editor/runner/recovery tests pass.
- 38 Worker/D1 integration tests pass with intercepted email and AI providers.
- 40 Chrome browser workflows pass with isolated API fixtures, including desktop, tablet, phone, keyboard and reduced motion.
- Four deployment-preflight tests pass. Worker bundling passes Wrangler dry-run.
- Storybook builds; four email frames and six sign-in interaction stories pass browser checks.
- The client bundle contains no private model-answer imports or server secret names.

The AI, comparison and attribution changes are deployed. Synthetic live Groq checks returned both explanation formats without revealing the reference answer in those samples. Model output is not a guarantee of correctness or secrecy; malformed responses fail safely and refund the allowance. Desktop and phone panels were reviewed locally.

Production is deployed at https://pseudostar.stacksauce.dev. Remote D1 migration, HTTPS, static security headers, the session endpoint and unauthenticated program access checks pass. Live email delivery and authenticated production flows remain unverified.

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

Follow [Cloudflare and Resend setup](docs/deployment.md). The checked-in configuration targets the dedicated production Worker and D1 database. Secrets remain outside source control.

```sh
node scripts/preflight.mjs --config-only
node scripts/preflight.mjs
```

Both commands are offline. The first checks config and source assets; the second also checks build files. Neither validates remote resources or secrets. After setup, `node scripts/deploy.mjs` checks config, builds, checks assets, shows Cloudflare identity and deploys. Remote migrations remain a separate operation.

Use `npm run fonts:setup`, `npm run deploy:preflight`, `npm run test:preflight`, and `npm run deploy` for these workflows. Build and postinstall do not change remote databases or secrets.

## Community problems

For a blank program, enter its title and detailed problem statement in **Your problem**.
Both fields save with the program. On mobile, use **Add or edit problem details**.
Create a program, sign in, then select **Publish** beside **Save**.
The saved statement is filled in for you.
Enter the problem statement, including its input, output, and limits. Select
**Check and publish**. AI rewrites the statement in ASD-STE100 style for Grade 8
and above, creates a title, and assigns Easy, Medium, or Hard difficulty.
Your pseudocode stays unchanged.

The server generates test cases from the statement and checks the program,
its block conversion, and a separate reference solution. Only programs that
pass all checks enter the shared library. Failed checks appear in the form.
There are 10 publication attempts per account per 24-hour rate window.
Repeating a successful submission returns the existing problem.

Open **Problems** to see shared problems beside the built-in problems.
Authors can select **Edit or delete** below their problem in the library.
Edits must pass the publication checks again. Delete requires confirmation.
Other users cannot edit or delete the problem.
Filter by difficulty. Language guidance is available in **Help**.

Use `SET count = LENGTH(items)` to store a function result, or `OUTPUT LENGTH(items)`
to show it. The **SET** block accepts a value or calculation. The **Function result**
block has fields for the result variable, function name, and inputs. Functions also
work in conditions, loop bounds, indexed assignments, and other function calls.
`SET count TO 3` formats as `SET count = 3`. Existing `count = 3` programs still work.
`SET seen = SET()` stores a new set; the statement keyword and collection function
have different roles. `CALL` discards a function result. Use it for collection changes.
The parser, runner, block conversion, lesson checks, and publication checks use the same
language implementation. These extensions follow PseudoStar's textbook conventions;
they do not claim conformance to every pseudocode dialect.
Function inputs are copied and function variables are local. Existing subroutines
continue to share their caller's variables.

The local database needs migration `0003_shared_problems.sql`; run `npm run db:local`.
Use `npm run dev` and `npm run dev:api` for local testing. Sign in with the normal email code.

Tests cover text/block conversion, bounded execution, original examples,
additional cases, and comparison against a separately generated reference.
Agreement is supporting evidence, not a correctness guarantee. Problems that fail
checks are not published. Linked nodes, custom records, heaps, and related problem
families remain [future scope](../docs/leetcode-import-scope.md).
