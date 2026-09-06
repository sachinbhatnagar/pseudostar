# Deployment setup

Run from `code/`. Credentials are supplied later. Remote commands below are not part of build or offline preflight.

## Cloudflare and D1

When authorized, sign in and inspect the account and existing databases:

```sh
node node_modules/wrangler/bin/wrangler.js login
node node_modules/wrangler/bin/wrangler.js whoami
node node_modules/wrangler/bin/wrangler.js d1 list
```

Select the intended account. Set its `account_id` in Wrangler config when more than one account is available. CI can use a Cloudflare API token scoped to that account with Worker deployment and D1 permissions. Keep it in CI secrets.

Create a dedicated database after checking existing resources:

```sh
node node_modules/wrangler/bin/wrangler.js d1 create pseudostar
```

Copy its UUID into `d1_databases[0].database_id`. Keep `binding` as `DB` and `migrations_dir` as `migrations`; use the selected database name. Do not reuse an unrelated application's database.

Choose the Worker name and hostname. A workers.dev origin is `https://<worker-name>.<account-subdomain>.workers.dev`; get the actual subdomain from Cloudflare. Set APP_ORIGIN to the exact public HTTPS origin, without a path or trailing slash. For a custom domain, configure the Worker domain and APP_ORIGIN together.

See [D1 creation and bindings](https://developers.cloudflare.com/d1/get-started/) and [migration commands](https://developers.cloudflare.com/d1/wrangler-commands/).

## Resend and secrets

Add a sending domain or subdomain in Resend. Add the DNS records it provides and wait for **Verified**. Do not replace unrelated mail records. See [domain setup](https://resend.com/docs/dashboard/domains/introduction).

Set RESEND_FROM to an address on that domain, with an optional PseudoStar display name. The Resend test sender is not suitable for public signup. Create an API key with sending access restricted to this domain. See [API key management](https://resend.com/docs/dashboard/api-keys/introduction).

Generate a distinct random secret of at least 32 bytes for OTP_HMAC_SECRET, using a password manager or another secure generator. Keep it stable across deployments: changing it invalidates outstanding codes and rate-limit identities.

Supply secrets through prompts, not config vars, VITE_* variables, Git or command arguments:

```sh
node node_modules/wrangler/bin/wrangler.js secret put RESEND_API_KEY
node node_modules/wrangler/bin/wrangler.js secret put OTP_HMAC_SECRET
node node_modules/wrangler/bin/wrangler.js secret list
```

These commands change remote configuration and can create or deploy a Worker version. Run only during authorized setup. Secret names prove presence, not correctness. See [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/). `.dev.vars` stays local and is not deployed.

## Migrate and deploy

First use an isolated preview Worker and D1 database for integration checks. Keep a separate config directly in `code/`, such as `wrangler.preview.jsonc`, with its own Worker name, database UUID, APP_ORIGIN and secrets. Pass the same `--config wrangler.preview.jsonc` to each Wrangler and deployment-script command. Scripts do not select named env sections.

For the configured production target:

```sh
node scripts/preflight.mjs --config-only
node node_modules/wrangler/bin/wrangler.js d1 info DB
node node_modules/wrangler/bin/wrangler.js d1 migrations list DB --remote
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --remote
node node_modules/wrangler/bin/wrangler.js d1 migrations list DB --remote
node scripts/deploy.mjs
```

Review database identity and pending SQL before applying. Never edit an applied migration. A Worker rollback does not roll back D1 data. Deployment stops if preflight or build fails. Direct Wrangler deployment bypasses this preflight.

## Static headers

`public/_headers` is copied to `dist/_headers` and applied by Cloudflare's static asset service. It does not replace API response headers. Vite dev/preview does not apply this file. See [Cloudflare static headers](https://developers.cloudflare.com/workers/static-assets/headers/).

The CSP permits same-origin scripts, API requests, local fonts and module workers. Inline styles are necessary for Blockly, CodeMirror and React positioning. Data images support Blockly SVG icons; the specific Blockly media host supports its default images. Audio is disabled in the current Blockly configuration. Scripts do not allow inline code or eval. Downloads use blob URLs, which do not require script or connection permission. Framing, objects and base URL changes are blocked. Storybook is a separate preview build and must not be served as the production app under this policy.

## Verification boundaries

Offline preflight checks placeholders, origin/sender shape, D1 UUID shape, bindings, API routing, cleanup configuration and asset presence. It does not inspect remote accounts, migrations, secrets, DNS or sender status.

After authorized deployment, verify static routes, JSON API errors, response headers, editor interactions, execution workers and the Secure/HttpOnly/SameSite cookie. With an authorized recipient, verify delivery, failed resend, replay, expiry, lockout and logout. Use two accounts for isolation, saved drafts, conflicts, delete and restore. Confirm scheduled cleanup separately. These live checks remain pending until credentials, a deployed target and an authorized recipient are available.

## Production deployment - 2026-09-06

- URL: https://pseudostar.stacksauce.dev
- Account: StackSauce (`d6f2d5fb08dc097f9e37271271a73bb5`).
- Worker: `pseudostar`. Version: `e5f862f9-900d-4aae-baa6-bd483002f31a`.
- D1: `pseudostar` (`6212c179-9dfd-48f0-bdac-2af397e82d0b`), APAC. `0001_initial.sql` applied; no pending migrations.
- Sender: `PseudoStar <login@pseudostar.stacksauce.dev>`. DKIM, SPF and sending MX records resolve. The supplied Resend key is send-only and cannot report domain verification status.
- `RESEND_API_KEY` and `OTP_HMAC_SECRET` uploaded as Worker secrets. Local `.dev.vars` retains the local development origin.
- Custom domain and TLS active; workers.dev and preview URLs disabled. Cleanup trigger: `17 3 * * *` UTC.
- Live HTTPS, CSP, session response and unauthenticated program rejection verified. Actual email delivery, authenticated production flows and scheduled cleanup execution remain to be verified. No test emails were sent.

All 28 Chrome browser workflows passed against the deployed assets and CSP. These checks intercept authentication and persistence APIs; they do not prove live email or cloud-save behavior.

## Reviewed update - 2026-09-06

Worker version: `406c48b7-b204-42da-bfde-b6f6dee26962`. Includes block-edit validation, unique names, confirmed solutions, full-screen editing and deletion without automatic copies. Unnamed drafts stay outside My Programs until named.

Migration `0002_unique_program_names.sql` is applied remotely. The pre-migration D1 recovery bookmark is `00000007-0000005a-000050de-d0c54fcffa22413300cbb2563af4558d`. Existing duplicate programs retain their data under distinct names. No program was deleted by this migration. A database restore must be considered separately from a Worker rollback because it can discard later writes.

Production session, unauthenticated program access and the confirmed-solution endpoint were checked without sending email.

All 35 browser workflows passed against this production version. Authentication and persistence calls in those tests use fixtures; the live API checks above are separate. No email was sent during deployment verification.

## AI update - 2026-09-06

Worker version: `aab362e7-36b6-4438-82ad-60f29677b496`. The comparison view, attribution and AI explanations are deployed. `GROQ_API_KEY` was uploaded as a Worker secret. `.dev.vars` was not uploaded. No database migration was required. The existing rate-limit table stores the shared 200-per-account daily allowance.

Live HTTPS, CSP, session response and unauthenticated AI rejection pass. Synthetic Groq calls were checked locally. Authenticated AI requests through the production Worker remain unverified; no email was sent.

All 39 browser workflows pass against the deployed assets and CSP. Their authentication, persistence and AI calls use fixtures; they do not prove authenticated production API behavior.
