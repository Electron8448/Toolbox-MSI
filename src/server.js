import { createServer } from 'node:http';
import { readdirSync } from 'node:fs';
import { checkLinks } from './link-checker.js';
import { readFile } from 'node:fs/promises';
import { categories, groups, tools } from './categories/index.js';

const pages = new Set(['/', '/search', '/readme', ...categories.map(category => category.path), ...groups.map(group => group.path), ...tools.map(tool => tool.path)]);
const sourceFiles = readdirSync(new URL('./categories/', import.meta.url), {recursive:true})
  .filter(file=>file.endsWith('.js')).map(file=>'categories/'+file.replaceAll('\\','/'));
const calculators = readdirSync(new URL('./calculator/', import.meta.url))
  .filter(file => file.endsWith('.js')).map(file => 'calculator/' + file);
const vendorFiles = readdirSync(new URL('./vendor/',import.meta.url), {recursive:true})
  .filter(file=>/\.(?:m?js|json|css)$/.test(file)).map(file=>'vendor/'+file.replaceAll('\\','/'));
const modules = ['app.js','readme-page.js','routing.js','tool-page.js','tool-results.js',...sourceFiles,...calculators,...vendorFiles];
const assets=new Map(modules.map(file=>['/'+file,[file,file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/javascript']]));
assets.set('/README.md',['../README.md','text/markdown']);
assets.set('/styles.css',['styles.css','text/css']);
assets.set('/toolbox-icon.svg',['toolbox-icon.svg','image/svg+xml']);
export function createToolboxServer() {
  return createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname.replace(/\/$/, '') || '/';
    if (path === '/api/check-links') return await checkLinks(request, response);
    const entry = pages.has(path) ? ['index.html', 'text/html'] : assets.get(path);
    if (!Array.isArray(entry)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Page not found');
      return;
    }
    const [file, type] = entry;
    const body = await readFile(new URL(file, import.meta.url));
    response.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
    response.end(body);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Unable to load page');
  }
  });
}

