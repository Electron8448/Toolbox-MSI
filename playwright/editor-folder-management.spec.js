import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { unzipSync, strFromU8 } from '../src/vendor/fflate.mjs';

test.skip(process.env.TOOLBOX_NEW_FEATURES !== '1', 'Enable the acceptance tests with TOOLBOX_NEW_FEATURES=1.');

const path = '/developer-tools/utilities/code-editor';
const folder = (page, name) => page.getByRole('complementary', { name: 'Explorer' })
  .getByRole('button', { name, exact: true });
const newFolder = page => page.getByRole('button', { name: 'New folder', exact: true });
const zipButton = page => page.getByRole('button', { name: 'Download folder', exact: true });

async function nameFolder(page, action, name) {
  await page.getByRole('button', { name: action, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: action, exact: true });
  await dialog.getByRole('textbox', { name: 'Folder name' }).fill(name);
  return dialog;
}

async function saveFolder(page, action, name) {
  const dialog = await nameFolder(page, action, name);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function zip(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), zipButton(page).click()]);
  return {
    name: download.suggestedFilename(),
    entries: unzipSync(new Uint8Array(await readFile(await download.path())))
  };
}

async function addProjectContent(page) {
  await page.getByLabel('Upload project files').setInputFiles({
    name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Original notes')
  });
  await expect(page.getByRole('tab', { name: 'notes.txt' })).toBeVisible();
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`fullscreen toggles and restores the editor at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(path);
    const workbench = page.locator('.editor-workbench');
    const width = (await workbench.boundingBox()).width;
    const height = (await workbench.boundingBox()).height;
    const expanded = async () => {
      const box = await workbench.boundingBox();
      return box.width >= viewport.width - 32 && box.height >= viewport.height - 32;
    };
    const restored = async () => {
      const box = await workbench.boundingBox();
      return Math.abs(box.width - width) <= 2 && Math.abs(box.height - height) <= 2;
    };
    const enter = page.getByRole('button', { name: 'Enter fullscreen', exact: true });
    await enter.click();
    await expect.poll(expanded).toBe(true);
    await expect(newFolder(page)).toBeVisible();
    await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
    await expect.poll(restored).toBe(true);
    await enter.click();
    await expect.poll(expanded).toBe(true);
    await page.keyboard.press('Escape');
    await expect(enter).toBeVisible();
    await expect.poll(restored).toBe(true);
  });
}

test('root rename handles cancel and invalid names, then persists without losing files', async ({ page }) => {
  await page.goto(path);
  await addProjectContent(page);
  const before = await zip(page);
  const dialog = await nameFolder(page, 'Rename root folder', 'Cancelled');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect((await zip(page)).name).toBe(before.name);

  for (const invalid of ['', 'bad/name']) {
    const editor = await nameFolder(page, 'Rename root folder', invalid);
    await editor.getByRole('button', { name: 'Save' }).click();
    await expect(editor).toBeVisible();
    await expect(editor.getByRole('textbox')).toHaveValue(invalid);
    await editor.getByRole('button', { name: 'Cancel' }).click();
  }

  await saveFolder(page, 'Rename root folder', 'My Toolbox');
  await page.reload();
  await expect(folder(page, 'My Toolbox')).toBeVisible();
  const saved = await zip(page);
  expect(saved.name).toBe('My Toolbox.zip');
  const notes = Object.keys(saved.entries).filter(name => name === 'notes.txt' || name.endsWith('/notes.txt'));
  expect(notes).toHaveLength(1);
  expect(strFromU8(saved.entries[notes[0]])).toBe('Original notes');
});

test('nested folders expand and collapse, enforce names and retain edits in the ZIP', async ({ page }) => {
  await page.goto(path);
  await saveFolder(page, 'Rename root folder', 'Workspace');
  await saveFolder(page, 'New folder', 'assets');
  const assets = folder(page, 'assets');
  await assets.click();
  await saveFolder(page, 'New folder', 'images');
  const images = folder(page, 'images');
  await expect(images).toBeVisible();

  const duplicate = await nameFolder(page, 'New folder', 'images');
  await duplicate.getByRole('button', { name: 'Save' }).click();
  await expect(duplicate.getByRole('alert')).toContainText(/already exists|duplicate/i);
  await duplicate.getByRole('button', { name: 'Cancel' }).click();

  const invalid = await nameFolder(page, 'New folder', 'bad/name');
  await invalid.getByRole('button', { name: 'Save' }).click();
  await expect(invalid.getByRole('alert')).toContainText(/invalid|name|character/i);
  await invalid.getByRole('button', { name: 'Cancel' }).click();

  await assets.click();
  await expect(images).toBeHidden();
  await assets.click();
  await expect(images).toBeVisible();
  await images.click();
  const create = page.getByRole('button', { name: 'New file', exact: true });
  await create.click();
  const file = page.getByRole('dialog', { name: 'New file' });
  await file.getByRole('textbox').fill('sample.txt');
  await file.getByRole('button', { name: 'Save' }).click();
  await expect(file).toBeHidden();
  const editor = page.getByRole('tabpanel').locator('.monaco-editor');
  await editor.click({ position: { x: 90, y: 12 } });
  await page.keyboard.insertText('Unsaved project text');
  await expect(editor.locator('.view-lines')).toContainText('Unsaved project text');

  await images.click();
  await page.getByRole('button', { name: 'Rename folder', exact: true }).click();
  const rename = page.getByRole('dialog', { name: 'Rename folder' });
  await rename.getByRole('textbox', { name: 'Folder name' }).fill('media');
  await rename.getByRole('button', { name: 'Save' }).click();
  await expect(folder(page, 'media')).toBeVisible();
  await folder(page, 'media').click();
  await saveFolder(page, 'New folder', 'empty');
  await expect(folder(page, 'empty')).toBeVisible();

  const saved = await zip(page);
  expect(saved.name).toBe('Workspace.zip');
  const entries = Object.keys(saved.entries);
  const nested = entries.find(name => /^(Workspace\/)?assets\/media\/sample\.txt$/.test(name));
  expect(nested).toBeDefined();
  expect(strFromU8(saved.entries[nested])).toBe('Unsaved project text');
  expect(entries.some(name => /^(Workspace\/)?assets\/media\/empty\/$/.test(name))).toBe(true);
  expect(entries.some(name => /assets\/images\//.test(name))).toBe(false);
  expect(entries.some(name => /^(Workspace\/)?index\.html$/.test(name))).toBe(true);

  await page.reload();
  expect((await zip(page)).entries[nested]).toEqual(saved.entries[nested]);
});

test('download failures give feedback and leave the project usable', async ({ page }) => {
  await page.goto(path);
  await addProjectContent(page);
  await page.evaluate(() => {
    URL.createObjectURL = () => { throw new Error('Download unavailable'); };
  });
  await zipButton(page).click();
  await expect(page.getByText(/could not download|download unavailable|download failed/i)).toBeVisible();
  await expect(page.getByRole('tab', { name: 'notes.txt' })).toBeVisible();
});
