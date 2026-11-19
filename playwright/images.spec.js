import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAAC56t6BAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAQSURBVBhXY2hgaPjPgBUAADAEAgAruNyXAAAAAElFTkSuQmCC',
  'base64'
);

test('image resizer downloads a PNG with the requested dimensions', async ({ page }) => {
  await page.goto('/image-tools/editing/image-resizer');
  const file = page.getByLabel('Image file');
  await file.setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: pixel });
  await page.getByRole('spinbutton', { name: 'New width' }).fill('16');
  await page.getByRole('spinbutton', { name: 'New height' }).fill('24');
  await page.getByRole('button', { name: 'Run tool' }).click();

  const result = page.getByRole('region', { name: 'Result' });
  await expect(result.locator('pre')).toContainText('16 × 24 px');
  const downloaded = page.waitForEvent('download');
  await result.getByRole('link', { name: 'Download image' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('toolbox-image.png');

  const image = await readFile(await download.path());
  expect(image.subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'));
  // PNG stores width and height in the first chunk, IHDR.
  expect(image.subarray(12, 16).toString('ascii')).toBe('IHDR');
  expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([16, 24]);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(result).toBeHidden();
  await expect(file).toHaveValue('');
});
