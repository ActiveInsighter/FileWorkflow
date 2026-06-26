import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const extensionDir = resolve('extension');
const outDir = resolve('dist/extension');

const filesToCopy = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'options.html'
];

for (const file of filesToCopy) {
  const from = resolve(extensionDir, file);
  const to = resolve(outDir, file);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
}

const zipPath = resolve('dist/fileworkflow-chrome-extension.zip');
await rm(zipPath, { force: true });

try {
  await execFileAsync('zip', ['-9', '-r', zipPath, '.'], { cwd: outDir });
  console.log(`Generated ${zipPath}`);
} catch (error) {
  console.warn('Skipped extension zip generation because zip is not available in this environment.');
  console.warn(error instanceof Error ? error.message : String(error));
}

console.log(`Generated Chrome extension directory: ${outDir}`);
