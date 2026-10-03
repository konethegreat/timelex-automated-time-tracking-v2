import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyWorkflow, verifyFailure } from './verify-workflow.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verify = process.argv.includes('--verify');
const container = 'timelex-demo-' + randomBytes(6).toString('hex');
const children = new Set();
let containerCreated = false;
let cleanupPromise;
let stopping = false;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function command(binary, args, env, capture = false, allowFailure = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd: root, env, windowsHide: true,
      stdio: ['ignore', capture ? 'pipe' : 'inherit', capture ? 'pipe' : 'inherit'] });
    children.add(child);
    let stdout = '';
    let stderr = '';
    if (capture) child.stdout.on('data', chunk => { stdout += chunk; });
    if (capture) child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => { children.delete(child); reject(error); });
    child.on('exit', code => {
      children.delete(child);
      if (code !== 0 && !allowFailure) reject(new Error(binary + ' command failed (' + code + ')'));
      else resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    await command('taskkill', ['/PID', String(child.pid), '/T', '/F'], process.env, true, true);
  } else {
    child.kill('SIGTERM');
    const deadline = Date.now() + 5000;
    while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) await pause(50);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
  children.delete(child);
}

async function cleanup() {
  if (cleanupPromise) return cleanupPromise;
  stopping = true;
  cleanupPromise = (async () => {
    for (const child of [...children]) await stop(child);
    if (containerCreated) {
      const removed = await command('docker', ['rm', '--force', container], process.env, true, true);
      if (removed.code !== 0 && !removed.stderr.includes('No such container')) throw new Error('Could not remove owned disposable container ' + container);
    }
    console.log('Demo processes stopped and the disposable database removed.');
  })();
  return cleanupPromise;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await cleanup(); process.exit(0); });

async function availablePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function startApp(env) {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', env.PORT],
    { cwd: root, env, windowsHide: true, stdio: ['ignore', 'inherit', 'inherit'] });
  children.add(child);
  let failure;
  child.on('error', error => { failure = error; });
  child.on('exit', () => { children.delete(child); });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (failure) throw failure;
    if (child.exitCode !== null) throw new Error('Demo application exited during startup');
    try {
      const response = await fetch(env.AUTH_URL + '/api/auth/providers', { signal: AbortSignal.timeout(2000) });
      if (response.ok) return child;
    } catch { /* wait for the owned server */ }
    await pause(200);
  }
  throw new Error('Demo application did not become ready');
}

async function main() {
  const password = verify ? randomBytes(24).toString('hex') + 'Aa1!' : process.env.DEMO_PASSWORD;
  if (!password || password.length < 12) throw new Error('Set a temporary DEMO_PASSWORD of at least 12 characters, then run npm run demo.');
  const databasePassword = randomBytes(32).toString('hex');
  const dockerEnv = { ...process.env, POSTGRES_PASSWORD: databasePassword, POSTGRES_DB: 'timelex_demo' };
  await command('docker', ['run', '--rm', '-d', '--name', container, '--label', 'timelex.disposable-demo=true',
    '-p', '127.0.0.1::5432', '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB', 'postgres:16-alpine'], dockerEnv, true);
  containerCreated = true;
  const mapping = await command('docker', ['port', container, '5432/tcp'], process.env, true);
  const databasePort = mapping.stdout.split(':').at(-1);
  const port = await availablePort();
  const baseUrl = 'http://127.0.0.1:' + port;
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(port),
    DATABASE_URL: 'postgresql://postgres:' + databasePassword + '@127.0.0.1:' + databasePort + '/timelex_demo',
    AUTH_SECRET: randomBytes(32).toString('hex'), AUTH_URL: baseUrl, NEXTAUTH_URL: baseUrl, NEXTAUTH_SECRET: '',
    DEMO_PASSWORD: password, TIMELEX_DISPOSABLE_DEMO: 'true', NEXT_PUBLIC_TIMELEX_DEMO_MODE: 'true',
    NEXT_TELEMETRY_DISABLED: '1', ALLOW_DEV_AUTH_BYPASS: 'false',
    DEV_SESSION_USER_ID: '', DEV_SESSION_ORG_ID: '', DEV_SESSION_EMAIL: '',
    AUTH_MICROSOFT_ENTRA_ID_ID: '', AUTH_MICROSOFT_ENTRA_ID_SECRET: '', AUTH_MICROSOFT_ENTRA_ID_ISSUER: '',
    ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', SYNC_GATEWAY_SIMULATE_FAILURE: 'false' };
  const deadline = Date.now() + 60000;
  while ((await command('docker', ['exec', container, 'pg_isready', '-U', 'postgres'], process.env, true, true)).code !== 0) {
    if (Date.now() > deadline) throw new Error('Disposable PostgreSQL did not become ready');
    await pause(200);
  }
  await command(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push'], env);
  await command(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], env);
  if (verify) {
    const reseed = await command(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], env, true, true);
    if (reseed.code === 0 || !reseed.stderr.includes('requires an empty database')) throw new Error('Populated-database seed guard did not refuse reseeding');
    console.log('Verified: synthetic seed refuses an already populated database without deleting data.');
  }
  await command(process.execPath, ['node_modules/next/dist/bin/next', 'build'], env);
  const app = await startApp(env);
  if (verify) {
    const result = await verifyWorkflow(baseUrl, password);
    await stop(app);
    const failureEnv = { ...env, SYNC_GATEWAY_SIMULATE_FAILURE: 'true' };
    await startApp(failureEnv);
    result.failureSteps = await verifyFailure(baseUrl, password, result.failureEntryId);
    result.passed += result.failureSteps.length;
    delete result.failureEntryId;
    console.log(JSON.stringify(result, null, 2));
    await cleanup();
  } else {
    console.log('\nSynthetic demo: ' + baseUrl + '/login');
    console.log('Sign in with a demo.*@example.com account and your supplied DEMO_PASSWORD.');
    console.log('Stop with Ctrl+C to discard the database. No provider credentials or auth bypass are enabled.');
    await new Promise((resolve, reject) => { app.on('exit', (code, signal) =>
      stopping || code === 0 || signal === 'SIGINT' || code === 3221225786 || code === -1073741510
        ? resolve() : reject(new Error('Demo server exited'))); });
    await cleanup();
  }
}
main().catch(async error => { console.error(error.message); await cleanup(); process.exitCode = 1; });
