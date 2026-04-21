/**
 * Urutan: siapkan folder → Playwright (Chromium) → k6 → bangun DOKUMENTASI-HASIL.html
 * Butuh Docker untuk k6.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const reportOut = path.join(root, 'report-output');

fs.mkdirSync(path.join(reportOut, 'screenshots'), { recursive: true });

function run(cmd, opt = {}) {
  return execSync(cmd, {
    cwd: root,
    encoding: 'utf-8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: opt.stdio || 'pipe',
    ...opt,
  });
}

console.log('(1/3) Playwright — tests/performance.spec.js (Chromium)…');
run('npx playwright test tests/performance.spec.js --project=chromium --reporter=html', {
  stdio: 'inherit',
});

console.log('\n(2/3) k6 load test — npm run load:ci (~1–2 menit)…');
let k6log = '';
try {
  k6log = run('npm run load:ci 2>&1');
} catch (e) {
  k6log = [e.stdout, e.stderr].filter(Boolean).join('\n') || String(e.message || e);
  console.error('k6: exit non-zero — HTML tetap dibuat jika ada sebagian data.');
}
fs.writeFileSync(path.join(reportOut, 'k6-run.log'), k6log);

console.log('\n(3/3) Bangun DOKUMENTASI-HASIL.html…');
run('node scripts/build-doc-html.js', { stdio: 'inherit' });

console.log('\nSelesai. Buka: report-output/DOKUMENTASI-HASIL.html');
