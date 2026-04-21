# Dokumentasi Performance Testing — SauceDemo

**UTS Kelompok 1 — Performance Testing**

Disusun untuk memenuhi tugas mata kuliah Pengujian Perangkat Lunak  
**Dosen:** Brian Damastu, M.Kom.

| | |
|---|---|
| **Nama** | Muhamad Dzikrulloh, Herdyansah |
| **Jenis** | Performance Testing |
| **Kelas** | RM23B Reguler Malam Online |

Dokumen ini menggabungkan dokumentasi awal (pengujian single-user dengan Playwright) dengan pengembangan berikutnya (**load testing** menggunakan Grafana k6), sehingga mencakup skenario satu pengguna dan skenario beban konkuren pada lapisan HTTP.

---

## 1. Tujuan

1. Mengukur **waktu respon** website pada alur **login hingga halaman produk tampil** (satu pengguna), menggunakan **Playwright**.
2. Melakukan **load testing** pada **endpoint publik** (halaman utama) untuk melihat perilaku sistem di bawah **beberapa pengguna virtual**, menggunakan **k6** — melengkapi keterbatasan pengujian single-user.

---

## 2. Tools dan Teknologi

| Tool | Kegunaan |
|------|----------|
| **Playwright** | Otomatisasi browser; mengukur durasi end-to-end (login → produk). |
| **Node.js** | Runtime untuk menjalankan tes Playwright dan skrip npm. |
| **Grafana k6** | Load testing HTTP (virtual users, metrik latensi & throughput). |
| **Docker** | Menjalankan k6 tanpa instalasi binary di mesin lokal (`grafana/k6`). |
| **Website uji** | [SauceDemo](https://www.saucedemo.com/) |

---

## 3. Skenario Pengujian

### 3.1 Playwright (single user)

1. Membuka website SauceDemo.  
2. Mengisi username dan password (`standard_user` / `secret_sauce`).  
3. Menekan tombol login.  
4. Menunggu hingga halaman produk muncul (selector `.inventory_list`).

### 3.2 Load testing — k6 (beberapa pengguna virtual)

SauceDemo berupa **SPA**; login diproses di sisi browser, bukan lewat POST HTTP klasik ke server. Oleh karena itu skenario load test memuat **GET halaman utama** (`/`) berulang dengan banyak **virtual user (VU)** untuk mensimulasikan lalu lintas pengunjung ke halaman entry. Ini **melengkapi** ukuran waktu satu pengguna di Playwright, bukan menggantikan skenario login di browser.

**Parameter utama (file `load/saucedemo-load.js`):**

- Tahapan: ramp ke `K6_STAGE_TARGET` VU (default 10), pertahankan, lalu ramp down.  
- **Threshold:** `p(95)` latensi &lt; 5000 ms, tingkat gagal &lt; 5%, checks &gt; 95%.  
- Variabel lingkungan opsional: `TARGET_URL`, `K6_STAGE_TARGET`, `K6_SLEEP_SEC`.

---

## 4. Langkah-langkah Pengujian

### 4.1 Persiapan proyek

```bash
cd performance-testing
npm ci
npx playwright install
```

*(Pertama kali bisa memakai `npm install` menggantikan `npm ci`.)*

### 4.2 Playwright

File tes: `tests/performance.spec.js`.

**Isi inti (ringkas):**

```javascript
const { test } = require('@playwright/test');

test('Performance SauceDemo', async ({ page }) => {
  const start = Date.now();
  await page.goto('https://www.saucedemo.com/');
  await page.fill('#user-name', 'standard_user');
  await page.fill('#password', 'secret_sauce');
  await page.click('#login-button');
  await page.waitForSelector('.inventory_list');
  const end = Date.now();
  console.log('Total Time:', end - start, 'ms');
});
```

**Menjalankan tes:**

```bash
npm test
# atau hanya skenario SauceDemo:
npx playwright test tests/performance.spec.js
# UI mode (opsional):
npx playwright test --ui
```

**Laporan HTML:**

```bash
npx playwright show-report
```

### 4.3 Load testing (k6 via Docker)

Pastikan **Docker** berjalan. Dari root proyek:

```bash
npm run load
```

Versi lebih ringan (mis. 5 VU):

```bash
npm run load:ci
```

Menyimpan output ke file (untuk lampiran laporan):

```bash
npm run load 2>&1 | tee k6-output.txt
```

Jika **k6** sudah terpasang di sistem (`brew install k6`), bisa:

```bash
npm run load:native
```

### 4.4 Satu alur: tes + ringkasan + HTML dokumentasi

Jalankan **Playwright (Chromium)**, lalu **k6** (`load:ci`), lalu generate **`report-output/DOKUMENTASI-HASIL.html`** (berisi ringkasan, screenshot tertanam, tabel metrik k6, cuplikan log).

**Syarat:** Docker menyala.

```bash
npm run perf:all
```

Atau bertahap: `npm run test:perf` → `npm run load:ci` → `npm run doc:html`.

---

## 5. Hasil Tes (contoh dari pengujian awal — Playwright)

> Angka berikut bersifat **contoh** dari dokumen asli; saat Anda menjalankan ulang, nilai di terminal / trace bisa berbeda tergantung jaringan dan mesin.

| Metrik | Nilai contoh |
|--------|----------------|
| **Total waktu respon** | 778 ms |
| Navigasi halaman | 383 ms |
| Input username | 27 ms |
| Input password | 17 ms |
| Klik login | 65 ms |
| Load halaman produk | 27 ms |

**Catatan:** Detail per tahap dapat diperoleh dari trace/timeline Playwright jika diaktifkan di konfigurasi.

---

## 6. Hasil Load Testing (contoh — k6)

> Sesuaikan dengan file `k6-output.txt` hasil run Anda.

| Metrik | Contoh (sesi dengan 10 VU) |
|--------|----------------------------|
| Request HTTP sukses | Status 200; checks 100% lolos |
| Latensi HTTP rata-rata | ~31 ms (contoh) |
| p(95) latensi | ~46 ms (contoh) |
| Request gagal | 0% |
| Throughput | ~8 req/s (contoh; tergantung VU dan `sleep`) |

**Kriteria lulus di skrip:** threshold `p(95) < 5000 ms`, `http_req_failed < 5%`, `checks > 95%`.

---

## 7. Analisis

### 7.1 Playwright (single user)

Berdasarkan pengujian Playwright pada SauceDemo, **total waktu respon** pada contoh dokumen awal **778 ms** tergolong **cepat** (di bawah 1 detik). Tahapan navigasi, input, login, dan muat halaman produk menunjukkan perilaku yang responsif untuk **satu pengguna**.

**Keterbatasan:** pengujian ini **hanya satu pengguna** dan **tidak** mencerminkan kondisi **banyak pengguna bersamaan** — itulah yang dilengkapi dengan load testing.

### 7.2 Load testing (k6)

Pada skenario GET halaman utama dengan **beberapa virtual user**, metrik contoh menunjukkan **latensi rendah** dan **tidak ada kegagalan request** di bawah threshold yang ditetapkan. Artinya, untuk pola beban yang diuji, **sisi HTTP halaman entry** masih stabil.

**Catatan metodologi:** load test ini mengukur **lalu lintas ke URL utama**, bukan skenario login penuh di browser; untuk alur login end-to-end tetap merujuk pada bagian **Playwright**.

---

## 8. Kesimpulan

1. **Playwright** memberikan gambaran **waktu end-to-end** satu pengguna dari buka situs hingga halaman produk — cocok untuk regresi fungsional dan pengukuran waktu skenario bisnis.  
2. **k6** memberikan gambaran **beban HTTP** pada halaman utama dengan **banyak VU** dan **metrik agregat** (latensi, error rate, throughput).  
3. Kombinasi keduanya memenuhi cakupan **performance testing** yang lebih lengkap: **responsivitas satu pengguna** + **perilaku di bawah konkurensi** pada lapisan yang memungkinkan diuji via HTTP.

---

## 9. Lampiran & struktur repositori (referensi)

| Path | Keterangan |
|------|------------|
| `tests/performance.spec.js` | Tes Playwright SauceDemo. |
| `load/saucedemo-load.js` | Skrip load test k6. |
| `playwright.config.js` | Konfigurasi Playwright. |
| `package.json` | Skrip `test`, `load`, `load:ci`, dll. |
| `.github/workflows/playwright.yml` | CI: Playwright + job load (k6). |

---

*Versi gabungan: dokumentasi awal (PDF) + pengembangan load testing (k6/Docker). Untuk pengesahan resmi, lampirkan juga PDF asli atau ekspor Word/PDF dari dokumen ini jika dosen meminta format tertentu.*
