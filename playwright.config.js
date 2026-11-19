import { defineConfig, devices } from '@playwright/test';

const port = 3195;
const baseURL = `http://127.0.0.1:${port}`;
const channel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    ...(channel ? { channel } : {})
  },
  projects: [
    { name: 'desktop', testIgnore: '**/mobile.spec.js', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: '**/mobile.spec.js', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'node server.js',
    env: { PORT: String(port) },
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1'
  }
});
