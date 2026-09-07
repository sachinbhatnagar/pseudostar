import test from 'node:test';
import assert from 'node:assert/strict';
import { configErrors } from './preflight.mjs';

const configured = () => ({
  name: 'pseudostar',
  main: 'worker/index.ts',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'pseudostar',
      database_id: '01234567-1234-4321-9876-abcdefabcdef',
      migrations_dir: 'migrations',
    },
  ],
  vars: {
    APP_ORIGIN: 'https://pseudostar.account.workers.dev',
    RESEND_FROM: 'PseudoStar <signin@school.edu>',
  },
  assets: { directory: './dist', binding: 'ASSETS', run_worker_first: ['/api', '/api/*'] },
  triggers: { crons: ['17 3 * * *'] },
});
test('accepts configured values and UUIDs starting with zero', () =>
  assert.deepEqual(configErrors(configured()), []));
test('rejects deployment placeholders', () => {
  const config = configured();
  config.d1_databases[0].database_id = 'REPLACE_WITH_CONFIRMED_D1_ID';
  assert.ok(configErrors(config).length);
});
test('rejects origins that break deployed cookie or origin rules', () => {
  for (const origin of [
    'http://pseudostar.account.workers.dev',
    'https://app.example.com',
    'https://pseudostar.account.workers.dev/',
    'https://pseudostar.account.workers.dev/path',
    'https://user:pass@pseudostar.account.workers.dev',
  ]) {
    const config = configured();
    config.vars.APP_ORIGIN = origin;
    assert.ok(configErrors(config).length, origin);
  }
});
test('rejects missing routing, invalid D1 identity, plaintext secrets and test senders', () => {
  for (const change of [
    (c) => c.assets.run_worker_first.pop(),
    (c) => (c.d1_databases[0].database_id = '00000000-0000-0000-0000-000000000000'),
    (c) => (c.vars.RESEND_API_KEY = 'not-a-real-key'),
    (c) => (c.vars.RESEND_FROM = 'onboarding@resend.dev'),
  ]) {
    const config = configured();
    change(config);
    assert.ok(configErrors(config).length);
  }
});
