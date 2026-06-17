// @ts-check
'use strict';

const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Celestial Break E2E tests.
 *
 * The tests assume the React dev-server is running on :3000 and the
 * Node game-server is running on :3000 (or via the proxy configured
 * by react-scripts).  Start both before running the suite:
 *
 *   # terminal 1 — game server
 *   cd server && npm start
 *
 *   # terminal 2 — client dev server
 *   cd client && npm start
 *
 * In CI the webServer block below starts the client automatically;
 * set GAME_SERVER_URL to override the origin the client connects to.
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  // Automatically start the React dev server when running locally.
  // Skip this in environments where the server is already running.
  webServer: process.env.CI
    ? undefined
    : {
        command: 'cd ../client && npm start',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
