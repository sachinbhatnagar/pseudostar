# LeetCode import implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add checked community problems, advanced pseudocode and blocks, and admin review.

**Architecture:** Extend the current parser and generator-based interpreter. Keep bundled lessons and merge checked database entries into the existing list. Store candidate and published revisions separately; all mutations use server permissions and revision checks.

**Tech Stack:** TypeScript, React, Blockly 13, Cloudflare Workers and D1, Groq gpt-oss-120b, Vitest, Playwright. Use installed dependencies and Node 24.

**Spec:** `docs/superpowers/specs/2026-09-09-leetcode-import-design.md`

## Global constraints

- Build on `feat/leetcode-import`; local migrations and local servers only.
- Grade 8 language, progressive hints, explicit solution reveal.
- Original or licensed statements with reference links; no scraping.
- One-based indexing; source-required zero-based results must be explained explicitly.
- Existing programs, subroutines, scalar input, and lesson output matching remain compatible.
- No generated host-language execution. Bound interpreter work and memory.

## Task 1: Advanced language and runnable checks

**Files:** `code/src/language/{types,parse-expression,parse,machine,format}.ts`, new `code/src/language/collections.ts`, `code/tests/language/advanced.test.ts`.

**Interfaces:** Keep `parse(source)`, `format(program)`, `createMachine(program, limits)`, and `run(source, inputs, limits)`. Add a recursive `Value` union for scalars, lists, maps, and sets. Function calls evaluate through the existing event generator so stepping and input work in functions.

- [x] Add failing tests for list indexing, matrices, WHILE, recursive factorial, local scope, maps/sets, string operations, invalid indexes, and limits.

```ts
expect(run('a = [4, 7]\nOUTPUT a[2]', []).output).toEqual(['7']);
expect(run('a = [4]\nOUTPUT a[0]', []).error?.code).toBe('INVALID_INDEX');
```

- [x] Run `npm run test:language` with Node 24; confirm new cases fail.
- [x] Add list literals and call/index expressions. Parse `WHILE condition ... ENDWHILE`, `FUNCTION name(a, b) ... END FUNCTION`, `RETURN expression`, indexed assignments, and `CALL name(args)`.
- [x] Implement value-copy function arguments and local scope. Keep legacy subroutines in caller scope. Builtins: LENGTH, APPEND, REMOVE, SLICE, MAP, SET, GET, PUT, HAS, ADD, KEYS, VALUES, NUMBER, TEXT, FLOOR, ABS, MIN, MAX. APPEND/PUT/ADD/REMOVE mutate their collection; use CALL for discarded return values. Add `INPUT JSON name` for structured values without changing scalar INPUT.
- [x] Enforce total value size, nesting, expression work, function depth, output, and instruction limits. Collection keys are scalars; use Map/Set rather than object properties.
- [x] Run language tests and typecheck; fix regressions before proceeding.

## Task 2: Blocks and learner reference

**Files:** `code/src/editor/{blocks,text-language}.ts`, `code/tests/editor/blocks.test.ts`, new `code/src/learning/advanced-reference.ts`.

**Interfaces:** Preserve `programToWorkspace(program, ws)` and `sourceFor(ws)`. Extend existing expression fields for collections. Add structural blocks for WHILE, FUNCTION, RETURN, and CALL.

- [x] Add a block round-trip test using a recursive function and indexed list assignment.

```ts
const parsed = parse(source);
if (!parsed.ok) throw new Error('Fixture must parse');
programToWorkspace(parsed.program, ws);
expect(run(sourceFor(ws), []).output).toEqual(run(source, []).output);
```

- [x] Add block definitions, serialization, source output, and palette entries together. Reuse the current block styles.
- [x] Add short examples and builtin descriptions to the learner help; update highlighting.
- [x] Run editor and language tests plus typecheck.

## Task 3: Shared storage, permissions, and review

**Files:** new `code/migrations/0003_shared_problems.sql`, `code/worker/shared-problems.ts`, `code/src/problems/shared.ts`, `code/tests/worker/shared-problems.test.ts`; modify `code/worker/{index,explanations,progress}.ts` and `code/src/problems/{types,check}.ts`.

**Interfaces:** `GET /api/problems` returns visible checked problems; `GET/POST /api/imports`, `GET/PUT /api/imports/:id`, `POST /api/imports/:id/generate`, `POST /api/imports/:id/review`. JSON candidates include `problem`, `solution`, and `explanation`. Review requests include `revision`, `action`, and `reason`. Solutions use the existing confirmed-reveal route.

- [x] Test URL canonicalization and duplicate reservation. Normalize description/solutions subpages to the same slug; reject credentials, ports, non-HTTPS, and unrelated hosts.
- [x] Add source-unique rows with candidate JSON, published JSON, revision, status, owner, validation, attempt lease, and review log. Keep rejected rows reusable by their owner.
- [x] Use a trusted verified session email for the initial admin. Check owner/admin permissions on every draft route. Keep the existing account-change guard.
- [x] Add exact matching for new problem cases; preserve legacy matching. Use published or checked owner-visible content for solution reveal and AI feedback.
- [x] Test ordinary-user review denial, private drafts, stale reviews, simultaneous inserts, and old published revision preservation.

## Task 4: AI generation and validation

**Files:** new `code/worker/import-generation.ts`, `code/worker/import-validation.ts`, `code/tests/worker/import-generation.test.ts`.

**Interfaces:** `generateImport(env, source)` returns a structured candidate. `validateCandidate(candidate)` parses, formats, and executes bounded cases and independent-reference comparisons. Generation route claims a timed attempt with conditional SQL; late results cannot overwrite edits.

- [x] Test malformed results, wrong examples, independent-reference disagreement, and incomplete generation.
- [x] Use the existing model with internal reasoning and a strict JSON schema. Generate candidate and independent reference in separate requests. Provide source data as untrusted JSON. Do not return private reasoning.
- [x] Use explicit request deadlines and persisted leases. Limit daily generation attempts; retries require a new explicit request and cannot accumulate active work for one row.
- [x] Validate field counts/sizes, parse and format stability, source sample coverage, exact outputs, and comparison cases. Failed checks disable practice and publication.
- [x] Run worker tests and a local provider check if configured. Report unavailable external checks explicitly.

## Task 5: Library filters and contributor/admin UI

**Files:** new `code/src/problems/ImportPanel.tsx`, `code/src/problems/imports.css`; modify `code/src/app/App.tsx`, `code/src/programs/api.ts`, and `code/src/problems/shared.ts`.

**Interfaces:** `ImportPanel` receives the signed-in user, an on-refresh callback, and a practice callback. Fetch all rows with the existing API wrapper and account header. The shared list combines bundled and visible database problems.

- [x] Add topic filtering for both sources, reference links, prerequisites, and draft labels.
- [x] Add original/licensed statement entry with examples and constraints, persisted draft editing, generation/retry status, and private practice.
- [x] Add admin queue, statement/solution editing, validation results, regenerate, approve, reject with reason, and a real block preview.
- [x] Use existing dialog primitives; disable conflicting actions while requests run and ignore stale responses on selection changes.
- [x] Test browser controls, keyboard focus, small screens, empty/error states, and the full review flow.

## Task 6: Local delivery

**Files:** update `code/README.md`, scope note, and this checklist.

- [x] Run typecheck, language/editor/problem tests, Worker tests, and production build with Node 24.
- [x] Apply only local D1 migrations. Start local API and frontend.
- [x] Use isolated local test users for automation. Do not bypass production authentication or send unsolicited email.
- [x] Verify actual text/block conversion in the browser and perform the supplied design-law review.
- [x] Commit scoped changes, preserving unrelated `codedb.snapshot`. Provide local URLs and any remaining external verification limits. Do not deploy.

## Delivery evidence

- Node 24 typecheck and build pass.
- 317 app checks, 41 Worker checks, and 42 browser checks pass.
- One original running-total exercise passed 37 real-provider validation checks.
- Local migration applied; frontend at http://127.0.0.1:5173 and API at http://127.0.0.1:8787.
- Model-generated starter templates were unreliable. Generation now uses an empty valid starter; reviewers can edit it.
- Source access was removed by user decision. No LeetCode content was fetched.
- Browser tests use isolated Worker databases and intercepted AI responses; the provider check is separate.
- No remote database migration, push, merge, or deployment.
