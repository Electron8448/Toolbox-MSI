import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { expect, test } from '@playwright/test';
import { unzipSync, strFromU8 } from '../src/vendor/fflate.mjs';

const path = '/developer-tools/utilities/code-editor';

test('project files can be added, renamed, edited in colour and downloaded', async ({ page }) => {
  await page.goto(path);
  await page.getByRole('button', { name: 'New file' }).click();
  const dialog = page.getByRole('dialog', { name: 'New file' });
  await dialog.getByLabel('File name or path').fill('notes.txt');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Rename file' }).click();
  await page.getByRole('dialog', { name: 'Rename file' }).getByLabel('File name or path').fill('src/example.txt');
  await page.getByRole('dialog', { name: 'Rename file' }).getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByLabel('File type').selectOption('javascript');
  await expect(page.getByRole('tab', { name: 'src/example.js' })).toHaveAttribute('aria-selected', 'true');

  const panel = page.getByRole('tabpanel');
  await panel.locator('.monaco-editor').click({ position: { x: 90, y: 12 } });
  await page.keyboard.insertText('const label = "hello";');
  const lines = panel.locator('.view-lines');
  await expect(lines.getByText('const', { exact: true })).toHaveCSS('color', 'rgb(86, 156, 214)');
  await expect(lines.getByText('"hello"', { exact: true })).toHaveCSS('color', 'rgb(206, 145, 120)');

  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file', exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe('example.js');
  expect(await readFile(await file.path(), 'utf8')).toBe('const label = "hello";');
});

test('a folder with nested files previews and can be exported and reopened', async ({ page }, testInfo) => {
  const start = testInfo.outputPath('site');
  await mkdir(join(start,'assets'), {recursive:true});
  await writeFile(join(start,'index.html'),'<link rel="stylesheet" href="assets/styles.css"><h1>Before</h1><script src="assets/script.js"></script>');
  await writeFile(join(start,'assets','styles.css'),'h1 { color: green; }');
  await writeFile(join(start,'assets','script.js'),'document.querySelector("h1").textContent = "Project works";');
  await page.goto(path);
  await page.getByLabel('Upload project folder').setInputFiles(start);
  await expect(page.getByRole('tab', { name: 'assets/script.js' })).toBeVisible();
  await page.getByRole('button', { name: 'Run preview' }).click();
  const heading = page.frameLocator('iframe[title="Document preview"]').getByRole('heading', { name: 'Project works' });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS('color', 'rgb(0, 128, 0)');

  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP' }).click();
  const zip = await pending;
  expect(zip.suggestedFilename()).toBe('toolbox-project.zip');
  const entries = unzipSync(await readFile(await zip.path()));
  expect(Object.keys(entries).sort()).toEqual(['assets/script.js','assets/styles.css','index.html']);
  expect(strFromU8(entries['assets/styles.css'])).toBe('h1 { color: green; }');

  const restored = testInfo.outputPath('restored');
  for (const [name,bytes] of Object.entries(entries)) {
    const file = join(restored,name);
    await mkdir(dirname(file),{recursive:true});
    await writeFile(file,bytes);
  }
  await page.getByLabel('Upload project files').setInputFiles({name:'extra.css',mimeType:'text/css',buffer:Buffer.from('h1 {}')});
  await expect(page.getByRole('tab', { name: 'extra.css' })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByLabel('Upload project folder').setInputFiles(restored);
  await expect(page.getByText('Opened folder with 3 files.')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'extra.css' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Run preview' }).click();
  await expect(heading).toBeVisible();
});

test('Toolbox opens the README through its homepage', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Read the README' }).click();
  await expect(page).toHaveURL('/readme');
  await expect(page.getByRole('heading', { name: 'Toolbox README' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What you can do' })).toBeVisible();
  const home = page.getByRole('banner').getByRole('link', { name: 'Toolbox home' });
  await expect(home).toBeVisible();
  await home.click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Read the README' })).toBeVisible();
});
