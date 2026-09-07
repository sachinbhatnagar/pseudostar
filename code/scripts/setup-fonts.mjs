import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { root } from './preflight.mjs';

// Obtain the font directly from its publisher; do not redistribute the binary.
const source = 'https://api.fontshare.com/v2/fonts/download/sentient';
const temporary = await mkdtemp(join(tmpdir(), 'pseudostar-fonts-'));
try {
  const response = await fetch(source, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error('Fontshare download failed. Try again later.');
  const archive = join(temporary, 'sentient.zip');
  await writeFile(archive, new Uint8Array(await response.arrayBuffer()));
  const extract = (name) =>
    execFileSync('unzip', ['-p', archive, `Sentient_Complete/${name}`], { maxBuffer: 2_000_000 });
  const license = extract('License/FFL.txt');
  const knownLicense = await readFile(resolve(root, 'public/fonts/FFL.txt'));
  if (!license.equals(knownLicense))
    throw new Error('Fontshare licence changed. Review the official licence before installing.');
  const font = extract('Fonts/WEB/fonts/Sentient-Variable.woff2');
  if (font.subarray(0, 4).toString() !== 'wOF2')
    throw new Error('The download is not a WOFF2 font.');
  await mkdir(resolve(root, 'public/fonts'), { recursive: true });
  await writeFile(resolve(root, 'public/fonts/sentient-variable.woff2'), font);
  console.log(
    'Installed official Sentient variable font for this app. Keep font binaries out of Git.',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
