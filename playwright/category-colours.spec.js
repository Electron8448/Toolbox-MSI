import { expect, test } from '@playwright/test';
import { categories, groups, tools } from '../src/categories/index.js';

const card = (page, path) => page.locator(`main a.tool-card[href="${path}"]`);
const badge = page => page.locator('main .page-heading .category-icon');
const ink = locator => locator.evaluate(node => getComputedStyle(node).color);

test('every category has a separate accent and every sibling subcategory has a separate shade', async ({ page }) => {
  await page.goto('/');
  const categoryColours = await Promise.all(categories.map(category => ink(card(page, category.path).locator('.category-icon'))));
  expect(new Set(categoryColours).size, 'unique homepage category accents').toBe(categories.length);

  for (const category of categories) {
    await page.goto(category.path);
    const siblings = groups.filter(group => group.category === category);
    const shades = await Promise.all(siblings.map(group => ink(page.getByRole('link', { name: group.name, exact: true }))));
    expect(new Set(shades).size, category.name).toBe(siblings.length);
    const parentHue = hue(await ink(badge(page)));
    for (const [index, shade] of shades.entries()) {
      expect(contrast(shade, 'rgb(255, 255, 255)'), siblings[index].name).toBeGreaterThanOrEqual(4.5);
      const distance = Math.abs(hue(shade) - parentHue);
      expect(Math.min(distance, 360 - distance), siblings[index].name).toBeLessThanOrEqual(35);
    }
  }
});

function rgb(colour) {
  const channels = colour.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*1)?\)$/);
  expect(channels, `opaque browser colour for ${colour}`).not.toBeNull();
  return channels.slice(1).map(Number);
}

function hue(colour) {
  const [red, green, blue] = rgb(colour);
  const max = Math.max(red, green, blue);
  const span = max - Math.min(red, green, blue);
  expect(span, `visible saturation for ${colour}`).toBeGreaterThan(0);
  const sector = max === red ? (green - blue) / span : max === green ? (blue - red) / span + 2 : (red - green) / span + 4;
  return (sector * 60 + 360) % 360;
}

function luminance(colour) {
  const channels = rgb(colour).map(value => value / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const levels = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (levels[0] + 0.05) / (levels[1] + 0.05);
}

test('category accents follow navigation, search, breadcrumbs and tool page indicators', async ({ page }) => {
  const category = categories.find(item => item.path === '/maths');
  const group = groups.find(item => item.path === '/maths/fractions');
  const tool = tools.find(item => item.path === '/maths/fractions/fraction-calculator');
  await page.goto('/');
  const accent = await ink(card(page, category.path).locator('.category-icon'));
  await card(page, category.path).click();
  await expect(badge(page)).toHaveCSS('color', accent);
  const groupLink = page.getByRole('link', { name: group.name, exact: true });
  const shade = await ink(groupLink);
  await groupLink.click();
  await expect(badge(page)).toHaveCSS('color', shade);

  await page.getByRole('button', { name: 'Open menu' }).click();
  const sidebar = page.getByRole('dialog', { name: 'Navigation' });
  const categoryNav = sidebar.getByRole('link', { name: 'All Maths', exact: true });
  await expect(categoryNav).toHaveAttribute('aria-current', 'location');
  await expect(categoryNav).toHaveCSS('color', accent);
  await expect(sidebar.getByRole('link', { name: group.name, exact: true })).toHaveCSS('color', shade);
  await page.keyboard.press('Escape');

  await card(page, tool.path).click();
  await expect(badge(page)).toHaveCSS('color', shade);
  const breadcrumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumbs.getByRole('link', { name: category.name, exact: true })).toHaveCSS('color', accent);
  await expect(breadcrumbs.getByRole('link', { name: group.name, exact: true })).toHaveCSS('color', shade);

  await page.goto('/search?q=Fraction+Calculator');
  await expect(card(page, tool.path).locator('small')).toHaveCSS('color', accent);
});

test('category badges keep icon contrast and the directory fits on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const colours = await page.locator('main .home-collection .category-icon').evaluateAll(nodes =>
    nodes.map(node => {
      const style = getComputedStyle(node);
      return [style.color, style.backgroundColor];
    })
  );
  expect(colours).toHaveLength(categories.length);
  for (const [foreground, background] of colours) {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await card(page, '/maths').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
