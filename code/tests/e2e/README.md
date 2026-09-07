# Browser tests

Run from `code` with Node 24 and the existing Vite server at `http://127.0.0.1:5173`:

```sh
npm run test:e2e
```

If the installed browser differs from the Playwright package version, use its executable:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/path/to/installed/chrome" npm run test:e2e
```

`PLAYWRIGHT_BASE_URL` can select another local Vite address. The configuration does not start servers or install browsers.

Every test gets a fresh browser context and an in-memory API fixture. Routes intercept all `/api/**` requests before navigation. Unknown requests fail the test. OTP, program revisions, account ownership, offline responses, and delayed saves use these fixtures. No real email or account service is tested. Browser workers, editors, storage, and UI run unchanged.

Tests use real controls and event-based assertions. Retries are disabled. Failure screenshots and traces are saved in `pseudostar-e2e-results` under the operating system temporary directory.

Controller regressions run separately:

```sh
npx vitest run tests/programs
```
