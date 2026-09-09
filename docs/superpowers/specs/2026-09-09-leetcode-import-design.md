# LeetCode imports and advanced practice

Superseded: the importer is replaced by publishing user-written pseudocode.
See [the current workflow](../../../code/README.md#community-problems). Keep the future learning scope below for later work.

Date: 9 September 2026

Status: Approved. Source policy revised by the user: use original or licensed
statements with LeetCode reference links. Latest user revision: fetch public
details automatically; show manual entry only if retrieval or parsing fails.

## Objective

Let signed-in users contribute LeetCode problems to the shared PseudoStar
library. Generate original, executable pseudocode solutions and matching blocks.
Prevent duplicate source problems. Require admin approval before publication.
Contributors can practise their own checked drafts before publication.

Build on `feat/leetcode-import`. Run locally for user testing. Do not deploy
until the user separately confirms deployment.

## Learning principles

Design for Grade 8 learners and above. Use short sentences and familiar words.
Explain technical terms on first use. Show prerequisites and small examples.
Introduce one concept at a time. Advanced content must not require knowledge of
another programming language.

Use the same language rules in the text editor, blocks, runner, hints, and
reference solutions. Provide progressive hints. Reveal the reference solution
only after an explicit learner action. Show a concise algorithm explanation,
not the model's private reasoning. Keep existing lessons and saved programs
compatible.

## Existing architecture and chosen approach

The current library is a bundled catalog. Reference solutions are held on the
server. The language uses scalar values, basic control flow, and subroutines.
Cloudflare D1 stores users, sessions, saved programs, and progress.

Extend this engine rather than add a second execution system. Keep bundled
lessons available and combine them with approved database problems through the
library interface. Use stable problem IDs for saved programs and progress.

Keep source fetching, generation, validation, and publication as distinct stages
with persisted results. Reuse the current authentication, AI provider, model,
runner, and block conversion paths where they support the required behaviour.

## Advanced language scope

Add lists, indexed reads and writes, strings and string operations, nested lists
for matrices, WHILE loops, functions with parameters and return values, local
variables, recursion, maps, and sets. Every supported construct needs matching
blocks. Do not publish text-only solutions that cannot convert to blocks.

Use one-based indexing across pseudocode, blocks, and teaching examples. When a
LeetCode problem returns zero-based indexes, explicitly convert those result
values in its input/output adapter and explain the distinction to learners.
Specify the exact syntax, value semantics, parameter passing, collection
operations, and input/output encoding in implementation planning before changing
the engine. Preserve current scalar and subroutine behaviour.

Apply explicit limits to statements, recursion, collection sizes, output, and
execution time. Report invalid indexes, invalid types, missing values, and
exceeded limits with clear learner messages. Do not execute generated JavaScript
or Python on the server.

## Import flow

1. A signed-in user submits a LeetCode problem link.
2. Validate the host and problem path. Remove query strings, fragments, and
   alternate problem subpage suffixes to obtain one canonical source identity.
3. Look up that identity. Open an approved entry or the user's existing draft.
   If another user owns a pending draft, show that the problem is already under
   review without exposing its private contents.
4. Fetch public details through the fixed LeetCode endpoint. Do not follow
   redirects, use private sessions, or retrieve paid content. Apply time and size limits.
5. Fill the statement, examples, and constraints automatically. Show manual
   entry only if retrieval or parsing fails. Require review and a rights declaration.
6. Retain the canonical reference link. Reserve its identity when saving the
   draft; a database unique constraint prevents simultaneous duplicate submissions.
7. Generate and validate a candidate solution. Save the results and stage status.
8. Enable contributor practice after execution and block checks pass. Label the
   draft "Not reviewed". Send it to the admin review queue.
9. Publish only after admin approval of the checked content revision.

Keep the source link in the contributor/admin workflow. Do not add LeetCode
branding or reference links to the learner-facing problem statement. Preserve
author or licence attribution. LeetCode's terms prohibit scraping and
restrict content reuse: https://leetcode.com/terms/ (checked 9 September 2026).
Public retrieval does not grant permission to republish. Keep the original or
licensed content requirement and admin review after automatic retrieval.

## Generation and checks

Use the existing AI provider and model on the server. Ask the model to reason
internally and return structured results: supported pseudocode, a short algorithm
explanation, progressive hints, topics, prerequisites, and tests. Do not store
or display private chain-of-thought.

Treat fetched and pasted content as untrusted data, never as model instructions.
Validate generated fields, sizes, syntax, and supported language features before
execution or storage as a reviewable candidate. Render statement content safely.

Check source examples, boundary cases, and additional cases. Compare candidate
results with a separately generated reference implementation using the bounded
PseudoStar engine. Keep this reference separate from the learner-facing
solution. Record test provenance and disagreements for the reviewer. Agreement
between AI outputs does not prove correctness; admin review remains required.

Check that pseudocode converts to blocks and back without changing behaviour.
Adapt LeetCode function inputs and returned values explicitly into PseudoStar's
problem contract. Preserve input types and required output rules. Do not rely on
the current output-subsequence check for problems requiring exact results.

Unsupported features or failed checks prevent publication and practice of that
candidate. Show a specific reason. Do not alter a problem's meaning to make it
pass. Network errors and generation failures retain enough state for retry.

## Storage and permissions

Store the canonical source identity, source URL, contributor, statement,
examples, constraints, difficulty, topics, prerequisites, candidate solution,
hints, tests, validation results, content revision, review status, and timestamps.
Keep solutions and private validation material behind server access checks.

Use a database uniqueness constraint for source identity. Retries update the
same import record. Rejected submissions retain their identity and can be revised
and resubmitted. Use a revision or attempt check to prevent stale generation
results and stale admin approvals from replacing newer content.

All users can read approved problems through the shared library. Only the
contributor and admins can read a private draft. Practice results for an
unpublished revision must not count as passing a later changed revision.

Only signed-in users can submit. Enforce usage limits and bounded retries on
the server. Validate URLs, redirects, response sizes, timeouts, and content
before processing; the import route must not fetch arbitrary user-selected hosts.
Provider keys remain on the server.

Persist stage status so a failed request does not lose the draft. Do not rely
on an untracked background promise. Use the smallest supported execution method
that fits measured provider and Worker request limits; establish those limits
during implementation planning before choosing request or job execution.

## Admin panel

Bootstrap `mailme@sachinbhatnagar.com` as the initial admin through the existing
verified sign-in flow. The server must derive the role from trusted account
data, never from a submitted email or browser flag. Do not create a password or
grant admin access to other accounts.

Provide a queue with source statement, candidate solution, block preview,
examples, tests and results, suggested topics, prerequisites, and failure reasons.
Admins can edit, regenerate, approve, or reject. Allow a rejection reason.
Record reviewer, action, content revision, and time.

Changes to a statement, solution, or tests invalidate previous checks. Approval
requires successful checks for the current revision. Published content remains
stable while a replacement revision is being checked and reviewed.

## Shared library and learner experience

Mix approved imports with existing lessons in the same problem list. Add topic
filters such as Arrays, Strings, Searching, Sorting, Recursion, and Dynamic
Programming. Problems can have multiple topics. Map the learner label "Arrays"
to the language's list concept clearly. Admins can correct AI-suggested labels.
Apply the same topic system to bundled lessons.

Show private drafts only to their contributor and admins, with a clear review
label. Preserve normal editing, running, hints, solution reveal, saving, and
progress behaviour for approved imports. Show meaningful loading, empty,
failed, duplicate, and retry states. Keep controls accessible and responsive.

Follow the supplied design law. Verify all affected controls in the browser,
including keyboard access, topic filters, draft practice, and admin actions.

## Validation and local delivery

Test the new language semantics, collection failures, local function scope,
recursion limits, and text/block behaviour. Run existing language and catalog
checks to detect regressions.

Test canonical URL variants, simultaneous imports, retries, stale attempts,
malformed AI output, unsupported problems, rights declarations, and manual
entry. Test contributor isolation, admin enforcement, stale approvals, and
publication of the checked revision only.

Exercise the complete local flow: sign in, import, generate, practise a draft,
review as admin, publish, filter, solve, and save. Verify that an ordinary user
cannot publish or read another user's private draft.

Apply migrations only to the local database for this delivery. Run the frontend
and API locally, report their URLs, and identify any real external-service checks
that could not run. Do not claim fixture-based checks prove live source access
or AI generation. Production migration and deployment await user confirmation.

## Future scope

See [the scope note](../../leetcode-import-scope.md). Defer linked nodes,
custom records, linked-list and tree problems that need them, heaps, priority
queues, and other unsupported language features. Each future extension needs
simple teaching examples, matching blocks, and execution checks.
