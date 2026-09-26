# English workspace design

Date: 2026-09-26
Branch: `feat/english-work`
Status: Design approved in conversation; written specification awaits review.

## Purpose and boundaries

Add English as a distinct PseudoStar workspace for students in Grades 8–10 preparing for First Language English. Preserve the existing ICT studio, its appearance, tools, programs, and progress. Share the account and workspace switcher. Each workspace owns its navigation, dashboard or studio, terminology, tools, and progress.

Build a usable first version of all eight English tools. Support original curated exercises, AI-generated practice, AI coaching, saved attempts and revisions, and progress over months. Do not add speaking assessment, audio recording, a course-authoring interface, teacher accounts, or a separate agent framework in this version. Speech writing is included; it is not speaking assessment.

No deployment is included. All implementation work stays on `feat/english-work`. Local `main` includes the ICT branch through merge `c3fce3c`. The existing local change to `codedb.snapshot` is unrelated and must remain intact.

## Existing architecture

- React 19 and TypeScript run in Vite. `code/src/app/App.tsx` handles session entry, account controls, and the programming studio. Current studio navigation uses component state, not a subject router.
- Blockly and CodeMirror share the pseudocode model. Parsing and execution run locally. ICT problem content lives separately under `code/src/problems/`; private solutions remain on the server.
- A Cloudflare Worker serves assets and `/api` routes. D1 stores users, sessions, programs, and programming progress. Email-code authentication and existing secure session cookies remain unchanged.
- Guest programs use local storage. Account drafts have local recovery and owner-scoped API requests. Existing account-change protection must apply to English requests too.
- Groq supplies programming explanations. English can reuse the configured provider, but requires separate task-specific prompts, output validation, and evaluation records.
- Existing programming progress stores started/passed state, not immutable writing attempts. English history must not be forced into that table or the program model.

## Workspace structure and routes

Use a small workspace registry containing stable IDs, names, entry routes, and workspace components. Share authentication, account identity, and the switcher. Do not force all subjects into one configurable dashboard or duplicate the app for English.

- `/` retains the existing ICT entry behavior for users without a saved selection.
- `/ict` opens the current studio with the shared workspace switcher added.
- `/english` opens the English dashboard.
- `/english/tools/:toolId` lists practice for a tool.
- `/english/exercises/:exerciseId` shows the preparation page and starts an attempt.
- `/english/attempts/:attemptId` supports the response, coaching, and revision flow.
- `/english/history` lists previous work and revision chains.
- `/english/progress` shows practice points and skill trends by month.

Explicit URLs take precedence over the remembered workspace. Direct links, refresh, browser Back/Forward, and unknown routes have defined outcomes. Unknown IDs show a useful not-found state with a return link. Use one small routing boundary, with native History API routing unless implementation inspection establishes a simpler existing solution.

Switching workspaces preserves drafts and pauses active ICT execution before the studio unmounts. Persist draft recovery before leaving. Failed persistence must show a recovery action and must not silently discard work. Existing ICT save behavior remains authoritative.

## Student profile and grades

Capture Grade 8, 9, or 10 on first entry to English. Save it in the account learning profile; guests save it on their device. Allow later changes. Do not infer grade from age or automatically promote a student.

Grade controls available content, scaffolding, example complexity, task length, and feedback criteria. Save grade, exercise version, and rubric version on each attempt. Grade changes affect new work only. Recommendations may target a prerequisite skill without changing the student's grade.

## Curriculum basis

Use Cambridge Lower Secondary English 0861 as the foundation and Cambridge IGCSE First Language English 0500 as the destination. The current research baseline is the published 2027–2029 0500 syllabus and specimen criteria. Keep the source edition explicit and replaceable. This does not assume a particular student's examination year or that school grades equal Cambridge stages.

The following progression is authored for this app, not an official Cambridge grade mapping:

| Grade | Emphasis |
| --- | --- |
| 8 | Sentence control, relevant evidence, supported inference, paragraph cohesion, short purposeful writing |
| 9 | Deeper analysis, concise summaries, developed arguments, sustained writing |
| 10 | Nuanced evaluation, controlled style, source synthesis, independent timed responses |

Cover explicit and implicit meaning, vocabulary in context, evidence selection, writer's effects, evaluation, summary, audience, purpose, structure, style, and spelling/punctuation/grammar. Include fiction and non-fiction across varied contexts and perspectives. Use narrative, description, argument, speech, letter, article, report, journal, and summary tasks across the catalogue.

The supplied school image is a reference only. It lists reading chapters 6–8; story, speech, and argumentative writing; transitions and discourse markers; listening and speaking. Do not invent chapter mappings without the book and edition. Reading and writing priorities fit the first version; listening and speaking remain separate future scope.

## Tools and content

| Tool | Student activity and focus |
| --- | --- |
| Sentence Surgery | Correct punctuation, sentence boundaries, tense, grammar, and awkward wording; explain a selected correction |
| Sentence Upgrades | Improve precision, imagery, sentence variety, and deliberate effect without rewarding verbosity or rare words alone |
| Vocabulary in Context | Infer meanings from passages and choose or justify vocabulary appropriate to context |
| Writer's Effect | Select exact textual evidence and explain meaning, associations, and effect in context |
| Evidence-Based Responses | Answer inference and evaluation questions with supported reasoning; practise selective summaries where quotations are not required |
| Micro-Writing | Short narrative, descriptive, and genre-specific tasks with an audience, purpose, and word target |
| Editing Lab | Reopen an actual earlier response, work on targeted feedback, and preserve the original and revision |
| Timed Writing | Plan, compose, and proofread longer tasks, including source-based writing |

Use shared preparation, response, feedback, revision, and history components. Response controls vary by task: selected answers, short text, structured evidence fields, or sustained writing. Tools open as full routes, never exercise dialogs.

Provide at least two original curated exercises per grade for each of the seven tools that start new work: 42 exercises. Editing Lab uses the student's saved work; its empty state links to an initial writing task. Curated content stays in dedicated data files, separate from rendering, coaching, and storage logic.

Each exercise records its stable ID, version, grade, tool, skills, genre, purpose/audience, source passage where needed, instructions, a worked example on different material, response format, relevant criteria, and word/time targets. Examples illustrate possible approaches, not the only valid response. Store school mappings as optional metadata, not engine rules.

AI-generated exercises use the same schema and must include all required content. Generate on explicit student actions. Use grade, target skill, recent practice, and genre variety to select a brief; do not send the full account history. Validate generated content before offering it. Persist the accepted exercise so later history does not depend on regenerating it. If generation fails, offer a relevant curated task.

## Dashboard and visual direction

Use approved Option A: mulberry ink, pale rose surfaces, side navigation, and a reading-focused layout. Reuse the current app's type and accessible component patterns where appropriate. Keep English styles scoped so ICT remains unchanged.

The dashboard shows the recommended next action, unfinished work, recent feedback, all eight tools, and a path to long-term progress. Recommendations explain the reason in plain language. New accounts show starting choices, not invented results. The preview's sample achievements and learner history must never ship as real data.

Connect the flow: recommendation → exercise → response → coaching → revision → fresh independent task. History can reopen any saved step. The dashboard updates from stored activity, not decorative counters. Make all pages usable on narrow screens, with visible content by default, clear focus states, and reduced-motion support. Check the supplied design rules point by point before handover.

## Coaching and reassessment

Use an explicit, bounded teaching cycle rather than an autonomous multi-agent system:

1. The student attempts a task or requests help.
2. AI identifies strengths and one or two useful improvement targets from the actual response.
3. The coach explains the issue and provides a hint or a separate short teaching example.
4. The student revises; the coach explains what improved and what remains.
5. The student can try a fresh task for the same skill without prior coaching.

Do not interrupt each keystroke. Offer coaching at submission and through an explicit help action. Record any hint or coaching use. Independent reassessment withholds task-specific coaching until submission; a help request changes the attempt to coached practice and clearly tells the student.

Return structured feedback: strengths, specific corrections, next improvement, relevant skill ratings, and quoted evidence from the response. Use Developing / Secure / Strong, with Not assessed when the task provides insufficient evidence. These are app practice ratings, not official Cambridge marks or predicted grades.

Use task-specific criteria. Do not lower a reading-understanding rating for unrelated spelling errors. Separate a necessary correction from an optional stylistic alternative. Accept valid alternative interpretations supported by the passage. Do not award understanding for terminology alone or require a fixed point-quotation-explanation template when the task does not call for it.

Validate evidence quotations against the submitted response and supplied passage. Reject malformed provider output or retry within a bounded request. Student text and generated passages are data, never instructions to the evaluator. Render feedback as text, not executable HTML. Store the response version, evaluator/rubric version, and assistance state with feedback so delayed results cannot attach to a newer draft.

## Timed writing

Use planning, writing, and proofreading stages with visible remaining time. Stage changes retain earlier notes and text. Persist timing state across refresh; derive elapsed time from timestamps rather than interval ticks alone. Allow a student to finish early. At expiry, retain the response and offer submission or continued practice; mark continued work as over time. Never delete or automatically submit work on timer expiry. Coaching is available after submission in independent timed practice.

## Storage and reliability

Add English learning data without altering existing ICT program or progress records. Use additive D1 migrations and owner-scoped queries. Logical records include the learning profile, exercise snapshots, attempts, response revisions, evaluations, and point awards. Revision records are append-only; draft updates use revision checks to prevent silent overwrites between tabs.

Account attempts save in D1 with local draft recovery scoped to account and workspace. Guests can use curated tasks and device-local drafts/history. AI generation and evaluation require sign-in, consistent with current AI access. Do not silently merge guest work into an account; retain it and offer an explicit copy action when needed.

Save a submitted response before requesting AI. AI failure leaves a saved response and a retry action. Distinguish saved, saving, local recovery only, evaluation pending, and evaluation failed states. Authentication changes must not expose or save another account's data. Clear stale UI on account changes while retaining correctly scoped recovery data.

Enforce ownership, payload limits, grade/tool/skill validation, same-origin mutation checks, and provider request limits on the server. Use the existing Groq configuration and account rate-limit mechanism; keep English and ICT daily usage messages consistent if they share the allowance. Bound retries and request duration. Retries must not create duplicate revisions or point awards.

## Practice points and long-term progress

Practice points reward activity, not claimed mastery. Use these initial fixed rules:

- 10 points for the first successfully evaluated substantive response to a distinct exercise version.
- 5 points once for a meaningful revision of that response, supported by evaluator evidence of improvement in at least one relevant criterion or feedback target.
- A fresh follow-up is a distinct exercise and can earn its own 10 completion points.

Unchanged responses, empty responses, evaluation retries, repeated attempts on the same exercise version, and repeated revisions do not earn duplicate points. Enforce uniqueness per account, exercise version, and award kind in storage. Award a newly earned revision benefit only after validating the revised content and feedback. An improved rating level is not mandatory if the student makes a specific improvement within a level. If improvement cannot be established, save the revision without awarding points.

Show totals, monthly earned points, practice days, completed exercises, and skills practised. Show dated categorical skill-rating trends with evidence links. Separate coached and independent evidence and group comparisons by grade and criterion version. Do not average ratings into a hidden numeric mastery score. A single strong response is evidence, not proof of permanent mastery. Keep old months available; changing grade does not reset point history.

Recommendations use stored evidence: unfinished work first, then a useful revision or fresh check of a coached skill, then an under-practised skill. Students can always choose another tool. Keep the recommendation logic small and inspectable.

## Verification and acceptance

Use existing Vitest, Worker integration, and Playwright patterns. Add focused tests for English schema validation, ownership/account changes, draft recovery, revision preservation, stale evaluations, point uniqueness, grade changes, and AI failure/retry behavior. Provider fixtures test application behavior; they do not establish educational validity. Review sample evaluations across grades and valid alternative responses before making quality claims.

Required browser paths: ICT → English → select grade → complete exercise → feedback → revise → fresh follow-up → history → monthly progress → ICT. Verify full routes, refresh, Back/Forward, narrow layouts, keyboard use, timing recovery, and all actionable controls.

Run existing checks from `code/`: `npm run typecheck`, `npm test`, `npm run test:worker`, `npm run test:preflight`, `npm run build`, and `npm run test:e2e` with the configured local server. Use the repository's Node 24 requirement. Report any checks that cannot run and separate mocked checks from live-provider validation.

Acceptance requires a working switcher, intact ICT experience, all eight English tools, grade-aligned content, saved/revisitable work, actionable AI coaching, preserved revisions, visible practice points and monthly trends, and passing repository checks. Show honest empty, loading, offline, and failure states.

## Sources and later curriculum inputs

- Cambridge Lower Secondary English 0861: https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-lower-secondary/curriculum/english/
- Cambridge IGCSE First Language English 0500, 2027–2029 syllabus: https://www.cambridgeinternational.org/Images/718783-2027-2029-syllabus.pdf
- Reading specimen criteria from 2027: https://www.cambridgeinternational.org/Images/718838-2027-specimen-paper-1-mark-scheme.pdf
- Writing specimen criteria from 2027: https://www.cambridgeinternational.org/Images/718839-2027-specimen-paper-2-mark-scheme.pdf
- EEF, Teacher Feedback to Improve Pupil Learning: https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/feedback

These sources inform original exercises and app-authored rubrics. Do not copy examination passages or label generated exercises as official Cambridge material. The coaching loop applies formative-feedback principles; it is not a validated AI intervention.

Later school mapping needs the textbook title/edition and chapter names, the student's intended examination year and syllabus code, school grade-to-stage mapping, and any teacher-specific criteria. These inputs are not prerequisites for the original practice catalogue.
