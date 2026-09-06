# PseudoStar

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Use React and TypeScript with Blockly for the complete production application. The current editor is an incomplete implementation, not a release. Deployment must use Cloudflare Workers. Email must use Resend, React Email, and Storybook.

## Users

The initial learner is the user's daughter, a Grade 8 student practising from Stage 9 computing material. Public email OTP signup is required.

## Product Purpose

Help learners develop programming and reasoning skills through executable textbook pseudocode. Learners can compose blocks or edit text, run programs, understand errors, and improve their own work.

## Operating Context

The source of truth is the 20 Markdown exercises in references/. They cover input, output, arithmetic, selection, count-controlled loops, and sub-routines. Preserve their syntax and formatting styles. Five files have received approved logic corrections.

## Capabilities and Constraints

- Build the application inside code/.
- Support both block and text editing, with safe synchronisation.
- Provide at least 50 problems, ranked Easy, Medium, and Hard; 60 were proposed.
- Load starters with progressive hints, not complete answers.
- Support program execution, useful errors, and saved program management.
- Public email OTP accounts with private saved programs.
- Use Cloudflare Workers and Resend. Credentials will be supplied through environment configuration.
- Use React Email for email templates and Storybook for preview and development.

## Brand Commitments

The interface must look carefully designed. Pseudocode blocks must look cool and show real textbook syntax. Use real Blockly-backed editing with a custom visual treatment. Deliver the complete production application, not a prototype or MVP. Follow the supplied anti-slop design rules.

## Product Principles

- Encourage thinking before giving help.
- Keep the learner's work recoverable.
- Explain errors in plain language.
- Preserve the textbook language instead of substituting another pseudocode dialect.
- Use interaction to explain program structure.

## Open Decisions

The deployment domain and verified sender address will be selected during deployment configuration.
