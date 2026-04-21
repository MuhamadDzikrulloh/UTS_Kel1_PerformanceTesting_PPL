/**
 * Load test (k6): concurrent HTTP traffic ke entry point publik.
 * Login SauceDemo bersifat client-side (SPA), jadi skenario ini memuat
 * halaman utama seperti lalu lintas pengunjung — melengkapi ukuran waktu
 * single-user di Playwright.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const target = __ENV.TARGET_URL || 'https://www.saucedemo.com';

export const options = {
  stages: [
    { duration: '15s', target: Number(__ENV.K6_STAGE_TARGET || 10) },
    { duration: '45s', target: Number(__ENV.K6_STAGE_TARGET || 10) },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  const res = http.get(`${target}/`, {
    tags: { name: 'SauceDemoHome' },
  });

  check(res, {
    'status 200': (r) => r.status === 200,
    'body not empty': (r) => (r.body || '').length > 100,
  });

  sleep(Number(__ENV.K6_SLEEP_SEC || 1));
}

export function handleSummary(data) {
  const metrics = data.metrics || {};
  return {
    'report-output/k6-metrics.json': JSON.stringify(metrics, null, 2),
  };
}
