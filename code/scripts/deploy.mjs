import { spawnSync } from 'node:child_process';
import { preflight, root } from './preflight.mjs';
import { resolve } from 'node:path';

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Deployment stopped because a command failed.');
}

try {
  const args = process.argv.slice(2);
  if (args.includes('--config-only')) throw new Error('Use deploy.mjs [--config FILE].');
  const config = await preflight([...args, '--config-only']);
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);
  await preflight(args);
  const wrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
  run(process.execPath, [wrangler, 'whoami']);
  run(process.execPath, [wrangler, 'deploy', '--config', config]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
