import { expect, test } from '@playwright/test';

test('fraction simplifier validates, simplifies, filters and resets', async ({ page }) => {
  await page.goto('/maths/fractions/fraction-simplifier');
  const fraction = page.getByRole('textbox', { name: 'Search for a fraction' });
  const search = page.getByRole('button', { name: 'Search', exact: true });
  await fraction.fill('5/0');
  await search.click();
  await expect(page.getByRole('alert')).toContainText(/zero/i);
  await fraction.fill('6/-12');
  await search.click();
  await expect(page.locator('#fraction-output')).toContainText('-1 over 2');
  await page.getByRole('textbox', { name: 'Filter by denominator' }).fill('10');
  await expect(page.locator('.fraction-results li')).toHaveCount(1);
  await expect(page.locator('.fraction-results li')).toContainText('-5 over 10');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(fraction).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Equivalent fractions' })).toBeHidden();
});

test('graph maker passes an equation to the graphing calculator', async ({ page }) => {
  await page.goto('/maths/algebra/beginner-graph-maker');
  await page.getByRole('spinbutton', { name: 'Slope' }).fill('3');
  await page.getByRole('spinbutton', { name: 'Move up or down' }).fill('2');
  await page.getByRole('link', { name: /Open in Graphing Calculator/ }).click();
  await expect(page.getByRole('textbox', { name: 'Function in x' })).toHaveValue('3*x + 2');
  await expect(page.getByRole('status')).toContainText('y = 3*x + 2');
});

test('word counter copies its result and resets', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/writing/text-tools/word-counter');
  await page.getByRole('textbox', { name: 'Your text' }).fill("Don't count punctuation!");
  await page.getByRole('button', { name: 'Run tool' }).click();
  const result = page.getByRole('region', { name: 'Result' });
  await expect(result.locator('pre')).toHaveText('3');
  await result.getByRole('button', { name: 'Copy result' }).click();
  await expect(result.getByRole('status')).toHaveText('Copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('3');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(result).toBeHidden();
});

test('to-do list saves tasks across reloads', async ({ page }) => {
  await page.goto('/productivity/planning/to-do-list');
  await page.getByRole('textbox', { name: 'Title' }).fill('Review fractions');
  await page.getByRole('button', { name: 'Add entry' }).click();
  const task = page.getByRole('listitem').filter({ hasText: 'Review fractions' });
  await expect(task).toBeVisible();
  await page.reload();
  await task.getByRole('button', { name: 'Mark complete' }).click();
  await expect(task.getByRole('button', { name: 'Mark incomplete' })).toHaveAttribute('aria-pressed', 'true');
  await task.getByRole('button', { name: 'Delete' }).click();
  await expect(task).toHaveCount(0);
});
