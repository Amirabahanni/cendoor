'use strict';
// Run before pushing to GitHub / deploying:  npm run preflight
// Checks the things that most often go wrong: Node version, secrets in the repo, files the host needs, and that the server
// really starts in demo mode and serves the main pages and the demo photos. Nothing here changes any file.
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..');
let bad = 0, warn = 0;
const ok = (m) => console.log('  ok    ' + m);
const no = (m) => { bad++; console.log('  FAIL  ' + m); };
const wn = (m) => { warn++; console.log('  warn  ' + m); };
const sh = (cmd, args) => { try { return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (_) { return null; } };

console.log('Node');
const [maj, min] = process.versions.node.split('.').map(Number);
(maj > 22 || (maj === 22 && min >= 13)) ? ok(`Node ${process.versions.node} (needs 22.13 or newer)`) : no(`Node ${process.versions.node} is too old: 22.13 or newer is needed for the built-in database`);

console.log('Files the host needs');
for (const f of ['Dockerfile', 'render.yaml', 'package.json', 'package-lock.json', 'server.js', 'public/demo/caftan.jpg', 'public/demo/dress.jpg', 'DEPLOY.md']) fs.existsSync(path.join(ROOT, f)) ? ok(f) : no(`missing ${f}`);

console.log('Git');
const inRepo = sh('git', ['rev-parse', '--is-inside-work-tree']) === 'true';
if (!inRepo) no('this folder is not a git repository (run: git init)');
else {
  const dirty = sh('git', ['status', '--porcelain']);
  dirty ? wn('there are uncommitted changes; commit them before pushing:\n' + dirty.split('\n').slice(0, 8).map(l => '          ' + l).join('\n')) : ok('working tree is clean');
  const authors = (sh('git', ['log', '--format=%an <%ae>']) || '').split('\n').filter(Boolean); const set = [...new Set(authors)];
  console.log('        commit authors: ' + (set.join(', ') || 'none') + '  (this is what GitHub will show)');
  const remote = sh('git', ['remote', '-v']); remote ? ok('remote: ' + remote.split('\n')[0]) : wn('no remote yet (DEPLOY.md step 2 adds it)');
  const tracked = (sh('git', ['ls-files']) || '').split('\n');
  tracked.some(f => /(^|\/)\.env$/.test(f)) ? no('.env is tracked by git: remove it (git rm --cached .env)') : ok('.env is not tracked');
  tracked.some(f => /^data\//.test(f)) ? no('the data/ folder (database, uploads) is tracked by git') : ok('database and uploads are not tracked');
  console.log('Secrets scan (tracked files)');
  const pats = [[/sk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'], [/EAA[A-Za-z0-9]{60,}/, 'Meta access token'], [/AKIA[0-9A-Z]{16}/, 'AWS access key'], [/-----BEGIN (RSA |EC )?PRIVATE KEY-----/, 'private key'], [/(secret|token|password)\s*[:=]\s*['"][A-Za-z0-9_\-]{24,}['"]/i, 'hard-coded secret']];
  let found = 0;
  for (const f of tracked) {
    if (!f || /\.(jpg|png|pdf|woff2?)$/i.test(f) || f === 'package-lock.json' || f === 'scripts/preflight.js') continue;
    let txt; try { txt = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (_) { continue; }
    for (const [re, label] of pats) if (re.test(txt)) { no(`${label} found in ${f}`); found++; }
  }
  if (!found) ok('no keys or tokens found in tracked files');
}

console.log('Server in demo mode');
function startAndCheck() {
  return new Promise(resolve => {
    const port = 3300 + Math.floor(Math.random() * 500); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cendoor-pf-'));
    const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), CENDOOR_DATA_DIR: dir, CENDOOR_DEMO: '1', NODE_ENV: 'production', CENDOOR_NETWORK_SECRET: 'preflight' }, stdio: 'ignore' });
    const get = async (p) => { try { const r = await fetch(`http://127.0.0.1:${port}${p}`); return { status: r.status, type: r.headers.get('content-type') || '', body: await r.text().catch(() => '') }; } catch (_) { return null; } };
    (async () => {
      let up = false; for (let i = 0; i < 40 && !up; i++) { await new Promise(r => setTimeout(r, 300)); const h = await get('/api/health'); up = !!(h && h.status === 200); }
      if (!up) { no('the server did not start within 12 seconds'); child.kill(); return resolve(); }
      ok('server started and /api/health answers');
      for (const [p, what, test] of [['/', 'landing page', r => /cendoor/i.test(r.body)], ['/how-it-works', 'how it works page', r => /Everything Cendoor does/.test(r.body)], ['/img/p-home.jpg', 'dashboard screenshot', r => /image\/jpeg/.test(r.type)], ['/s/atlas-boutique', 'demo storefront', r => r.status === 200], ['/app', 'dashboard', r => /root/.test(r.body)], ['/api/shop/atlas-boutique', 'shop data (JSON)', r => /atlas/i.test(r.body) && /image/.test(r.body)], ['/demo/caftan.jpg', 'demo photo', r => /image\/jpeg/.test(r.type) && r.status === 200]]) {
        const r = await get(p); r && r.status === 200 && test(r) ? ok(`${p}  (${what})`) : no(`${p} (${what}) did not respond correctly`);
      }
      const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@cendoor.com', password: 'demo1234' }) }).then(r => r.status).catch(() => 0);
      login === 200 ? ok('demo login works') : no('demo login failed (status ' + login + ')');
      child.kill(); setTimeout(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} resolve(); }, 400);
    })();
  });
}
startAndCheck().then(() => {
  console.log('\n' + (bad ? `${bad} problem(s) to fix` : 'All checks passed') + (warn ? `, ${warn} warning(s)` : '') + '.');
  process.exit(bad ? 1 : 0);
});
