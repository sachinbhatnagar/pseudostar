# PseudoStar design

Target: complete production application, as confirmed by the user on 2026-09-06. The current editor is incomplete. All requested features and release checks below are required; none are deferred as an MVP. No production deployment has occurred.

## Purpose and scope

Build a web application that helps a Grade 8 learner practise the pseudocode used in the supplied Stage 9 references. Open email OTP signup lets other learners use it. Learners develop their own reasoning through starters, progressive hints, execution, and test feedback. The application lives in `code/`.

The first release includes both block and text editing, 60 problems, execution and stepping, useful errors, saved programs, progress, public OTP signup, React Email templates in Storybook, and Cloudflare Workers deployment. It does not include a social feed, classroom management, an AI tutor, payments, or a public solution gallery.

## Source material

`references/` contains 20 exercises: 7 selection exercises, 5 loop exercises, and 8 sub-routine exercises. The source files remain independent of the application.

Approved corrections were made to `task_1_2.md`, `task_1_3.md`, `task_1_4.md`, `task_1_5.md`, and `task_3_7.md`: independent card colour/rank comparisons; lowercase shape names; correct largest-pair logic including ties; addition and score increments; hotel arithmetic and membership validation; and the declared password variable. They preserve the existing dialect. Automated verification of these examples belongs to the language-engine work; file presence is not proof of correctness.

## Learning workflow

1. Choose a problem by difficulty or concept. Read its goal and sample inputs/outputs.
2. Load an incomplete starter into a new program. Loading never overwrites an existing program.
3. Arrange blocks or edit pseudocode. Both views show the same last valid program.
4. Run with interactive input, or step through the instructions and inspect variables.
5. Check the program against the challenge cases. Feedback identifies the failing input and result; it does not dictate one implementation.
6. Request hints individually: a concept reminder, a guiding question, then an approach. Do not expose a completed model answer through the UI or public API.
7. Continue from autosaved work or create a named copy.

A passing test suite is reported as passing the listed tests, not proof that every possible input is correct. No timer, punitive streak, or speed-based reward is required.

## Editor design

Use Blockly for its connection model, nesting, dragging, undo, and workspace serialization. Custom statement blocks show literal textbook syntax. Pale green output, rose input, parchment variables, clay selection, and mist-blue loops distinguish roles without making colour the only cue. Neutral green surfaces keep long practice sessions readable. The movable code strips and their nested shapes are the primary visual feature.

Desktop layout: problem and hints at left, block workspace in the centre, text/output inspection at right. Editing modes are Blocks, Text, and Split. On smaller screens, one editor fills the working area and the challenge is collapsible. The final release must not force phone users to scroll past a full lesson before every edit. Keep code horizontally scrollable rather than shrinking it below legibility.

The current editor implements block styling, fields, drag/drop, nesting, source generation, local draft recovery, and download. Read-only source and absent execution are unfinished work. The production release must include editable text, Run, Step, diagnostics, account storage, the full challenge library, and real email authentication. Remove temporary development labels only as the corresponding features become complete.

Use real accessible controls, visible focus states, labelled icon actions, and a keyboard alternative for block insertion and rearrangement. Dragging must not be the only route to building a program. Honour reduced motion. Keep content visible before scripts or animations finish. Motion belongs to insertion previews, snapping, and active execution, not decorative floating cards.

## Language contract

Do not replace this dialect with the Cambridge examination board's unrelated declaration or assignment-arrow conventions.

- Keywords are uppercase. Identifiers are case-sensitive. Strings use double quotes and preserve case and whitespace.
- Assignment uses `name = expression`. A variable is created on first assignment or input. Reading an unassigned variable is an error.
- Input uses `INPUT name`. The interactive runner shows the target variable. Signed whole or decimal numeric input becomes a number; other input remains a string. Display this rule in the help. Empty input is a valid empty string.
- Output accepts `OUTPUT` and `PRINT`. Comma-separated output expressions are joined without inserted characters. `&` concatenates text. `+` adds two numbers or concatenates if either operand is a string, as used in task 1.3. Numeric conversion for concatenation is explicit in the interpreter.
- Arithmetic supports `+`, `-`, `*`, `/`, `MOD`, parentheses, and unary signs. Division by zero and nonnumeric arithmetic produce errors. Operators never invoke JavaScript coercion implicitly.
- Conditions accept `=` and `==` for equality, plus `<`, `<=`, `>`, `>=`, `AND`, and `OR`. Equality does not assign. Equality between unlike types is false, which lets the card examples compare numeric input with shape names. AND/OR short-circuit; ordering comparisons require compatible scalar types. Precedence is unary signs, multiplication/division/MOD, addition/subtraction, concatenation, comparison, AND, OR. Reject ambiguous chained comparisons and explain how to use AND.
- Selection uses `IF condition THEN`, zero or more `ELSEIF condition THEN`, optional `ELSE`, and `ENDIF`. Preserve the reference variant that puts THEN on the following line.
- Counted loops accept `FOR counter = first TO last` with `NEXT counter`, the reference colon-and-indentation form, and `FOR counter IN RANGE(first, end):` with indentation. TO is inclusive; RANGE excludes its end. Bounds must be integers; the first release increments by one and executes zero times when the range is empty. Evaluate the bounds once at loop entry. NEXT must name the matching counter. Reject assignment/input to an active loop counter.
- Definitions use `SUB-ROUTINE name()` and `END SUB`; calls use `name()`. The supplied examples use shared global variables and no parameters or return values. Collect definitions before execution and reject duplicate names and unknown calls. Definitions do not execute until called. Call depth is limited to 64.
- Four spaces represent one nesting level in generated output. Preserve each node's output keyword, equality spelling, loop style, and THEN placement. Formatting a text draft is explicit. Block edits may regenerate formatting but never silently change loop semantics.

Arrays, WHILE/REPEAT loops, procedure parameters, return values, file operations, and arbitrary library functions are outside the first release because the provided reference set does not establish their conventions.

## Synchronisation and execution

Use a typed abstract syntax tree (AST) with stable node IDs and source ranges. The parser, formatter, block adapter, interpreter, and test runner are separate modules. Preserve dialect metadata alongside AST nodes.

The text editor retains the exact draft while parsing after a short debounce. A valid complete draft updates the AST and block view in one history transaction. Invalid or incomplete text remains editable and autosaved; the block view retains the last valid structure and displays a clear status. Disable block edits while an invalid text draft is pending so it cannot be overwritten. Run operates on the current draft only and stops at parse errors. Never run an older valid version without saying so.

Block edits update the AST and source through one guarded transaction. Do not clear and rebuild the active workspace on every field keystroke. Undo/redo groups one user action rather than every synchronisation event. Incomplete blocks are allowed while building, but prevent execution and identify the missing field or branch content.

The interpreter walks the AST in a browser Web Worker. No `eval`, `Function`, shell, network, or filesystem access is exposed. Messages contain a run ID and sequence number so obsolete worker output is ignored. Provide Run, Pause, Step, Stop, and Reset. INPUT pauses execution and accepts a submitted scalar; stopping cancels pending input.

Limits per run: 100,000 executed statements, 64 call frames, 1,000 output records, and 256 KB of output text. Yield execution in small batches to keep Stop responsive. A main-thread watchdog terminates an unresponsive worker after five seconds of active work; time waiting for user input is excluded. Report a limit as a learning error with recovery guidance. Test cases use the same pure interpreter with bounded synchronous input.

Errors contain a stable code, node ID, source range, short explanation, and next action. Examples: `total has no value yet. Give it a value before this line.`; `This division uses zero. Check the value of nights.`; `This IF needs ENDIF.` Highlight both the source line and corresponding block. Distinguish syntax errors, execution errors, incomplete programs, and failed challenge tests.

## Problem library

Publish exactly 60 reviewed problems initially: 20 Easy, 20 Medium, and 20 Hard. Include the 20 corrected references plus 40 original variations constrained to the same taught concepts. Difficulty measures reasoning, nesting, and state management, not unfamiliar syntax.

Each record has an ID, title, statement, difficulty, concepts, reference IDs, starter source, three hints, visible sample cases, test cases, and a content version. Internal reference answers validate the cases but are excluded from the frontend bundle and API. Starters must leave meaningful reasoning unfinished and fail at least one relevant check. Sample output is allowed; completed program logic is not.

Cases cover ordinary inputs, boundaries, ties, zero values where valid, branch alternatives, and repeated execution. For interactive programs, provide the complete input sequence. Compare defined result lines or final named values with task-specific rules; do not reject a correct solution merely for adding a reasonable input prompt. Do not give passing credit based only on string fragments. Each task's checker documents precisely what it evaluates.

## Cloud architecture and storage

React, TypeScript, Vite, and a Cloudflare Worker form one deployable application. Worker routes under `/api/` handle authentication, program storage, and progress. Static assets use the Workers asset binding. D1 is the durable database. Do not add KV or R2 without a concrete requirement.

Tables:

- `users`: ID, normalized email, creation time.
- `otp_challenges`: ID, email, keyed code digest, expiry, failed attempts, consumed time, send status.
- `sessions`: hashed opaque token, user ID, creation and expiry times.
- `programs`: ID, owner ID, title, problem ID, raw draft, last valid source, serialized blocks, format version, revision, updated time, deletion time.
- `progress`: user ID, problem ID, content version, status, highest hint viewed, last checked time.
- `rate_limits`: opaque keyed identity, time window, request count.

All program reads and writes constrain owner ID from the session. Use revision-based updates; a stale save returns a conflict and preserves both versions through a Save copy action. Never overwrite another tab's newer edit silently. Delete moves a program to recoverable storage for 30 days. Named save, rename, duplicate, list, open, restore, and delete are explicit API operations.

Debounced cloud autosave follows local draft persistence. Show Saving, Saved, Offline draft, Conflict, or Save failed truthfully. Flush pending edits when switching programs. Scope local keys to the signed-in account; remove that account's local drafts on sign-out after warning about any unsynced edits. Cloud sessions must not expose a prior account's draft.

## Email authentication

Anyone may request a code. Use a six-digit cryptographically random code with a ten-minute lifetime. Store an HMAC of the code and challenge ID using a Worker secret, not the raw code or an unkeyed six-digit hash. A successful resend invalidates the older challenge. A code can be consumed once through an atomic conditional update. At most five incorrect attempts are allowed per challenge. Only activate a challenge after Resend accepts the email; avoid consuming a valid prior challenge when a replacement delivery fails.

Apply a 60-second resend cooldown, five sends per email per hour, and twenty sends per IP per hour. Apply independent verification request limits. Keep rate limits in atomic database operations, not process memory. Use generic responses that do not reveal whether an account exists. Never log codes, session tokens, or full email payloads.

Create an account only after successful verification. Set an opaque session cookie with HttpOnly, Secure in deployed environments, SameSite=Lax, Path=/, and a 30-day expiry. Hash the token in D1. Logout revokes the session. Validate same-origin requests for state-changing APIs; use schema validation and bounded payload sizes. Secrets remain server-side.

## React Email and Storybook

Implement a reusable email shell and OTP email with React Email components. Include the code, expiry, product name, requested purpose, and a clear instruction to ignore an unrequested message. Generate HTML and plain-text bodies from the same template. Do not put raw user-supplied HTML in email.

Storybook renders the actual React Email template through its rendered HTML in an isolated frame, not a separate imitation. Stories cover the default code, leading-zero code, long recipient display, and narrow-screen layout. UI stories cover OTP entry, resend cooldown, wrong/expired codes, send failure, and verification loading. Sending and verification remain integration tests rather than pretending email is delivered by a Storybook story.

Use a verified Resend sender and an environment-supplied API key. Never send a real email merely to capture a preview. Delivery verification requires the user's test recipient and authorization to send.

## Configuration and deployment

Use a supported Node LTS runtime and lock dependencies. The supplied system Node 23 produced dependency engine warnings during the prototype installation; final tooling must use Node 24 LTS or another version supported by all selected packages. Confirm exact versions before implementation.

Provide Wrangler configuration, local D1 migrations, `.env.example` or `.dev.vars.example` without secrets, build scripts, and deployment instructions. Secrets include `RESEND_API_KEY` and `OTP_HMAC_SECRET`; public configuration includes sender address and application origin. Bind D1 as `DB`.

Inspect the authenticated Cloudflare account before creating resources. Use an isolated preview Worker and database for integration checks, then deploy the production Worker and its database. Start on workers.dev if no custom domain is selected. Do not alter unrelated DNS or account resources. Set security headers without breaking Blockly, workers, or email previews. Serve API authentication errors as JSON, not the SPA fallback.

## Delivery order and acceptance

1. Complete the real Blockly editor and its visual treatment as production code.
2. Build and verify the language engine against all references and dialect variants.
3. Add the two-way editor, execution controls, diagnostics, and recovery.
4. Author and verify the complete challenge library and progressive hints.
5. Add D1 storage, public OTP signup, React Email, and Storybook.
6. Complete accessibility, responsive browser checks, security checks, and Cloudflare deployment.

Required checks include parser/formatter round trips; inclusive versus exclusive loop bounds; sub-routine shared state; invalid drafts; source-to-block diagnostics; stop during loops and input; two-tab save conflicts; user A/B isolation; OTP replay, expiry, cooldown, and concurrency; draft restore; deletion/restore; all 60 model programs; and all 60 incomplete starters.

Browser acceptance includes real dragging and nested snapping, text editing, keyboard insertion and reordering, undo/redo, save/reload, mobile layout, reduced motion, error recovery, and no clipped controls. React Email HTML and text must be inspected, Storybook must build, and deployed email delivery and account isolation must be verified before claiming release completion.

## Primary implementation references

- Blockly custom generators: https://developers.google.com/blockly/guides/create-custom-blocks/code-generation/block-code
- Blockly serialization: https://developers.google.com/blockly/guides/configure/web/serialization
- Cloudflare React and Vite: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Cloudflare Resend integration: https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/
- React Email HTML and plain text: https://react.email/docs/utilities/render
- Storybook React/Vite: https://storybook.js.org/docs/get-started/frameworks/react-vite/

The detailed task-by-task implementation plan is in ../plans/2026-09-06-pseudostar-production.md. The project currently has no Git repository, so this document is saved locally and is not claimed as committed.
