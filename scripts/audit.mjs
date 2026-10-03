import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { knownAdvisory, validateAudit } from './audit-policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

function audit(production) {
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error('Run the dependency policy through npm run audit.');
  const args = [npm, 'audit', '--json', ...(production ? ['--omit=dev'] : [])];
  const result = spawnSync(process.execPath, args, {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error || ![0, 1].includes(result.status)) throw new Error('npm audit did not complete successfully');
  let report;
  try { report = JSON.parse(result.stdout); }
  catch { throw new Error('npm audit did not return valid JSON'); }
  return report;
}

async function main() {
  const lockfile = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
  validateAudit(audit(true), lockfile, true);
  console.log('Production dependency audit: zero findings at every severity.');
  const result = validateAudit(audit(false), lockfile);
  if (result.total === 0) {
    console.log('Full dependency audit: zero findings.');
  } else {
    console.warn('Full dependency audit: ' + result.total + ' high findings in the reviewed development lint chain.');
    console.warn('Unpatched exception: ' + knownAdvisory);
    console.warn('Affected packages: ' + result.accepted.join(', '));
    console.warn('Any other finding, severity change or runtime use fails this check. See docs/DEPENDENCIES.md and issue #13.');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
