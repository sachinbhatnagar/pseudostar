# LeetCode import scope

Design decisions agreed during brainstorming on 9 September 2026.
Implementation is not complete. The consolidated
[design spec](superpowers/specs/2026-09-09-leetcode-import-design.md) awaits review.

## Learning principle

Design for Grade 8 learners and above. Keep instructions short and use familiar
words. Introduce one concept at a time. Explain a technical term when it first
appears. Keep pseudocode and blocks consistent so learners can move between them.
Advanced problems must remain understandable without prior knowledge of another
programming language. Show prerequisites and small examples before complex tasks.
Provide progressive hints. Keep the reference solution behind an explicit reveal.

## Agreed first release

- Extend the existing language engine and provide matching blocks.
- Support lists, indexed access, strings, and nested lists for matrices.
- Support WHILE loops, functions with parameters and return values, local
  variables, and recursion.
- Support maps and sets.
- Apply limits to execution, recursion, and collection sizes.
- Accept LeetCode links. Allow manual entry of statements, examples, and
  constraints when automatic import fails. Retain the source link.
- Prevent duplicate imports of the same source problem.
- Generate original solutions with AI. Use internal reasoning to produce clear
  pseudocode, a concise algorithm explanation, and test cases.
- Run automated checks and require admin review before shared publication.
- Add an admin panel. Give mailme@sachinbhatnagar.com admin access through the
  existing sign-in flow.
- Build on feat/leetcode-import and run locally for user testing. Deployment
  requires separate user confirmation.

## Future scope

These items are deferred, not part of the first release:

- Linked-list and tree problems that require linked nodes or custom records.
- Custom record types and blocks for creating and changing their fields.
- Specialised data structures, including heaps and priority queues.
- Additional language features required by problems the first release cannot run.

For each future feature, add a simple teaching example, matching pseudocode and
blocks, and execution checks. Keep problems that require unsupported features
unpublished and explain what is missing. Do not silently change the problem to
fit the current language.
