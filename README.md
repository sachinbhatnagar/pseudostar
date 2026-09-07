# PseudoStar

A computing practice app for young learners. Build a program with blocks, read its pseudocode, run it, and learn from the result.

PseudoStar began as a way to help one child learn pseudocode. Its longer-term purpose is to support ICT and Computing lessons. The current app focuses on programming; broader subject coverage is future scope.

## What learners can do

- **Build with blocks or text.** Use the Blockly editor, the pseudocode editor, or Split Screen to see both.
- **Run programs in the browser.** Enter inputs and inspect outputs through a bounded execution engine in a Web Worker.
- **Practise with problems.** Choose easy, medium, or hard exercises and check a solution against the task's requirements.
- **Compare solutions.** View the reference beside the current draft. Replacing a draft with the reference requires confirmation.
- **Keep their work.** Guests use a local program library. Email sign-in adds account storage, with local recovery drafts and delete/restore support.
- **Ask for explanations.** Signed-in learners can explain a whole program or a selected block. A separate checklist identifies remaining task requirements.

AI explanations use Groq and can be incorrect. They support learning; they do not certify that a solution is correct. The shared limit is 200 explanations per account per UTC day.

## Run locally

Use **Node.js 24**, npm, and `unzip`. All app commands run from `code/`.

```sh
git clone https://github.com/sachinbhatnagar/pseudostar.git
cd pseudostar/code
npm ci
npm run fonts:setup
npm run dev
```

Open [127.0.0.1:5173](http://127.0.0.1:5173). This starts the frontend for guest editing and execution. Account features need the local API described below.

Font setup downloads Sentient from its publisher and checks the included licence. It needs internet access. See [font setup and usage](code/public/fonts/README.md).

### Add the local API

Create a local configuration file from the supplied template:

```sh
cp .dev.vars.example .dev.vars
```

Set the values needed for the features you want to use:

| Variable          | Purpose                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| `APP_ORIGIN`      | Keep `http://127.0.0.1:5173` for the default local setup.              |
| `RESEND_FROM`     | Sender address on a verified Resend domain.                            |
| `RESEND_API_KEY`  | Email delivery for sign-in codes.                                      |
| `OTP_HMAC_SECRET` | Secret for sign-in code protection; generate at least 32 random bytes. |
| `GROQ_API_KEY`    | AI explanations.                                                       |

Keep `.dev.vars` private. It is ignored by Git. A real Resend key sends real email, even during local development.

```sh
npm run db:local
npm run build
npm run dev:api
```

Keep `npm run dev` running in a second terminal. Vite forwards `/api` requests to the local Worker on port 8787. `db:local` applies migrations to local D1 storage.

## How it is built

React and TypeScript provide the interface. Blockly and CodeMirror share a pseudocode language model. Parsing and execution run locally; a Cloudflare Worker serves the built app and its API. Cloudflare D1 stores account data and programs. Resend delivers sign-in codes rendered with React Email. Groq provides explanations through the server API.

Source text is the saved program's source of truth. The app rebuilds blocks from that text. Private reference answers remain on the server and can be supplied as context for AI explanations.

| Path               | Contents                                                                    |
| ------------------ | --------------------------------------------------------------------------- |
| `code/src/`        | Interface, editors, language tools, browser workers, and problem catalogue. |
| `code/worker/`     | Authentication, programs, progress, explanations, and cleanup API logic.    |
| `code/internal/`   | Private reference solutions.                                                |
| `code/migrations/` | D1 database migrations.                                                     |
| `code/emails/`     | Sign-in email templates.                                                    |
| `code/tests/`      | Unit, Worker integration, and browser tests.                                |
| `references/`      | Learning references used to guide pseudocode syntax and exercises.          |
| `docs/`            | Design specifications and implementation plans.                             |

## Development checks

Run from `code/`:

```sh
npm run typecheck
npm test
npm run test:worker
npm run test:preflight
npm run build
```

For browser tests, keep the Vite server running on port 5173:

```sh
npm exec playwright install chromium
npm run test:e2e
```

Browser tests use isolated API fixtures. Worker tests exercise local D1 with intercepted email and AI requests. Neither suite proves live email delivery or authenticated production behavior. See [browser test setup](code/tests/e2e/README.md).

Use `npm run storybook` for component and email previews, or `npm run build-storybook` to build them.

## Deployment

The checked-in Cloudflare configuration targets [pseudostar.stacksauce.dev](https://pseudostar.stacksauce.dev). It serves the Vite build and API from one Worker, with D1 storage and scheduled cleanup.

For your own deployment, set your Worker, domain, D1 binding, and secrets first. Follow the [deployment guide](code/docs/deployment.md). Database migrations are a separate operation from app deployment.

```sh
npm run build
npm run deploy:preflight
npm run deploy
```

Preflight checks local configuration and build assets. `deploy` builds and publishes to the configured Cloudflare target. Check the target before running it.

## Project direction

The next scope can extend learning beyond pseudocode into wider ICT and Computing topics. Those modules are not implemented yet. PseudoStar remains the project name until a replacement is chosen.

For more technical detail, see the [app README](code/README.md), [API contracts](code/worker/API.md), and [product brief](PRODUCT.md).
