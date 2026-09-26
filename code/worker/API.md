# Worker API

All timestamps are Unix milliseconds. Requests use the configured application origin. Mutations require an exact Origin match. JSON errors have `{error:{code,message,...details}}`. API responses use `Cache-Control: no-store`. No API route falls back to the SPA.

## Authentication

- `POST /api/auth/request-code {email}` returns `200 {challengeId}` after Resend accepts delivery. Email is trimmed and lowercased. Delivery failure returns `503 SEND_FAILED`. Rate limits return `429 RATE_LIMITED`. Account existence does not affect the response.
- `POST /api/auth/verify {challengeId,code}` returns `200 {user:{id,email}}` with a session cookie. Code is a six-character string. Rejected codes return `400 CODE_REJECTED`.
- `GET /api/session` returns `{user:{id,email}|null}`.
- `POST /api/auth/logout` returns `204` and clears/revokes the cookie.

HTTPS uses `__Host-pseudostar`, Secure, HttpOnly, SameSite=Lax, Path=/, and a 30-day Max-Age. Local HTTP uses `pseudostar`. Tokens have 256 bits of randomness; D1 stores SHA-256 digests. OTP digests and rate identities use HMAC-SHA-256. Verification, account creation, and session creation share an atomic D1 batch.

The six-digit code expires after ten minutes and locks after five incorrect attempts. Resend cooldown: 60 seconds. Send limits: five/email/hour and twenty/IP/hour. Verification limits: 100/IP/hour and twenty/challenge/ten minutes. Counters use rolling windows from their first request and atomic conditional upserts. Production IP identity uses Cloudflare's edge-provided CF-Connecting-IP. Serve the Worker through Cloudflare; do not add a proxy that accepts an untrusted replacement for this header.

## Programs

All routes require a session and constrain the owner. Other owners receive 404. A full program contains `{id,title,problemId,draft,lastValidSource,workspace,formatVersion,revision,updatedAt,deletedAt}`. Nullable fields are explicit. Format version is 1. Initial revision is 1.

- `GET /api/programs` returns `{programs:[{id,title,problemId,revision,updatedAt,deletedAt}]}`. Add `?deleted=true` for recoverable deleted programs.
- `POST /api/programs {title,problemId?,draft,workspace?,lastValidSource?}` returns `201 {program}`. Duplicate by creating a new program from the loaded document.
- `GET /api/programs/:id` returns `{program}`.
- `PUT /api/programs/:id {expectedRevision,title,draft,workspace?,problemId?,lastValidSource?}` returns `{program}`. Omitted optional values remain unchanged; explicit null clears them. A stale revision returns `409` with `error.currentRevision` and `error.program`.
- `DELETE /api/programs/:id {expectedRevision}` returns `204` and increments the revision.
- `POST /api/programs/:id/restore {expectedRevision}` returns `{program}` and increments the revision. Recovery expires after 30 days. Both mutations require the current revision. Stale revisions, replayed requests, and invalid state transitions return 409 with error.currentRevision and error.program. Missing, foreign-owned, and expired deleted programs return 404.

Draft and lastValidSource are raw text, each limited to 200 KiB. Workspace is a JSON string limited to 1 MiB and 5000 nested objects/arrays. Invalid drafts remain storable. The complete JSON request is bounded at 1,500,000 bytes. Title is bounded at 120 characters/bytes. Unsupported formatVersion returns 422. Daily scheduled cleanup removes expired sessions, old challenges/counters, and programs deleted at least 30 days ago.

## Progress

- `GET /api/progress` returns `{progress:[{problemId,contentVersion,status,highestHintViewed,lastCheckedAt}]}`.
- `PUT /api/progress/:problemId {contentVersion,status,highestHintViewed?}` returns `{progress}`. Content version is a positive integer. Status is `started` or `passed`; hint is 0–3, default 0. Passing status and highest hint do not regress within one content version. A newer content version resets them. Older-version writes return 409.

Progress records learner-reported checks. It is not server-verified certification.

## Local checks and handoff

Use Node 24.19.0 or a supported LTS version. Runtime dependencies: react, react-dom, react-email. Dev dependencies: wrangler, @cloudflare/workers-types, vitest, miniflare, esbuild, storybook, @storybook/react-vite, @types/node; playwright for the optional browser check. The harness uses the installed Miniflare 5 alpha compatibility adapter `convertV4MiniflareOptions`.

Commands, run from code/:

```sh
node node_modules/typescript/bin/tsc -p worker/tsconfig.json
node node_modules/vitest/vitest.mjs run --config tests/worker/vitest.config.ts
node node_modules/storybook/dist/bin/dispatcher.js build --output-dir .storybook/build --disable-telemetry
PLAYWRIGHT_CHANNEL=chrome node tests/emails/storybook.browser.mjs
```

Tests run the bundled production Worker in Miniflare with real local D1. Outbound Resend and Groq HTTP are intercepted. They need local loopback access. No test sends email or deploys. The migration is tested on fresh and populated local D1 databases.

Coordinator must add package scripts and wire program autosave and progress. SignIn exports the AuthForm presentation used by six auth-state stories under src/auth/. Browser checks run their interaction assertions without sending email. Keep generated .storybook/build and screenshots out of commits.

Before external acceptance: confirm Cloudflare account and D1 identity; replace Wrangler placeholders; apply migration; supply APP_ORIGIN and a verified RESEND_FROM; set RESEND_API_KEY and a random OTP_HMAC_SECRET through Wrangler secrets. Deploy only with authorization. Verify delivery to the authorized recipient, cookie behavior, and two-account isolation on the deployed origin. No live resource, credential, or delivery verification is claimed here.

## Confirmed solutions

`POST /api/problems/:id/solution` accepts `{ "confirmed": true }` and returns `{ "source": "..." }`. Guests can use it. The same-origin check applies. Missing confirmation returns 400; an unknown problem returns 404. The UI asks before making this request and keeps the current draft unchanged.

Active program names must be unique for each owner. Create, rename and restore return 409 `NAME_TAKEN` on a duplicate. Renaming updates the existing program ID and revision.

## AI explanations

`POST /api/explanations` requires a session and exact Origin. If `X-Pseudostar-User` is supplied, it must match the session; the app supplies it on each request. Send `{kind: "block" | "program", source, block?, problemId?}`. Source is limited to 24,000 characters/bytes; the selected block is limited to 12,000 and must occur in source. Unknown problems return 400. The Worker adds the authoritative problem statement. The Worker also sends the authoritative reference privately; client-supplied references are ignored.

The result is `{paragraph, steps, nextSteps, remaining, resetsAt}`. Block explanations have no steps. Program explanations have ordered steps. Both use Groq `openai/gpt-oss-120b`, with internal reasoning excluded. The instructor prompt explains current code, uses simple language and prohibits reference disclosure or completion of missing code. The model connects selected blocks to earlier values and existing later instructions. Explanations remain limited to existing learner code. The separate nextSteps array contains up to 12 short pending requirements based on the reference. Equivalent approaches are allowed. Free practice has an empty checklist; an empty checklist never marks a challenge passed. These are model instructions, not a formal output guarantee. The model receives code and lesson context, but no account email or identifier. Responses render as plain text.

Both modes share 200 requests per account per UTC day. An atomic D1 counter prevents concurrent requests from exceeding the allowance. The next allowance starts at midnight UTC. Limit errors return 429 `AI_DAILY_LIMIT`. Missing configuration, provider failures, invalid output and timeouts return 503 `AI_UNAVAILABLE`. One retry is allowed within a shared 25-second deadline. Both attempts use one allowance. Failed attempts release the reserved count when neither produces valid output. Extra steps returned for block requests are discarded. Closing a completed or in-flight explanation does not necessarily undo a successful request.

Set `GROQ_API_KEY` in local `.dev.vars` or a Worker secret. Never use a `VITE_` variable for this key. No new migration is required.

## English workspace

Apply `migrations/0006_english.sql` before serving English account requests. These additive tables do not change ICT programs or progress. English uses the existing `GROQ_API_KEY`, model, account session, origin check, and `X-Pseudostar-User` guard. English AI requests share the 200-per-day account allowance with ICT explanations; failed provider requests refund usage. Each request permits two provider calls within 25 seconds.

All `/api/english/*` routes require sign-in. Curated guest practice uses device storage.

- `GET /profile`: `{grade: 8|9|10|null}`. `PUT /profile` accepts `{grade}`.
- `GET /exercises`: account-generated `{exercises,nextBefore}`. `POST /exercises` accepts `{grade,tool,skill?}` and returns `{exercise}`. Editing Lab does not generate a new exercise. Invalid provider content is not stored.
- `GET /attempts`: `{attempts,awards,nextBefore}`. Attempt lists return up to 10 rows with full revision history; exercise lists return up to 100 rows. Pass the opaque `nextBefore` as `?before=` for the next page. Awards belong to the attempts on that page. Merge pages for full history and progress.
- `POST /attempts`: `{exerciseId,mode:'practice'|'independent',parentId?}` returns `{attempt}`. IDs and immutable exercise snapshots come from the server. A parent must belong to the account. A fresh follow-up uses a different exercise and does not copy its parent response or assistance; a same-exercise revision can copy them.
- `GET /attempts/:id`: `{attempt}` with all saved revisions.
- `PUT /attempts/:id`: `{expectedVersion,response,plan,stage,startedAt,assisted}` returns `{attempt}`. Stage is `plan`, `write`, or `proofread`. The first timer start is retained. Assistance cannot be removed. The server ignores client history and snapshot fields.
- `POST /attempts/:id/submit`: `{expectedVersion}` saves the response before AI and returns `{attempt}`. A failed evaluation has `revision.error`; retry the returned version. Unchanged retries reuse the same revision. A successful unchanged submission makes no provider request.
- `POST /attempts/:id/help`: `{expectedVersion}` saves assistance before AI and returns `{attempt,hint,error?}`. An empty hint with `error` means help failed; assistance remains recorded.

Draft writes and submission claims use atomic version checks. Conflicts return `409 VERSION_CONFLICT`. Evaluation claims expire after 45 seconds so a terminated request can be retried; late results cannot overwrite a new claim. Revisions preserve submitted text, timing, assistance and rubric version. Only evaluation fields are filled after submission. Attempts permit up to 100 revisions; start another attempt after that limit. Unique account/exercise/version/kind constraints prevent duplicate 10-point completion and 5-point revision awards. A revision award requires changed response text, validated evaluator improvement, and new quoted evidence in an assessed criterion. Provider fixtures verify application behavior, not educational validity.

English assessment rubric v2 adds an integer `score` from 0 to 4 to each criterion rating: 0 means no relevant evidence, 1 limited, 2 developing, 3 secure, and 4 strong. Each criterion has equal weight. The app calculates the total out of 100 from these marks; it does not accept a separate model-generated total. New evaluations require valid marks, consistent rating labels and evidence. Scores remain attached to each immutable submission, with its grade, rubric version and assistance flag. These are PseudoStar assessment scores, not official Cambridge marks or predicted grades. Earlier successful feedback without marks remains unscored; only a new submission receives scores. A failed older evaluation can be retried with rubric v2.
