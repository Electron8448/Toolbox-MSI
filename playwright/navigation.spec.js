import { expect, test } from '@playwright/test';
import { categories, groups, tools } from '../src/categories/index.js';

test('homepage links to every category and the sidebar reaches a tool', async ({ page }) => {
  await page.goto('/');
  const browse = page.locator('section.home-collection').filter({ has: page.getByRole('heading', { name: 'Browse categories' }) });
  await expect(browse.getByRole('link')).toHaveCount(categories.length);
  await page.getByRole('button', { name: 'Open menu' }).click();
  const sidebar = page.getByRole('dialog', { name: 'Navigation' });
  await sidebar.locator('summary').filter({ hasText: /^Converters$/ }).click();
  await sidebar.getByRole('link', { name: 'Length', exact: true }).click();
  await expect(sidebar).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Length', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Metres to Feet Converter/ }).click();
  await expect(page).toHaveURL('/converters/length/metres-to-feet-converter');
  await page.getByRole('link', { name: 'Toolbox home' }).click();
  await expect(page.getByRole('heading', { name: 'Recently used' })).toBeVisible();
});

test('global search finds tools, categories and subcategories', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Search tools' }).fill('geometry');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL('/search?q=geometry');
  await page.getByRole('link', { name: /^Geometry Maths/ }).click();
  await expect(page.getByRole('heading', { name: 'Geometry' })).toBeVisible();

  await page.goto('/search?q=writing');
  await expect(page.getByRole('link', { name: /^Writing Tools to help/ })).toBeVisible();
  const query = page.getByRole('searchbox', { name: 'Search tools' });
  await query.fill('word counter');
  await page.getByRole('link', { name: /^Word Counter Writing/ }).click();
  await expect(page).toHaveURL('/writing/text-tools/word-counter');
});

test('all registered routes serve the Toolbox shell', async ({ request }) => {
  for (const item of [...categories, ...groups, ...tools]) {
    const response = await request.get(item.path);
    expect(response.status(), item.path).toBe(200);
    expect(await response.text(), item.path).toContain('<main id="main"');
  }
  expect((await request.get('/missing-tool')).status()).toBe(404);
});
