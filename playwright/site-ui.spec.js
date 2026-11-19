import { expect, test } from '@playwright/test';
import { categories, groups, tools } from '../src/categories/index.js';

const section = (page, name) => page.locator('main section').filter({
  has: page.getByRole('heading', { name, exact: true, level: 2 })
});
const heading = (page, name) => page.getByRole('heading', { name, exact: true, level: 1 });
const breadcrumbs = page => page.getByRole('navigation', { name: 'Breadcrumb' });
const current = page => breadcrumbs(page).locator('[aria-current="page"]');
const menu = page => page.locator('#menu');
const sidebar = page => page.getByRole('dialog', { name: 'Navigation' });
const homeLogo = page => page.getByRole('banner').getByRole('link', { name: 'Toolbox home' });
const links = scope => scope.getByRole('link').evaluateAll(items => items.map(item => item.getAttribute('href')));

test('homepage shows branding, categories, popular tools and workspace links', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Toolbox');
  await expect(heading(page, 'Everything you need, all in one toolbox.')).toBeVisible();
  await expect(page.locator('.hero-brand .slogan-word')).toHaveText(['Tools', 'For', 'Everything']);
  await expect(homeLogo(page)).toHaveAttribute('href', '/');
  await expect(page.locator('.hero').getByRole('link', { name: 'Read the README' })).toHaveAttribute('href', '/readme');

  const icon = await page.locator('link[rel="icon"]').getAttribute('href');
  const iconResponse = await request.get(icon);
  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()['content-type']).toContain('image/svg+xml');

  expect(await links(section(page, 'Browse categories'))).toEqual(categories.map(category => category.path));
  expect(await links(section(page, 'Popular tools'))).toEqual([
    '/maths/fractions/fraction-simplifier',
    '/writing/text-tools/word-counter',
    '/developer-tools/json/json-formatter',
    '/web-seo-tools/website/qr-code-generator'
  ]);
  await expect(section(page, 'Recently used')).toHaveCount(0);

  const workspace = page.getByRole('region', { name: 'Toolbox workspace' });
  await expect(workspace.getByRole('link', { name: /View workspace/ })).toHaveAttribute('href', 'https://github.com/Electron8448/Toolbox');
  const report = workspace.getByRole('link', { name: /Submit a bug report/ });
  const url = new URL(await report.getAttribute('href'));
  expect(url.origin + url.pathname).toBe('https://github.com/Electron8448/Toolbox/issues/new');
  expect(url.searchParams.get('title')).toBe('Tool suggestion: ');
});

test('recent tools appear newest first, deduplicate, cap at five and persist', async ({ page }) => {
  const visited = tools.slice(0, 6).map(tool => tool.path);
  for (const path of [...visited, visited[2]]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await homeLogo(page).click();
  const recent = section(page, 'Recently used');
  const expected = [visited[2], visited[5], visited[4], visited[3], visited[1]];
  expect(await links(recent)).toEqual(expected);
  await page.reload();
  await expect(recent.getByRole('link')).toHaveCount(5);
  expect(await links(recent)).toEqual(expected);
  await recent.getByRole('link').first().click();
  await expect(page).toHaveURL(expected[0]);
});

test('keyboard skip link and sidebar support focus, expansion and dismissal', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  await menu(page).focus();
  await page.keyboard.press('Enter');
  await expect(menu(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(sidebar(page).getByRole('button', { name: 'Close menu' })).toBeFocused();
  const nav = sidebar(page).getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  const maths = nav.locator('summary').filter({ hasText: /^Maths$/ });
  await maths.focus();
  await page.keyboard.press('Space');
  await expect(nav.getByRole('link', { name: 'Fractions', exact: true })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(nav.getByRole('link', { name: 'Fractions', exact: true })).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(sidebar(page)).toBeHidden();
  await expect(menu(page)).toBeFocused();
  await expect(menu(page)).toHaveAttribute('aria-expanded', 'false');

  await menu(page).click();
  await sidebar(page).getByRole('button', { name: 'Close menu' }).click();
  await expect(sidebar(page)).toBeHidden();
  await menu(page).click();
  await page.mouse.click(page.viewportSize().width - 10, 120);
  await expect(sidebar(page)).toBeHidden();
});

test('sidebar lists every category and its subcategories and shows the selected location', async ({ page }) => {
  await page.goto('/maths/algebra');
  await menu(page).click();
  const nav = sidebar(page).getByRole('navigation', { name: 'Main navigation' });
  const summaries = nav.locator('summary');
  await expect(summaries).toHaveText(categories.map(category => category.name));
  await expect(nav.getByRole('link', { name: 'All Maths' })).toHaveAttribute('aria-current', 'location');
  for (const [index, category] of categories.entries()) {
    const summary = summaries.nth(index);
    const details = summary.locator('..');
    if (!(await details.getAttribute('open') === '')) await summary.click();
    expect(await links(details)).toEqual([
      category.path, ...groups.filter(group => group.category === category).map(group => group.path)
    ]);
  }

  await nav.getByRole('link', { name: 'All Maths' }).click();
  await expect(sidebar(page)).toBeHidden();
  await expect(heading(page, 'Maths')).toBeVisible();
  await menu(page).click();
  await expect(nav.getByRole('link', { name: 'All Maths' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('searchbox')).toBeFocused();
  await menu(page).click();
  await expect(nav.getByRole('link', { name: 'Search', exact: true })).toHaveAttribute('aria-current', 'page');
  await sidebar(page).getByRole('link', { name: 'Toolbox home' }).click();
  await expect(page).toHaveURL('/');
  await expect(sidebar(page)).toBeHidden();
});

for (const category of categories) {
  test(`category and subcategory directories match the catalogue for ${category.name}`, async ({ page }) => {
    await page.goto('/');
    await section(page, 'Browse categories').locator(`a[href="${category.path}"]`).click();
    await expect(heading(page, category.name)).toBeVisible();
    await expect(page).toHaveTitle(`${category.name} | Toolbox`);
    await expect(page.getByText(category.description, { exact: true })).toBeVisible();
    await expect(current(page)).toHaveText(category.name);

    const categoryGroups = groups.filter(group => group.category === category);
    const directories = page.locator('.tool-group');
    await expect(directories.getByRole('heading', { level: 2 })).toHaveText(categoryGroups.map(group => group.name));
    for (const [index, group] of categoryGroups.entries()) {
      const directory = directories.nth(index);
      const groupTools = tools.filter(tool => tool.group === group);
      expect(await links(directory)).toEqual([group.path, ...groupTools.map(tool => tool.path)]);
      await directory.getByRole('link', { name: group.name, exact: true }).click();
      await expect(page).toHaveURL(group.path);
      await expect(heading(page, group.name)).toBeVisible();
      await expect(page).toHaveTitle(`${group.name} | Toolbox`);
      await expect(current(page)).toHaveText(group.name);
      const listing = page.getByRole('region', { name: 'Tools', exact: true });
      await expect(listing.locator('strong')).toHaveText(groupTools.map(tool => tool.name));
      expect(await links(listing)).toEqual(groupTools.map(tool => tool.path));
      await breadcrumbs(page).getByRole('link', { name: category.name, exact: true }).click();
      await expect(heading(page, category.name)).toBeVisible();
    }
    await breadcrumbs(page).getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page).toHaveURL('/');
  });
}

test('search provides initial, live, empty and cleared states with accessible counts', async ({ page }) => {
  await page.goto('/search');
  const results = page.getByRole('region', { name: 'Search results' });
  const query = page.getByRole('searchbox', { name: 'Search tools' });
  const status = page.getByRole('status');
  await expect(current(page)).toHaveText('Search');
  await expect(results.getByRole('heading', { name: 'Search by tool name' })).toBeVisible();

  await query.fill('  PeRcEnTaGe  ');
  const matching = [...tools, ...categories, ...groups].filter(item => /percentage/i.test(item.name));
  await expect(results.getByRole('link')).toHaveCount(matching.length);
  expect(await links(results)).toEqual(matching.map(item => item.path));
  await expect(status).toHaveText(`${matching.length} matching results`);

  await query.fill('UUID Generator');
  await expect(status).toHaveText('1 matching result');
  await expect(results.getByRole('link')).toContainText('Developer Tools · Utilities');
  await query.press('Enter');
  expect(new URL(page.url()).searchParams.get('q')).toBe('UUID Generator');
  await query.fill('zz-no-toolbox-match');
  await expect(status).toHaveText('0 matching results');
  await expect(results.getByRole('heading', { name: 'No matching tools' })).toBeVisible();
  await expect(results.getByRole('link')).toHaveCount(0);
  await query.clear();
  await expect(page).toHaveURL('/search');
  await expect(status).toBeEmpty();
  await expect(results.getByRole('heading', { name: 'Search by tool name' })).toBeVisible();
});

test('homepage keyboard search restores its query through reload and browser history', async ({ page }) => {
  await page.goto('/');
  const query = page.getByRole('searchbox', { name: 'Search tools' });
  await query.fill('  Geometry  ');
  await query.press('Enter');
  await expect(page).toHaveURL('/search?q=Geometry');
  await expect(query).toHaveValue('Geometry');
  await expect(query).toBeFocused();
  const result = page.getByRole('region', { name: 'Search results' }).getByRole('link', { name: /^Geometry Maths/ });
  await result.click();
  await expect(page).toHaveURL('/maths/geometry');
  await expect(page.getByRole('main')).toBeFocused();
  await page.goBack();
  await expect(query).toHaveValue('Geometry');
  await page.reload();
  await expect(result).toBeVisible();
  await page.goForward();
  await expect(heading(page, 'Geometry')).toBeVisible();
  await homeLogo(page).click();
  await expect(page).toHaveURL('/');
  await expect(sidebar(page)).toBeHidden();
});

test('README keeps the site header, expands sections and follows in-page links', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Read the README' }).click();
  await expect(page).toHaveTitle('README | Toolbox');
  await expect(current(page)).toHaveText('README');
  const article = page.getByRole('article', { name: 'Toolbox documentation' });
  const maths = article.locator('summary').filter({ hasText: /^Maths$/ });
  const fraction = maths.locator('..').getByText('Fraction Simplifier', { exact: true });
  await expect(fraction).toBeHidden();
  await maths.click();
  await expect(fraction).toBeVisible();
  await maths.click();
  await expect(fraction).toBeHidden();
  await article.getByRole('link', { name: 'Run tests', exact: true }).click();
  await expect(page).toHaveURL(/#run-playwright-tests$/);
  await expect(article.getByRole('heading', { name: 'Run Playwright tests' })).toBeInViewport();
  const publishing = article.getByRole('link', { name: 'Publish to GitHub Pages' });
  await expect(publishing).toHaveAttribute('target', '_blank');
  await expect(publishing).toHaveAttribute('rel', 'noopener noreferrer');
  await homeLogo(page).click();
  await expect(page).toHaveURL('/');
});

test('README shows a loading state and offers GitHub when loading fails', async ({ page }) => {
  await page.route('**/README.md', async route => {
    const article = page.getByRole('article', { name: 'Toolbox documentation' });
    await expect(article).toHaveAttribute('aria-busy', 'true');
    await expect(article).toContainText('Loading README');
    await route.fulfill({ status: 503 });
  });
  await page.goto('/readme');
  const article = page.getByRole('article', { name: 'Toolbox documentation' });
  await expect(article.getByRole('link', { name: 'Read the documentation on GitHub' }))
    .toHaveAttribute('href', 'https://github.com/Electron8448/Toolbox-MSI/blob/main/README.md');
  await expect(article).not.toHaveAttribute('aria-busy', 'true');
});

test('reduced-motion preference disables the animated slogan', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.hero-brand .slogan-letter').first()).toHaveCSS('animation-name', 'none');
});
