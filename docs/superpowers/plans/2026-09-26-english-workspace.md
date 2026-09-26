# English Workspace Implementation Plan

> **For agentic workers:** Use executing-plans to implement task by task. The user has authorised execution in this checkout.

**Goal:** Ship the approved English workspace without changing ICT behavior.

**Architecture:** A small History API router selects distinct workspace components. English uses a shared typed exercise/attempt contract, D1 account storage, device guest storage, and validated Groq feedback. Existing authentication remains the trust boundary.

**Tech Stack:** React 19, TypeScript, Vite, Cloudflare Workers/D1, existing Groq endpoint, Vitest and Playwright. No new dependency.

## Global constraints

- Work on `feat/english-work`; preserve `codedb.snapshot` and ICT storage.
- Grades 8–10; original content, no official mark or predicted grade claims.
- Full-page tool routes, Option A visual direction, append-only revisions.
- Node 24; no deployment.

## Task 1: Shared learning contract and original content

Files: `code/src/english/model.ts`, `content.ts`, `curriculum.ts`; `code/tests/english/content.test.ts`.

- [x] Define Grade, ToolId, Exercise, Attempt, Revision, Feedback and Award types; export `tools` and `wordCount`.
- [x] Write coverage check: `expect(exercises.filter(e => e.grade === grade && e.tool === tool).length).toBeGreaterThanOrEqual(2)` for all seven starting tools and grades.
- [x] Create 42 original exercises with passages, a different worked example, response fields, criteria and grade-specific targets. Editing Lab selects saved attempts.
- [x] Run `npm test -- tests/english/content.test.ts`; check uniqueness, examples, passages and criteria.

## Task 2: Account attempts and AI

Files: `code/migrations/0006_english.sql`, `code/worker/english.ts`, `english-ai.ts`, `code/worker/index.ts`; `code/tests/worker/english.test.ts`.

- [x] Add profile, exercise, attempt, revision and award storage, with owner filters and unique award constraints.
- [x] Serve `/api/english/profile`, `/exercises`, `/attempts` beneath `/api/english`. GET lists return `{exercises}`, `{attempts}`; detail/mutation returns `{attempt}`; profile returns `{grade}`.
- [x] POST attempts accepts `{exerciseId, mode, parentId?}`; PUT attempt accepts `{expectedVersion,response,plan,stage,startedAt,assisted}`. POST `/:id/submit` accepts `{expectedVersion}`; POST `/:id/help` marks assistance. POST `/exercises` generates from `{grade,tool,skill?}`.
- [x] Save immutable submission before evaluation, reject stale versions, validate AI evidence, preserve failure with retry, and award 10/5 points once per exercise/version/kind.
- [x] Test `expect((await h.request('/api/english/attempts/'+foreignId,'GET',undefined,other.cookie)).status).toBe(404)` and duplicate submit/award, provider failure, and grade boundaries.
- [x] Run `npm run test:worker`.

## Task 3: Workspace routes and preservation

Files: `code/src/workspaces.tsx`, `code/src/app/App.tsx`; `code/tests/e2e/english.spec.ts`.

- [x] Add registry and History API location hook with explicit URL priority and popstate support.
- [x] Add shared switcher to ICT and English. Keep ICT mounted while hidden to preserve exact editor state; stop execution when hidden. Persist drafts using the existing document controller.
- [x] Lazy-load English so ICT does not load its screens. Preserve sign-in deep links and account remount boundaries.
- [x] Verify `await page.getByLabel('Workspace').selectOption('english')` then return to ICT with the prior draft intact.

## Task 4: English end-to-end screens and device recovery

Files: `code/src/english/EnglishWorkspace.tsx`, `AttemptPage.tsx`, `storage.ts`, `progress.ts`, `english.css`; tests under `code/tests/english/`.

- [x] Build grade entry, dashboard, tool library, exercise preparation, attempt flow, history and monthly progress routes from the shared contract.
- [x] Write guest attempts to versioned local storage. Account drafts use account/attempt-scoped recovery; reject stale saves, preserve failed work and support text download.
- [x] Implement response fields, helpful worked examples, coach hints, immutable submissions, revision comparison and fresh reassessment links. No exercise dialogs.
- [x] Timed stages use stored timestamps, preserve notes and response, and record overtime without automatic submission.
- [x] Show actual points and categorical skill evidence by grade/month/assistance; do not average ratings. Empty states have usable starting actions.
- [x] Run content/progress/storage tests and browser flows at desktop and narrow widths.

## Task 5: Integration, review and checks

Files: existing test harness and API documentation as needed; `code/worker/API.md`.

- [x] Review trust boundaries, async saves, account changes, stale evaluations, duplicate points and ICT regressions; fix findings.
- [x] Run Node 24 `npm run typecheck`, `npm test`, `npm run test:worker`, `npm run test:preflight`, `npm run build`, and `npm run test:e2e`.
- [x] Inspect English visually, click all controls, verify route reload/back behavior and narrow layouts. Recheck every applicable design rule.
- [x] Document migrations and AI configuration. Report changed areas and the remaining optional school curriculum mapping inputs. Do not deploy.

Validation: 416 unit tests, 55 Worker tests, 57 browser tests and 4 preflight tests passed. TypeScript, build and formatting checks passed. Migration 0006 applied locally. AI provider fixtures passed; live signed-in AI remains unverified. No deployment.
