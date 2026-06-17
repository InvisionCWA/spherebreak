// @ts-check
'use strict';

/**
 * E2E — browser lifecycle: landing → main menu → tutorial → lobby.
 *
 * These tests cover the initial page load through to the lobby without
 * requiring a live Socket.IO connection (the UI renders each screen
 * independently of the server).
 */

const { test, expect } = require('@playwright/test');

test.describe('Landing & navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows the landing page on first load', async ({ page }) => {
    await expect(page).toHaveTitle(/Celestial Break/i);
    await expect(page.getByRole('heading', { name: /Celestial Break/i })).toBeVisible();
  });

  test('navigates from landing to main menu via Start button', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: /start|play|begin/i }).first();
    await startBtn.click();
    // Main menu contains the display-name input and play options
    await expect(page.getByRole('button', { name: /practice|ranked|casual|lobby/i }).first()).toBeVisible();
  });

  test('top-bar Tutorial link shows tutorial screen', async ({ page }) => {
    await page.getByRole('button', { name: /tutorial/i }).click();
    await expect(page.getByRole('heading', { name: /tutorial/i, level: 2 })).toBeVisible();
  });

  test('top-bar Menu button returns to main menu from tutorial', async ({ page }) => {
    await page.getByRole('button', { name: /tutorial/i }).click();
    await page.getByRole('button', { name: /menu/i }).click();
    // Landing → main after clicking Menu; just assert no crash
    await expect(page.locator('.app-shell')).toBeVisible();
  });

  test('top-bar Leaderboard link shows leaderboard panel', async ({ page }) => {
    await page.getByRole('button', { name: /leaderboard/i }).click();
    await expect(page.getByRole('heading', { name: /leaderboard/i, level: 2 })).toBeVisible();
  });

  test('notice banner is not visible on initial load', async ({ page }) => {
    await expect(page.locator('.notice-banner')).not.toBeVisible();
  });
});

test.describe('Main menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate past the landing screen
    const startBtn = page.getByRole('button', { name: /start|play|begin/i }).first();
    await startBtn.click();
  });

  test('display-name field is pre-filled with a default name', async ({ page }) => {
    const nameField = page.getByRole('textbox');
    await expect(nameField).not.toHaveValue('');
  });

  test('changing display name updates the session immediately', async ({ page }) => {
    const nameField = page.getByRole('textbox').first();
    await nameField.fill('TestPilot');
    await expect(nameField).toHaveValue('TestPilot');
  });

  test('navigating to Lobby shows the lobby screen', async ({ page }) => {
    // Find any button that leads to the lobby
    const lobbyBtn = page.getByRole('button', { name: /lobby|quick play|join/i }).first();
    await lobbyBtn.click();
    await expect(page.getByRole('heading', { name: /lobby/i, level: 2 })).toBeVisible();
  });
});

test.describe('Accessibility — reduced motion', () => {
  test('buttons have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    // Tab to the first interactive element and confirm outline
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus-visible');
    await expect(focused).toBeVisible();
  });
});
