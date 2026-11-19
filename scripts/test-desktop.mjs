import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron, expect } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const executablePath = process.argv[2] && resolve(process.argv[2]);
const results = resolve(root,'test-results');
await mkdir(results,{recursive:true});
const profile = await mkdtemp(resolve(results,'desktop-profile-'));
const env = {...process.env};
delete env.ELECTRON_RUN_AS_NODE;
const launch = () => electron.launch({
  ...(executablePath ? {executablePath} : {}),
  args: [
    '--user-data-dir=' + profile,
    ...(executablePath ? [] : [resolve(root)])
  ],
  cwd:root, env, timeout:60000
});
let desktop = await launch();
try {
  let page = await desktop.firstWindow();
  await expect(page.getByRole('heading',{name:'Everything you need, all in one toolbox.'})).toBeVisible();
  assert.equal(new URL(page.url()).protocol, 'toolbox:');
  assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
  const settings = await desktop.evaluate(({BrowserWindow}) => {
    const window = BrowserWindow.getAllWindows()[0];
    const settings = window.webContents.getLastWebPreferences();
    return {size:window.getSize(), isolation:settings.contextIsolation, node:settings.nodeIntegration, sandbox:settings.sandbox};
  });
  assert.deepEqual(settings.size,[1400,900]);
  assert.equal(settings.isolation,true);
  assert.equal(settings.node,false);
  assert.equal(settings.sandbox,true);
  await page.evaluate(()=>localStorage.setItem('desktop-persistence-test','saved'));
  await page.getByRole('searchbox',{name:'Search tools'}).fill('Word Counter');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.getByRole('link',{name:/^Word Counter Writing/}).click();
  await page.getByRole('textbox',{name:'Your text'}).fill('Hello Toolbox desktop');
  await page.getByRole('button',{name:'Run tool'}).click();
  await expect(page.locator('.standard-result pre')).toHaveText('3');
  const api = await page.evaluate(async () => {
    const response = await fetch('/api/check-links',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(['http://127.0.0.1'])
    });
    return {status:response.status, results:await response.json()};
  });
  assert.equal(api.status,200);
  assert.match(api.results[0].status,/public|supported/);
  const external = await desktop.evaluate(({BrowserWindow}) => {
    const contents = BrowserWindow.getAllWindows()[0].webContents;
    return contents.executeJavaScript("window.open('javascript:alert(1)'); null").then(()=>BrowserWindow.getAllWindows().length);
  });
  assert.equal(external,1);

  await page.goto('toolbox://app/developer-tools/utilities/code-editor');
  await expect(page.locator('.monaco-editor')).toBeVisible({timeout:30000});
  await page.getByLabel('Upload project files').setInputFiles({
    name:'desktop.html', mimeType:'text/html',
    buffer:Buffer.from('<h1>Desktop preview</h1><script>document.querySelector("h1").textContent += " works";</script>')
  });
  await page.getByLabel('Preview page').selectOption('desktop.html');
  await page.getByRole('button',{name:'Run preview'}).click();
  await expect(page.frameLocator('iframe').getByRole('heading')).toHaveText('Desktop preview works');
  await page.screenshot({path:resolve(results,'desktop-editor.png')});
  await desktop.close();
  desktop = await launch();
  page = await desktop.firstWindow();
  await expect(page.getByRole('heading',{name:'Browse categories'})).toBeVisible();
  assert.equal(await page.evaluate(()=>localStorage.getItem('desktop-persistence-test')),'saved');
  await page.goto('toolbox://app/developer-tools/utilities/code-editor');
  await expect(page.getByRole('tab',{name:'desktop.html'})).toBeVisible({timeout:30000});
  console.log('Desktop launch, isolation, navigation, calculation, backend, editor preview and restart persistence passed.');
} finally {
  await desktop.close();
}
