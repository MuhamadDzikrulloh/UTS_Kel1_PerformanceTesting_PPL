/**
 * Membaca hasil di report-output/ lalu menulis DOKUMENTASI-HASIL.html
 * (jalankan setelah Playwright + k6, atau lewat npm run perf:all).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'report-output');
const shotsDir = path.join(outDir, 'screenshots');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dataUri(file) {
  if (!fs.existsSync(file)) return '';
  const buf = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function readJson(p, fallback = null) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return fallback;
  }
}

function pickHttpDuration(metrics) {
  if (!metrics) return null;
  const key = Object.keys(metrics).find((k) => k.startsWith('http_req_duration') && k.includes('expected_response'));
  if (key && metrics[key].values) return metrics[key].values;
  const d = metrics.http_req_duration;
  return d && d.values ? d.values : null;
}

function formatVals(v) {
  if (!v || typeof v !== 'object') return '—';
  return Object.entries(v)
    .map(([k, val]) => {
      const s = typeof val === 'number' && Number.isFinite(val)
        ? (Number.isInteger(val) ? String(val) : val.toFixed(3).replace(/\.?0+$/, ''))
        : String(val);
      return `${k}: ${s}`;
    })
    .join(' · ');
}

function excerptK6(log) {
  if (!log) return '(Belum ada log k6.)';
  const i = log.lastIndexOf('█ THRESHOLDS');
  if (i >= 0) return log.slice(i).trim();
  return log.split('\n').slice(-85).join('\n');
}

const pw = readJson(path.join(outDir, 'playwright-summary.json'), {});
const k6m = readJson(path.join(outDir, 'k6-metrics.json'), null);
const k6log = fs.existsSync(path.join(outDir, 'k6-run.log'))
  ? fs.readFileSync(path.join(outDir, 'k6-run.log'), 'utf-8')
  : '';

const httpDur = pickHttpDuration(k6m);
const httpReqs = k6m && k6m.http_reqs && k6m.http_reqs.values ? k6m.http_reqs.values : null;
const httpFail = k6m && k6m.http_req_failed && k6m.http_req_failed.values ? k6m.http_req_failed.values : null;
const checks = k6m && k6m.checks && k6m.checks.values ? k6m.checks.values : null;

const rows = [
  ['Durasi HTTP (respons sukses)', httpDur],
  ['http_reqs', httpReqs],
  ['http_req_failed', httpFail],
  ['checks', checks],
]
  .filter(([, v]) => v != null)
  .map(
    ([name, v]) =>
      `<tr><td><strong>${esc(name)}</strong></td><td>${esc(formatVals(v))}</td></tr>`,
  )
  .join('');

const shotNames = ['01-halaman-login.png', '02-halaman-produk.png'];
const figures = shotNames
  .map((name) => {
    const uri = dataUri(path.join(shotsDir, name));
    if (!uri) return `<p class="muted">Screenshot tidak ditemukan: ${esc(name)}</p>`;
    const cap =
      name.includes('login') ? 'Halaman login SauceDemo (sebelum submit).' : 'Halaman daftar produk setelah login.';
    return `<figure class="shot"><img src="${uri}" width="800" alt="${esc(name)}"/><figcaption>${esc(cap)}</figcaption></figure>`;
  })
  .join('\n');

const totalMs = pw.totalMs;
const generatedAt = new Date().toISOString();

const kesimpulan = `
  <ul>
    <li><strong>Playwright:</strong> skenario satu pengguna dari buka situs hingga halaman produk selesai
    ${totalMs != null ? `dalam <strong>${esc(String(totalMs))} ms</strong>` : '(jalankan ulang tes)'}, menunjukkan alur end-to-end berjalan dalam waktu yang terukur.</li>
    <li><strong>k6:</strong> load test membebani URL utama dengan beberapa virtual user; metrik utama tercantum pada tabel. Threshold di skrip: p95 &lt; 5000 ms, error rate &lt; 5%, checks &gt; 95%.</li>
    <li><strong>Catatan:</strong> SauceDemo berbasis SPA — load test HTTP mengukur halaman entry; login penuh diwakili oleh Playwright.</li>
  </ul>
`;

const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Dokumentasi &amp; Hasil — Performance Testing SauceDemo</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: "Segoe UI", system-ui, sans-serif; line-height: 1.55; max-width: 920px; margin: 0 auto; padding: 2rem 1.25rem 3rem; color: #1a1a1a; background: #f6f7f9; }
    h1 { font-size: 1.5rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    h2 { font-size: 1.15rem; margin-top: 2rem; color: #222; }
    .meta { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1rem 1.25rem; margin: 1rem 0; }
    .muted { color: #555; font-size: 0.92rem; }
    table { width: 100%; border-collapse: collapse; background: #fff; font-size: 0.95rem; box-shadow: 0 1px 3px rgba(0,0,0,.06); border-radius: 8px; overflow: hidden; }
    th, td { border: 1px solid #e2e2e2; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: #eef1f5; }
    pre { background: #1e1e1e; color: #e8e8e8; padding: 14px; border-radius: 8px; overflow: auto; font-size: 0.78rem; white-space: pre-wrap; word-break: break-word; }
    .shot { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin: 1rem 0; }
    .shot img { max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; }
    figcaption { margin-top: 8px; font-size: 0.88rem; color: #444; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 0.88em; }
  </style>
</head>
<body>
  <h1>Performance Testing — SauceDemo</h1>
  <p class="muted">UTS Kelompok · Pengujian Perangkat Lunak · RM23B</p>

  <div class="meta">
    <p><strong>Dokumen ini dibuat otomatis</strong> setelah pengujian selesai.</p>
    <p class="muted">HTML digenerate: ${esc(generatedAt)}<br/>
    ${pw.finishedAt ? `Playwright selesai: ${esc(pw.finishedAt)}` : ''}</p>
  </div>

  <h2>1. Ringkasan eksekusi</h2>
  <table>
    <tr><th>Jenis uji</th><th>Ringkasan</th></tr>
    <tr>
      <td>Playwright (E2E)</td>
      <td>${totalMs != null ? `Total waktu skenario: <strong>${esc(String(totalMs))} ms</strong>` : 'Belum ada data — jalankan <code>npm run test:perf</code>.'}</td>
    </tr>
    <tr>
      <td>k6 (load HTTP)</td>
      <td>${k6m ? 'Metrik tersimpan di <code>report-output/k6-metrics.json</code>.' : 'Belum ada data — jalankan <code>npm run load:ci</code> setelah folder <code>report-output</code> ada.'}</td>
    </tr>
  </table>

  <h2>2. Tujuan &amp; lingkup</h2>
  <p>Mengukur waktu respons alur <strong>login → halaman produk</strong> (satu pengguna) dengan Playwright, dan perilaku <strong>beban HTTP</strong> pada halaman utama dengan k6.</p>

  <h2>3. Bukti visual — Playwright</h2>
  ${figures}

  <h2>4. Ringkasan metrik — k6</h2>
  ${rows ? `<table><thead><tr><th>Metrik</th><th>Nilai agregat</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="muted">Belum ada <code>k6-metrics.json</code>. Jalankan load test (Docker).</p>'}

  <h2>5. Cuplikan output k6</h2>
  <pre>${esc(excerptK6(k6log))}</pre>

  <h2>6. Kesimpulan</h2>
  ${kesimpulan}

  <h2>7. Lampiran berkas</h2>
  <ul class="muted">
    <li><code>report-output/playwright-summary.json</code></li>
    <li><code>report-output/screenshots/*.png</code></li>
    <li><code>report-output/k6-metrics.json</code></li>
    <li><code>report-output/k6-run.log</code></li>
    <li>Laporan HTML Playwright: <code>playwright-report/index.html</code> (setelah <code>npm run test:perf</code>)</li>
  </ul>
</body>
</html>`;

const dest = path.join(outDir, 'DOKUMENTASI-HASIL.html');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(dest, html, 'utf-8');
console.log('Tulis:', dest);
