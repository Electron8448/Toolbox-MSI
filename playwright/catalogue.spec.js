import { expect, test } from '@playwright/test';
import { tools } from '../src/categories/index.js';

const sampleText = 'Maths is useful. Writing is useful too.\nTry Toolbox today.';
const sampleURL = 'https://example.com/toolbox?source=test';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAAC56t6BAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAQSURBVBhXY2hgaPjPgBUAADAEAgAruNyXAAAAAElFTkSuQmCC',
  'base64'
);

const examples = {
  'fraction-calculator': { input: { first: '1/2', second: '1/4' }, output: /3\/4/ },
  'fraction-to-decimal-converter': { input: { value: '1/4' }, output: '0.25' },
  'fraction-to-percentage-converter': { input: { value: '1/4' }, output: '25%' },
  'equation-solver': { input: { equation: '2x + 4 = 10' } },
  'expression-simplifier': { input: { expression: '2x + 3x' } },
  'expanding-brackets-calculator': { input: { expression: '2(x + 3)' } },
  'scientific-calculator': { input: { expression: '2 + 3 * 4' }, output: '14' },
  'ratio-calculator': { input: { a: '12', b: '8' } },
  'time-zone-converter': { input: { from: 'UTC', to: 'Europe/London' } },
  'average-calculator': { input: { values: '2, 4, 6' } },
  'calendar-generator': { input: { year: '2024', month: '2' } },
  'leap-year-checker': { input: { year: '2024' }, output: /leap year/i },
  'event-countdown': { input: { target: '2099-01-01T12:00' }, timer: true },
  'hex-to-rgb-converter': { input: { value: '#ff0000' } },
  'json-formatter': { input: { text: '{"count":2}' } },
  'json-validator': { input: { text: '{"count":2}' } },
  'json-minifier': { input: { text: '{ "count": 2 }' }, output: '{"count":2}' },
  'html-formatter': { input: { text: '<main><p>Hello</p></main>' } },
  'css-minifier': { input: { text: 'p { color: red; }' } },
  'css-formatter': { input: { text: 'p{color:red}' } },
  'javascript-formatter': { input: { text: 'const answer=42' } },
  'javascript-minifier': { input: { text: 'function add(a, b) { return a + b; }' } },
  'image-cropper': { input: { width: '1', height: '1' } },
  'image-dimension-checker': { output: /2 × 3 px/ },
  'csv-viewer': { input: { text: 'name,score\nAda,10' } },
  'csv-to-json-converter': { input: { text: 'name,score\nAda,10' }, output: /Ada/ },
  'json-to-csv-converter': { input: { text: '[{"name":"Ada","score":10}]' }, output: /Ada/ },
  'flashcard-maker': { input: { text: 'Capital of France? | Paris' }, output: /Paris/ },
  'quiz-generator': { input: { text: 'Capital of France? | Paris' } },
  'study-notes-organiser': { input: { text: 'Maths | Revise fractions' } },
  'roman-numeral-converter': { input: { value: 'XIV' }, output: '14' },
  'periodic-table-explorer': { input: { query: 'He' }, output: /Helium/ },
  'task-prioritiser': { input: { text: 'Review fractions | 5 | 4' }, output: /9 \/ 10/ },
  'website-link-checker': { input: { text: sampleURL }, output: /200 OK/ },
  'hashtag-counter': { input: { text: '#Maths and #Toolbox' }, output: /2 hashtags/ },
  'html-previewer': { input: { text: '<h1>Preview example</h1>' }, preview: 'Preview example' },
  'markdown-previewer': { input: { text: '# Preview example' }, preview: 'Preview example' }
};

const custom = {
  async 'fraction-simplifier'(page) {
    await page.getByRole('textbox', { name: 'Search for a fraction' }).fill('6/12');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.locator('#fraction-output')).toContainText('1 over 2');
  },
  async 'graphing-calculator'(page) {
    await page.getByRole('textbox', { name: 'Function in x' }).fill('2*x + 1');
    await page.getByRole('button', { name: 'Plot graph' }).click();
    await expect(page.locator('#graph-status')).toContainText('y = 2*x + 1');
  },
  async 'beginner-graph-maker'(page) {
    await page.getByRole('spinbutton', { name: 'Slope' }).fill('3');
    await page.getByRole('spinbutton', { name: 'Move up or down' }).fill('2');
    const transfer = page.getByRole('link', { name: /Open in Graphing Calculator/ });
    await transfer.click();
    await expect(page.getByRole('textbox', { name: 'Function in x' })).toHaveValue('3*x + 2');
  },
  async 'code-editor'(page) {
    await page.getByLabel('Upload project files').setInputFiles({
      name: 'preview.html', mimeType: 'text/html', buffer: Buffer.from('<h1>Editor preview</h1>')
    });
    await page.getByLabel('Preview page').selectOption('preview.html');
    await page.getByRole('button', { name: 'Run preview' }).click();
    await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Editor preview' })).toBeVisible();
  }
};

function defaultInput(field) {
  const named = {
    url: sampleURL, title: 'Review fractions', find: 'useful', replacement: 'helpful', keyword: 'useful',
    min: '1', max: '10', revenue: '100', cost: '45', pages: '100', read: '25', end: '2024-02-03'
  };
  if (field.type === 'time') return field.name === 'end' ? '12:00' : '09:00';
  return named[field.name] ?? {
    text: 'Toolbox', number: '3', textarea: sampleText, date: '2024-02-01', 'datetime-local': '2024-02-01T12:00'
  }[field.type];
}

async function runStandardTool(page, tool, slug) {
  const example = examples[slug] ?? {};
  if (slug === 'website-link-checker') {
    // Keep the UI test deterministic without making a request to a third-party site.
    await page.route('**/api/check-links', async route => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual([sampleURL]);
      await route.fulfill({ json: [{ url: sampleURL, status: '200 OK' }] });
    });
  }

  const form = page.locator('form.standard-tool');
  for (const field of tool.fields) {
    const input = form.getByLabel(field.label, { exact: true });
    if (!(await input.isEnabled())) continue;
    const value = example.input?.[field.name];
    if (field.type === 'select') {
      if (value !== undefined) await input.selectOption(value);
    } else if (field.type === 'file') {
      if (slug === 'jpg-to-png-converter') {
        const jpeg = await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          canvas.width = 2;
          canvas.height = 3;
          return canvas.toDataURL('image/jpeg').split(',')[1];
        });
        await input.setInputFiles({ name: 'sample.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') });
      } else {
        await input.setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: png });
      }
    } else if (value !== undefined || field.value == null) {
      await input.fill(value ?? defaultInput(field));
    }
  }
  await form.getByRole('button', { name: tool.action ?? 'Run tool', exact: true }).click();

  const result = page.getByRole('region', { name: tool.records ? 'Saved entries' : 'Result', exact: true });
  if (tool.records) {
    await expect(result.getByRole('listitem')).toContainText('Review fractions');
  } else {
    await expect(result).toBeVisible();
    if (example.preview) {
      await expect(result.frameLocator('iframe').locator('h1')).toHaveText(example.preview);
    } else if (example.timer || /timer|stopwatch|break-reminder/.test(slug)) {
      await expect(result.locator('pre')).toHaveText(/^\d+:\d{2}:\d{2}$/);
      const pause = result.getByRole('button', { name: 'Pause' });
      await pause.click();
      await expect(result.getByRole('button', { name: 'Resume' })).toBeVisible();
    } else if (example.output) {
      await expect(result.locator('pre')).toHaveText(example.output);
    } else {
      await expect(result.locator('pre')).toContainText(/\S/);
    }
  }
  await expect(form.getByRole('alert')).toBeEmpty();
}

for (const tool of tools) {
  const slug = tool.path.split('/').at(-1);
  test(`${tool.category.name} / ${tool.group.name} / ${tool.name}`, async ({ page }) => {
    await page.goto(tool.path);
    await expect(page.getByRole('heading', { name: tool.name, exact: true, level: 1 })).toBeVisible();
    if (custom[slug]) await custom[slug](page);
    else await runStandardTool(page, tool, slug);
  });
}
