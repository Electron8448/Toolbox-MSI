import { expect, test } from '@playwright/test';
import security from '../electron/security.cjs';

test('desktop navigation only permits Toolbox or ordinary external web links', () => {
  for (const url of ['toolbox://app/', 'toolbox://app/search?q=test']) expect(security.internalURL(url)).toBe(true);
  for (const url of ['https://example.com/', 'http://example.com/']) expect(security.externalURL(url)).toBe(true);
  for (const url of ['javascript:alert(1)', 'file:///C:/Windows', 'data:text/html,test', 'https://user:pass@example.com/', 'toolbox://user@app/']) {
    expect(security.internalURL(url)).toBe(false);
    expect(security.externalURL(url)).toBe(false);
  }
});

test('desktop content policy supports Monaco and scripts inside isolated previews', async ({ page }) => {
  await page.route('**/developer-tools/utilities/code-editor', async route => {
    const response = await route.fetch();
    await route.fulfill({response, headers:{...response.headers(), 'content-security-policy':security.contentSecurityPolicy}});
  });
  await page.goto('/developer-tools/utilities/code-editor');
  await expect(page.locator('.monaco-editor')).toBeVisible({timeout:30000});
  await page.getByLabel('Upload project files').setInputFiles({
    name:'policy.html', mimeType:'text/html',
    buffer:Buffer.from('<h1>Preview</h1><script>document.querySelector("h1").textContent += " works";</script>')
  });
  await page.getByLabel('Preview page').selectOption('policy.html');
  await page.getByRole('button',{name:'Run preview'}).click();
  await expect(page.locator('iframe')).toHaveAttribute('sandbox','allow-scripts');
  await expect(page.frameLocator('iframe').getByRole('heading')).toHaveText('Preview works');
  expect(await page.frameLocator('iframe').locator('body').evaluate(() => {
    try { return parent.document.body.textContent; } catch { return 'isolated'; }
  })).toBe('isolated');
});
