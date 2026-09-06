import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const placeholder = /REPLACE|CHANGE_ME|YOUR[_-]|<[^>]+>/i;
export function configErrors(config) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  function scan(value, path = 'config') {
    if (typeof value === 'string' && placeholder.test(value))
      errors.push(`${path}: replace the placeholder.`);
    if (value && typeof value === 'object')
      for (const [key, entry] of Object.entries(value)) scan(entry, `${path}.${key}`);
  }
  // Sender display names legitimately contain angle brackets.
  scan({ ...config, vars: { ...config.vars, RESEND_FROM: undefined } });
  check(
    typeof config.name === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(config.name),
    'Set a valid Worker name.',
  );
  check(config.main === 'worker/index.ts', 'Set main to worker/index.ts.');
  check(config.compatibility_flags?.includes('nodejs_compat'), 'Enable nodejs_compat.');
  const databases = config.d1_databases ?? [];
  const db = databases.find((value) => value.binding === 'DB');
  check(
    databases.filter((value) => value.binding === 'DB').length === 1,
    'Bind one D1 database as DB.',
  );
  check(
    typeof db?.database_id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(db.database_id) &&
      db.database_id !== '00000000-0000-0000-0000-000000000000',
    'Set DB.database_id to the UUID returned by Cloudflare.',
  );
  check(
    typeof db?.database_name === 'string' && !!db.database_name.trim(),
    'Set the D1 database name.',
  );
  check(db?.migrations_dir === 'migrations', 'Set DB.migrations_dir to migrations.');
  try {
    const origin = new URL(config.vars?.APP_ORIGIN);
    check(
      origin.protocol === 'https:' &&
        origin.origin === config.vars.APP_ORIGIN &&
        origin.hostname.includes('.') &&
        !/(^|\.)(localhost|example\.(com|org|net)|invalid|test)$/.test(origin.hostname),
      'Set APP_ORIGIN to the exact public HTTPS origin, with no trailing slash.',
    );
  } catch {
    errors.push('Set APP_ORIGIN to the public HTTPS origin.');
  }
  const sender = config.vars?.RESEND_FROM ?? '';
  const address = sender.match(/<([^<>]+)>$/)?.[1] ?? sender;
  check(
    !/REPLACE|CHANGE_ME|YOUR[_-]/i.test(sender) &&
      /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) &&
      !/@(?:.*\.)?(example\.(com|org|net)|resend\.dev|invalid|test)$/i.test(address),
    'Set RESEND_FROM to an address on your verified Resend domain.',
  );
  check(
    !Object.keys(config.vars ?? {}).some((key) => /SECRET|API_KEY|TOKEN/i.test(key)),
    'Remove secrets from vars; use Wrangler secret put.',
  );
  check(
    config.assets?.directory === './dist' && config.assets?.binding === 'ASSETS',
    'Bind ./dist as ASSETS.',
  );
  check(
    config.assets?.run_worker_first?.includes('/api') &&
      config.assets?.run_worker_first?.includes('/api/*'),
    'Route /api and /api/* through the Worker first.',
  );
  check(config.triggers?.crons?.length > 0, 'Configure scheduled cleanup.');
  return errors;
}

export async function preflight(args = process.argv.slice(2)) {
  const configIndex = args.indexOf('--config');
  const allowed = new Set(['--config-only', '--config']);
  const unexpected = args
    .filter((arg, index) => index !== configIndex + 1 || configIndex < 0)
    .filter((arg) => !allowed.has(arg));
  if (unexpected.length || (configIndex >= 0 && !args[configIndex + 1]))
    throw new Error('Use [--config FILE] [--config-only].');
  const path = resolve(root, configIndex >= 0 ? args[configIndex + 1] : 'wrangler.jsonc');
  if (dirname(path) !== root)
    throw new Error('Keep the selected config directly in code/ so relative paths match Wrangler.');
  const parsed = ts.parseConfigFileTextToJson(path, await readFile(path, 'utf8'));
  if (parsed.error || !parsed.config || typeof parsed.config !== 'object')
    throw new Error('Cannot parse the Wrangler JSON/JSONC config.');
  const errors = configErrors(parsed.config);
  const files = [
    'worker/index.ts',
    'migrations/0001_initial.sql',
    'public/_headers',
    'public/fonts/sentient-variable.woff2',
    'public/fonts/FFL.txt',
  ];
  if (!args.includes('--config-only'))
    files.push(
      'dist/index.html',
      'dist/_headers',
      'dist/fonts/sentient-variable.woff2',
      'dist/fonts/FFL.txt',
    );
  for (const file of files) {
    try {
      await access(resolve(root, file));
    } catch {
      errors.push(`Missing ${file}. Run font setup and build as needed.`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    'Local preflight passed. Account, D1 identity/migrations, secrets, DNS, sender verification and live behavior are not checked.',
  );
  return path;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  preflight().catch((error) => {
    console.error(`Preflight failed:\n${error.message}`);
    process.exitCode = 1;
  });
}
