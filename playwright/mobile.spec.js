import { expect, test } from '@playwright/test';

test('mobile homepage fits and the sidebar opens a subcategory', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Browse categories' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
  await page.getByRole('button', { name: 'Open menu' }).tap();
  const sidebar = page.getByRole('dialog', { name: 'Navigation' });
  await sidebar.locator('summary').filter({ hasText: /^Maths$/ }).tap();
  await sidebar.getByRole('link', { name: 'Fractions', exact: true }).tap();
  await expect(sidebar).toBeHidden();
  await expect(page.getByRole('link', { name: /^Fraction Simplifier/ })).toBeVisible();
});

test('mobile search, directories and README fit without horizontal scrolling', async ({ page }) => {
  for (const [path, title] of [
    ['/search?q=fraction', 'Search tools'],
    ['/maths', 'Maths'],
    ['/maths/fractions', 'Fractions'],
    ['/readme', 'Toolbox README']
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title, level: 1, exact: true })).toBeVisible();
    if (path === '/readme') await expect(page.getByRole('heading', { name: 'What you can do' })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('link', { name: 'Toolbox home' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(page.viewportSize().width);
  }
  await page.getByRole('banner').getByRole('link', { name: 'Toolbox home' }).tap();
  await page.getByRole('link', { name: 'Read the README' }).tap();
  await expect(page).toHaveURL('/readme');
});
