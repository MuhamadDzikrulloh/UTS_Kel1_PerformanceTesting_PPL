const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');

const OUT = path.join(__dirname, '..', 'report-output');
const SHOTS = path.join(OUT, 'screenshots');

test.beforeAll(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
});

test('Performance SauceDemo', async ({ page }) => {
  const start = Date.now();

  await page.goto('https://www.saucedemo.com/');
  await page.screenshot({ path: path.join(SHOTS, '01-halaman-login.png'), fullPage: true });

  await page.fill('#user-name', 'standard_user');
  await page.fill('#password', 'secret_sauce');
  await page.click('#login-button');

  await page.waitForSelector('.inventory_list');
  await page.screenshot({ path: path.join(SHOTS, '02-halaman-produk.png'), fullPage: true });

  const end = Date.now();
  const totalMs = end - start;

  console.log('Total Time:', totalMs, 'ms');

  fs.writeFileSync(
    path.join(OUT, 'playwright-summary.json'),
    JSON.stringify(
      {
        testName: 'Performance SauceDemo',
        url: 'https://www.saucedemo.com/',
        totalMs,
        finishedAt: new Date().toISOString(),
        screenshots: ['01-halaman-login.png', '02-halaman-produk.png'],
      },
      null,
      2,
    ),
  );
});
