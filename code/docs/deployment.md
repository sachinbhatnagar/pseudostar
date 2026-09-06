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
