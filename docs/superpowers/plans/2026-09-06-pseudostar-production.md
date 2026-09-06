# PseudoStar Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete production pseudocode learning application, including all requested features and a verified Cloudflare deployment.

**Architecture:** React and Blockly share a typed program model with a text parser and formatter. A bounded interpreter runs in a browser Web Worker. Cloudflare Workers, D1, Resend, and React Email provide private program storage and public email OTP accounts.

**Tech Stack:** Node 24 LTS, TypeScript, React, Vite, Blockly, CodeMirror 6, Vitest, Playwright, Cloudflare Workers/D1/Wrangler, React Email, Resend, Storybook React/Vite, and accessible React primitives where needed.

**Spec:** `docs/superpowers/specs/2026-09-06-pseudostar-design.md`

## Build status - 2026-09-06

The application is implemented under `code/`. The build consolidates several planned modules. Source text is the saved program format; Blockly layout is rebuilt from it. Local checks cover the language, all reference programs, 60 challenges, editor history, execution workers, private accounts, local/cloud recovery, and email rendering. The release checklist records verification outcomes; task checkboxes remain the original work breakdown, not a release claim.

The user deferred credentials and live deployment: "I will, just build it out for now." No real email or Cloudflare deployment is claimed.

## Global constraints

- Deliver the complete production application, not a prototype or MVP.
- All application source, migrations, tests, email templates, and deployment configuration live in `code/`.
- Preserve the corrected references and their dialect. Do not substitute assignment arrows, DECLARE statements, or a different exam-board syntax.
- Both blocks and directly editable pseudocode are required.
- Publish 60 verified problems: 20 Easy, 20 Medium, 20 Hard.
- Load incomplete starters with three progressive hints. Do not expose internal completed answers through the UI or public API.
- Signup is open to anyone who verifies their email. Use Resend, React Email, and Storybook.
- Use Cloudflare Workers and D1. Verify the selected account before creating resources.
- Secrets remain in local secret configuration and Worker secrets, never in source, client bundles, logs, or Storybook stories.
- Preserve user drafts, including invalid text, through errors and network failures.
- No feature flags or temporary release modes are needed for the requested features.
- Current partial code is a starting point. Its temporary labels, read-only source view, single exercise, and local-only persistence do not satisfy release acceptance.
- Use short, direct language for help and errors; apply Impeccable and the user's anti-slop rules to every production surface.

## Execution method

Follow the tasks in dependency order. Within each task, write the stated behaviour tests first, run them to confirm the expected failure, implement the named module, then run the focused checks. Use independently reviewed slices for the language engine, editor, content, and account services. These are work units inside one complete production delivery, not separate reduced-scope releases.

The root currently has no Git repository. Initialise the project repository before implementation commits, add exclusions for secrets, dependencies, build outputs, local D1 state, and browser artifacts, and inspect the staged file list before each commit. Do not publish a repository without a user request.

## File map

| Path under code/      | Responsibility                                                  |
| --------------------- | --------------------------------------------------------------- |
| `src/app/`            | Routes, application shell, shared providers, accessible layouts |
| `src/language/`       | Types, tokenizer, parser, formatter, diagnostics, interpreter   |
| `src/editor/`         | Blockly blocks/adapters, CodeMirror, synchronization/history    |
| `src/runner/`         | Worker protocol, run controller, input/output/variable panels   |
| `src/problems/`       | Public problem data, filters, starters, hints, checks           |
| `internal/solutions/` | Model answers imported only by validation scripts/tests         |
| `src/programs/`       | Program list, persistence client, local recovery, conflict UI   |
| `src/auth/`           | Email form, code entry, session state, sign-out                 |
| `src/ui/`             | Reusable accessible controls and design tokens                  |
| `worker/`             | API routing, bindings, authentication, data access, validation  |
| `emails/`             | React Email shell, OTP template, HTML/text renderer             |
| `.storybook/`         | Storybook configuration                                         |
| `migrations/`         | D1 schema migrations                                            |
| `tests/`              | Unit, integration, content, browser, and release checks         |
| `scripts/`            | Reference extraction, content validation, release checks        |
| `public/fonts/`       | Licensed self-hosted type and license files                     |

Do not keep the current large `main.tsx` as the application architecture. Move its useful block styles and behaviour into the named editor modules as their production replacements are built.

## Task 1: Language model and reference fixtures

**Files:** create `src/language/types.ts`, `src/language/diagnostics.ts`, `scripts/read-references.ts`, `tests/language/references.test.ts`; configure Vitest and Node 24 scripts in `package.json`.

**Interfaces:** define the shared AST and parse result before parallel work. Each statement carries an ID and source range. Expressions use literal, name, unary, or binary nodes. Statements cover input, output, assignment, selection branches, counted loops, sub-routine definition, and call.

```ts
export type Scalar = number | string | boolean;
export type SourceRange = {
  start: number;
  end: number;
  line: number;
  column: number;
};
export type Diagnostic = {
  code: string;
  message: string;
  nextAction: string;
  range?: SourceRange;
  nodeId?: string;
};
export type ParseResult =
  { ok: true; program: Program } | { ok: false; diagnostics: Diagnostic[] };
export type Program = { version: 1; statements: Statement[] };
```

- [ ] Define `Expr`, `Statement`, and their discriminated variants in `types.ts`. Preserve `OUTPUT`/`PRINT`, equality spelling, loop form, and THEN placement as typed metadata. Use source ranges for expressions as well as statements.
- [ ] Extract text strictly between each reference file's prettier-ignore markers. Reject missing or duplicate markers rather than silently including prose.
- [ ] Write and run the fixture check:

```ts
expect(readReferences("../../references")).toHaveLength(20);
expect(
  readReferences("../../references").every((x) => x.source.trim().length > 0),
).toBe(true);
```

- [ ] Add `typecheck`, `test`, and `test:language` scripts. Run typecheck and the fixture tests, then commit this independently testable foundation.

## Task 2: Parser and formatter for the complete reference dialect

**Files:** create `src/language/tokenize.ts`, `parse-expression.ts`, `parse.ts`, `format.ts`, `tests/language/parse.test.ts`, `roundtrip.test.ts`.

**Interfaces:** `parse(source: string): ParseResult`; `format(program: Program): { source: string; ranges: Map<string, SourceRange> }`. The formatter returns a fresh node-to-source map.

- [ ] Write tests for all 20 references plus malformed strings, missing ENDIF, mismatched NEXT, unknown syntax, empty branches, and ambiguous chained comparisons.

```ts
expect(
  parse("INPUT number\nIF number >= 1 THEN\nOUTPUT number\nENDIF").ok,
).toBe(true);
expect(parse("IF number >= 1 THEN\nOUTPUT number").ok).toBe(false);
for (const fixture of references) {
  const first = parse(fixture.source);
  expect(first.ok, fixture.id).toBe(true);
  if (first.ok) expect(parse(format(first.program).source).ok).toBe(true);
}
```

- [ ] Implement tokenization without evaluating source. Preserve strings, newline positions, indentation, operators, and numeric literals.
- [ ] Implement precedence parsing for the operators in the spec. Assignment is a statement context; equality inside conditions never mutates state.
- [ ] Implement explicit-block and indentation-block parsing. Track the loop form on each node so RANGE exclusive bounds cannot turn into inclusive TO bounds during a round trip.
- [ ] Implement four-space formatting with dialect metadata. Test semantic round trips after stripping transient IDs/ranges; assert exact keyword and loop-form preservation separately.
- [ ] Run `npm run test:language` and typecheck. Commit only after every reference parses and reformats successfully.

## Task 3: Bounded interpreter and reference correctness

**Files:** create `src/language/evaluate.ts`, `machine.ts`, `limits.ts`, `tests/language/execute.test.ts`, `reference-results.test.ts`.

**Interfaces:** `createMachine(program: Program, limits?: RunLimits): Machine`; `Machine.advance(input?: string): MachineEvent`. Events are `step`, `input`, `output`, `done`, or `error`; each event includes node ID and the necessary state snapshot. The machine owns the call stack, variables, and statement counter.

- [ ] Add a test helper that feeds a list of input strings to the machine and collects outputs and final variables. Test ordinary and failing executions before implementing the engine.

```ts
expect(run("a = 2\nb = 3\nOUTPUT a + b", []).output).toEqual(["5"]);
expect(run("OUTPUT missing", []).error?.code).toBe("UNASSIGNED_VARIABLE");
expect(run("OUTPUT 4 / 0", []).error?.code).toBe("DIVISION_BY_ZERO");
expect(run("FOR i IN RANGE(1, 3):\n    OUTPUT i", []).output).toEqual([
  "1",
  "2",
]);
expect(run("FOR i = 1 TO 3\n    OUTPUT i\nNEXT i", []).output).toEqual([
  "1",
  "2",
  "3",
]);
```

- [ ] Implement scalar input conversion, arithmetic, explicit string concatenation, compatible-type comparison, and short-circuit Boolean logic.
- [ ] Implement counted loops with bounds evaluated once, positive unit steps, protected active counters, and zero iterations for empty ranges. Reject noninteger bounds.
- [ ] Collect sub-routine definitions before executing the main sequence. Use shared globals and bounded call frames. Reject unknown and duplicate routines.
- [ ] Enforce 100,000 statements, 64 call frames, 1,000 output records, and 256 KB output. Return typed errors without throwing raw internals into the UI.
- [ ] Execute all corrected references with expected results. Include all orderings and ties for the largest-two problem; every membership level; both card comparisons; 0/1/10/11 range boundaries; password success on each attempt; and movement/health limits.
- [ ] Run focused interpreter and reference tests, then commit. Correct further reference defects only where a failing case demonstrates a mismatch with the stated problem, preserving syntax.

## Task 4: Production block editor and two-way text editing

**Files:** create `src/editor/BlockEditor.tsx`, `TextEditor.tsx`, `block-definitions.ts`, `block-adapter.ts`, `editor-state.ts`, `Editor.tsx`; migrate useful code from `src/blocks.ts` and `src/main.tsx`; add `tests/editor/roundtrip.test.ts` and `tests/e2e/editor.spec.ts`.

**Interfaces:** `programToWorkspace(program, workspace)` and `workspaceToProgram(workspace): ParseResult`; `EditorDocument` stores raw draft, last valid AST/source, workspace state, format version, and revision. One reducer owns synchronization origin and prevents feedback loops.

- [ ] Test preservation of ELSEIF chains, optional ELSE, every loop form, PRINT, concatenation, and sub-routines through text → blocks → text.

```ts
expect(roundTrip('PRINT "Total " + total')).toContain("PRINT");
expect(roundTrip("FOR i IN RANGE(0, 7):\n    OUTPUT i")).toContain(
  "RANGE(0, 7):",
);
```

- [ ] Add production Blockly definitions for all AST variants, including selectable reference loop forms and expandable ELSEIF branches. Retain IDs when editing existing nodes. Missing fields produce diagnostics, not silent default values.
- [ ] Add CodeMirror with line numbers, syntax highlighting, errors, and keyboard editing. Debounce parsing; retain invalid text exactly. Disable block changes while unresolved invalid text exists and provide an explicit restore-last-valid action.
- [ ] Implement Blocks, Text, and Split modes. Make conversion one undo transaction. Do not recreate the active workspace on each keystroke.
- [ ] Complete mouse/touch dragging and snap previews. Add keyboard insertion and move-before/move-after/nest/unnest actions. Maintain a visible program after layout changes.
- [ ] Browser checks:

```ts
await page.getByRole("button", { name: "Text", exact: true }).click();
await page.locator(".cm-content").fill("INPUT number\nOUTPUT number");
await page.getByRole("button", { name: "Blocks", exact: true }).click();
await expect(page.getByLabel("Block workspace")).toContainText("INPUT");
```

- [ ] Test that invalid text survives switching panels and reload, and that it never triggers an old program run. Run editor round-trip and browser tests before committing.

## Task 5: Run, pause, step, stop, and diagnostics

**Files:** create `src/runner/protocol.ts`, `execution.worker.ts`, `use-runner.ts`, `RunControls.tsx`, `InputPrompt.tsx`, `OutputPanel.tsx`, `VariablesPanel.tsx`, `tests/runner/protocol.test.ts`, `tests/e2e/runner.spec.ts`.

**Interfaces:** commands are start/pause/step/stop/input with run ID and monotonically increasing sequence; responses carry the same IDs and `MachineEvent`. `useRunner` exposes status, output, variables, current node, diagnostics, and command methods.

- [ ] Test that late messages from a stopped run are ignored and that a new run starts with clean variables/output.
- [ ] Execute in short worker batches. Pause between statements, step once, and stop immediately. Terminate and replace an unresponsive worker after five active seconds; exclude time waiting for input.
- [ ] Show interactive input with the variable name and previous output. Submit empty strings correctly. Cancel pending input on Stop.
- [ ] Link the active node and errors to both views. Focus the relevant line/block when a diagnostic is selected. Separate syntax, runtime, and challenge-failure language.
- [ ] Browser checks include:

```ts
await page.getByRole("button", { name: "Run", exact: true }).click();
await page.getByLabel("Input for number").fill("7");
await page.getByRole("button", { name: "Submit input" }).click();
await expect(page.getByLabel("Program output")).toContainText("7");
await expect(page.getByRole("status")).toContainText("Finished");
```

- [ ] Verify Stop during long loops and INPUT, step across routine calls, division errors, and variable inspection. Commit after focused checks pass.

## Task 6: Sixty verified challenges and progressive help

**Files:** create `src/problems/types.ts`, `catalog/`, `check.ts`, `ProblemLibrary.tsx`, `ProblemPanel.tsx`, `HintPanel.tsx`, `internal/solutions/`, `scripts/validate-problems.ts`, `tests/problems/catalog.test.ts`.

**Interfaces:** a `Problem` has stable ID, title, statement, difficulty, concepts, reference IDs, content version, starter source, three hints, samples, and checker cases. `checkProgram(problem, source): CheckResult` runs the same interpreter with bounded input and task-specific expected values/results.

- [ ] Write catalog invariants:

```ts
expect(catalog).toHaveLength(60);
for (const level of ["Easy", "Medium", "Hard"]) {
  expect(catalog.filter((p) => p.difficulty === level)).toHaveLength(20);
}
expect(new Set(catalog.map((p) => p.id)).size).toBe(60);
expect(catalog.every((p) => p.hints.length === 3)).toBe(true);
```

- [ ] Adapt the 20 corrected references and author 40 distinct problems. Easy uses direct input/calculation or one decision; Medium combines validation, counting, or multiple branches; Hard combines nested state, loops, and sub-routines. Keep every task within the supported reference syntax.
- [ ] For each problem, write an internal model solution and at least three checks selected for ordinary, boundary, and alternative paths. Include ties/empty ranges where relevant. Do not make all variations mere changes to numbers or names.
- [ ] Ensure every starter parses but fails at least one meaningful correctness test. Each hint must help reasoning without supplying a complete program.
- [ ] Validate all 60 solutions and all 60 starters. Check that model-answer modules are excluded from the client dependency graph and built bundle.
- [ ] Implement searchable/filterable library, starter loading as a new document, sequential hint reveal, sample cases, and expected-versus-actual feedback. Do not expose a Reveal solution control.
- [ ] Run `npm run validate:problems` and content tests; manually review problem/hint clarity and difficulty balance before committing.

## Task 7: Worker API and durable private programs

**Files:** create `worker/index.ts`, `env.ts`, `programs.ts`, `db.ts`, `validation.ts`, `migrations/0001_initial.sql`, `src/programs/api.ts`, `tests/worker/programs.test.ts`, `wrangler.jsonc`.

**Interfaces:** `/api/programs` lists/creates; `/api/programs/:id` reads/updates/deletes; `/api/programs/:id/restore` restores. Every handler receives a verified session owner. Updates require `expectedRevision`; conflict returns 409 with current revision, never a silent overwrite.

- [ ] Create the tables specified in the design, with foreign keys, unique normalized email, owner/date indexes, unique progress per user/problem, and expiry indexes. Apply migrations to local D1 first.
- [ ] Write cross-owner and optimistic concurrency tests:

```ts
expect((await apiAs(userB).get(`/api/programs/${programOfA.id}`)).status).toBe(
  404,
);
expect(
  (
    await apiAs(userA).put(`/api/programs/${programOfA.id}`, {
      expectedRevision: 0,
      draft: "OUTPUT 2",
    })
  ).status,
).toBe(409);
```

- [ ] Implement bounded validation: title 120 characters; source 200 KB; workspace JSON 1 MB; maximum 5,000 AST/block nodes. Reject malformed shapes and unsupported stored format versions with recoverable errors.
- [ ] Use parameterized D1 queries and owner constraints on every access. Create/duplicate in transactions or D1 atomic batches. Soft-delete for 30 days with restore and scheduled expiry cleanup.
- [ ] Configure static assets and API routing so unauthenticated API requests return JSON 401, not the SPA document. Test migrations against a new and an existing local database, then commit.

## Task 8: React Email and Storybook

**Files:** create `emails/EmailShell.tsx`, `OtpEmail.tsx`, `render.ts`, `OtpEmail.stories.tsx`, `.storybook/main.ts`, `preview.tsx`, `tests/emails/otp.test.ts`.

**Interfaces:** `renderOtpEmail({ code, expiresInMinutes }): Promise<{ html: string; text: string }>`; code is a string to retain leading zeros. The Worker sends these exact render results.

- [ ] Configure Storybook React/Vite using current supported packages and add `storybook`/`build-storybook` scripts. Use isolated iframe HTML for the actual rendered email, not a parallel preview component.
- [ ] Test HTML/text output:

```ts
const email = await renderOtpEmail({ code: "004219", expiresInMinutes: 10 });
expect(email.text).toContain("004219");
expect(email.text).toContain("10 minutes");
expect(email.html).not.toContain("undefined");
```

- [ ] Build the email shell and OTP template with React Email. Include purpose, expiry, code, and ignore-if-unrequested guidance. Use email-safe layout and plain-text output; no remote script or authentication secret is embedded.
- [ ] Add default, leading-zero, long-display, and narrow-width stories. Add auth UI stories in Task 9 for expired/wrong codes, resend cooldown, send failure, and loading.
- [ ] Inspect rendered desktop/narrow HTML and plain text. Build Storybook and test rendering in the Worker-compatible runtime before committing.

## Task 9: Public OTP signup and secure sessions

**Files:** create `worker/auth.ts`, `otp.ts`, `sessions.ts`, `rate-limit.ts`, `resend.ts`, `src/auth/SignIn.tsx`, `VerifyCode.tsx`, `SessionProvider.tsx`, auth stories, `tests/worker/auth.test.ts`.

**Interfaces:** `POST /api/auth/request-code`, `POST /api/auth/verify`, `GET /api/session`, `POST /api/auth/logout`. Request-code responds generically with an opaque challenge ID. Verification returns a session and account only after atomic code consumption.

- [ ] Tests cover leading-zero codes, wrong/expired codes, five-attempt lockout, successful resend invalidation, failed email delivery, concurrent verification, and session revocation.

```ts
const results = await Promise.all([
  verify(challenge, code),
  verify(challenge, code),
]);
expect(results.filter((r) => r.status === 200)).toHaveLength(1);
expect((await verify(challenge, code)).status).not.toBe(200);
```

- [ ] Generate six-digit codes with cryptographic randomness. HMAC the challenge ID and code; store no raw codes. Use ten-minute expiry and an atomic conditional consume that checks expiry, attempts, and unused state.
- [ ] Use a 60-second resend cooldown, five sends/email/hour, twenty sends/IP/hour, and verification limits. Keep counters atomic in D1. Use keyed hashes for rate-limit identities. Do not trust client-supplied IP headers.
- [ ] Render the React Email template and send through Resend with a verified sender. Use idempotency for retries; activate a replacement challenge only after accepted delivery. Preserve the old valid challenge when delivery fails.
- [ ] Create 30-day opaque sessions; store token digests and set HttpOnly/Secure/SameSite=Lax cookies. Validate Origin for mutations. Clear and revoke on logout. Reject non-JSON or oversized request bodies.
- [ ] Implement public signup/signin, auto-focus and paste-friendly code entry, truthful resend status, expiry recovery, and accessible error announcements. Run auth integration tests and Storybook checks before committing.

## Task 10: Save, reopen, duplicate, delete, and recover

**Files:** create `src/programs/ProgramLibrary.tsx`, `use-autosave.ts`, `draft-store.ts`, `SaveConflict.tsx`, `tests/programs/recovery.test.ts`, `tests/e2e/programs.spec.ts`.

**Interfaces:** local draft keys include account and program ID. `useAutosave` receives the complete `EditorDocument` and exposes dirty/saving/saved/offline/conflict/error states. Queue and reconcile edits by revision, not last response time.

- [ ] Write tests for network interruption, out-of-order responses, invalid-source drafts, two-tab conflicts, and switching accounts.
- [ ] Persist local drafts before network writes. Debounce cloud saves, flush on program switching, and preserve unsynced copies. Do not trust unload as the sole persistence mechanism.
- [ ] Implement named saves, list/search, open, rename, duplicate, soft-delete, and restore. Loading a challenge creates a new program. Empty and error states must provide a working next action.
- [ ] On conflict, show the available versions and provide Save copy. Never discard a draft. On logout, warn if changes are unsynced; clear the signed-out account's local data only after resolving that state.
- [ ] Browser test:

```ts
await page.getByLabel("Program name").fill("My range check");
await expect(page.getByRole("status")).toContainText("Saved");
await page.reload();
await expect(page.getByLabel("Program name")).toHaveValue("My range check");
```

- [ ] Verify that account B cannot see account A's cached work or API records. Run persistence and browser checks, then commit.

## Task 11: Complete the production interface

**Files:** complete `src/app/`, `src/ui/`, editor/problem/auth/program styles and stories; add self-hosted font files with their license; remove superseded development-only components.

- [ ] Implement the full app routes: sign-in, code verification, problem library, saved programs, and editor. Use lazy loading so Blockly/CodeMirror do not delay authentication or the library.
- [ ] Replace temporary product labels and read-only-preview messaging when the required features are live. Retain factual save and execution statuses.
- [ ] Complete phone/tablet layouts with collapsible problem content and mode-specific editor panels. Keep blocks and text large enough to read; use pan/scroll instead of tiny fit scaling.
- [ ] Verify every visible control with actual browser interaction. Test keyboard-only editor access, insertion/reordering, focus restoration, form errors, empty states, and reduced motion.
- [ ] Review desktop, tablet, and phone together with Impeccable. Check the complete anti-slop file, clipping, alignment, contrast, block field centering, loading failures, and fonts. Fix material findings and obtain an independent review of the corrections.
- [ ] Run typecheck, all unit/integration/content tests, production build, Storybook build, and browser tests. Do not substitute a clean build for workflow checks.

## Task 12: Cloudflare deployment and release acceptance

**Files:** finish `wrangler.jsonc`, `worker/env.ts`, `.dev.vars.example`, deployment scripts, CI configuration if a remote repository is later selected, and `code/README.md`.

- [ ] Use the Cloudflare deployment skill. Inspect account identity with Wrangler; list existing resources before creating the app-specific Worker and D1 database. Keep credentials out of tool output.
- [ ] Configure bindings, migration directory, static assets, compatibility date, and Worker routes. Supply documented secret names for Resend and OTP HMAC; ask for the verified sender/domain only if not already available in the environment.
- [ ] Deploy a preview using isolated D1, apply migrations, and verify health, asset routing, API 401 responses, and error handling. Do not broaden this into an unrelated staging framework.
- [ ] With an authorized test recipient, verify real OTP delivery, single use, sign-in, save/reload, session expiry/recovery, and account separation. Email preview success alone is insufficient.
- [ ] Deploy the production Worker and D1 migrations on the confirmed account. Use the chosen domain, or workers.dev until a custom domain is supplied. Configure only DNS records required for this application.
- [ ] Re-run the critical production workflows: signup, OTP verification, both editor modes, starter/hints, Run/Step/Stop, failed-case feedback, save/open/duplicate/delete/restore, and mobile access.
- [ ] Document the deployment URL, Worker name, D1 binding, migration version, secret names, backup/restore procedure, and code rollback command. Never document secret values.
- [ ] Mark release complete only when every item below passes; name any external credential or delivery blocker explicitly rather than calling the partial app production-ready.

## Release checklist

- [x] Both editors preserve all reference dialect forms and learner drafts.
- [x] All 20 references execute correctly on reviewed test cases.
- [x] All 60 challenges, 60 starters, and internal model answers pass content validation.
- [x] Run, Pause, Step, Stop, INPUT, output, variables, and useful errors work in the browser.
- [ ] Public OTP signup works with real Resend delivery and secure single-use verification.
- [x] React Email templates render correctly and Storybook builds.
- [x] Save/open/rename/duplicate/delete/restore and offline recovery work.
- [x] Cross-account access, OTP replay, concurrent saves, and invalid draft recovery tests pass.
- [x] Desktop, tablet, phone, keyboard, and reduced-motion checks pass.
- [x] Font assets are self-hosted; no model answers or secrets are present in client bundles.
- [ ] Production Cloudflare Worker and D1 are configured, deployed, and smoke-tested.
- [ ] Recovery instructions and final operational details are recorded.

## Plan review

The plan covers every requested capability. Work units share explicit AST, runner, storage, and authentication contracts. All tasks contribute to one complete production release. The only external inputs are actual Cloudflare access, the Resend key, a verified sender, and authorization for a real test email; none justify dropping a feature or substituting a demo.
