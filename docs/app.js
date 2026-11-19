import { editorPage, bindEditor } from './categories/developer-tools/utilities/editor-ui.js';
import { readmePage, bindReadme } from './readme-page.js';
import { routePath, sitePath } from './routing.js';
import { standardPage, bindStandard } from './tool-page.js';
import beginnerGraphMaker from './categories/maths/algebra/beginner-graph-maker/index.js';
import { makerPage, bindMaker } from './categories/maths/algebra/beginner-graph-maker/page.js';
import fractionSimplifier from './categories/maths/fractions/fraction-simplifier/index.js';
import graphingCalculator from './categories/maths/algebra/graphing-calculator/index.js';
import { graphPage, bindGraph } from './categories/maths/algebra/graphing-calculator/page.js';
import { categories, groups, tools } from './categories/index.js';
import { fractionPage, bindFraction } from './categories/maths/fractions/fraction-simplifier/page.js';

const toolPages = new Map([
  [fractionSimplifier.path, { page: fractionPage, bind: bindFraction }],
  [graphingCalculator.path, { page: graphPage, bind: bindGraph }],
  [beginnerGraphMaker.path, { page: makerPage, bind: bindMaker }]
]);

const categoryHues = {
  '/maths': 195,
  '/writing': 338,
  '/converters': 43,
  '/calculators': 160,
  '/date-time': 256,
  '/colour-design': 20,
  '/developer-tools': 221,
  '/image-tools': 297,
  '/text-data': 111,
  '/education-study': 67,
  '/random-generators': 355,
  '/productivity': 140,
  '/web-seo-tools': 181
};

const palettes = new Map();
for (const category of categories) {
  const hue = categoryHues[category.path];
  if (hue === undefined) continue;
  palettes.set(category.path, { hue, ink: 29, tint: 96 });
  const siblings = groups.filter(group => group.category === category);
  for (const [index, group] of siblings.entries()) {
    palettes.set(group.path, {
      hue,
      ink: 17 + 11 * index / Math.max(1, siblings.length - 1),
      tint: 97 - 5 * index / Math.max(1, siblings.length - 1)
    });
  }
}

function paletteStyle(path) {
  const palette = palettes.get(path);
  if (!palette) return '';
  const { hue, ink, tint } = palette;
  return `--catalogue-accent:hsl(${hue} 58% ${ink}%);--catalogue-tint:hsl(${hue} 66% ${tint}%);--catalogue-border:hsl(${hue} 41% 78%);`;
}

const main = document.querySelector('main');
const sidebar = document.querySelector('#sidebar');
const menu = document.querySelector('#menu');
const toolboxMark = document.querySelector('.toolbox-mark').outerHTML;
document.querySelector('#nav-categories').innerHTML = categories.map(category => `
  <details data-category="${category.path}" style="${paletteStyle(category.path)}">
    <summary>${category.name}</summary>
    <a href="${sitePath(category.path)}" data-route>All ${category.name}</a>
    ${groups.filter(group=>group.category===category).map(group=>`<a href="${sitePath(group.path)}" style="${paletteStyle(group.path)}" data-route>${group.name}</a>`).join('')}
  </details>`).join('');
const arrow = '<span class="arrow" aria-hidden="true">↗</span>';

function badge(category) {
  return `<span class="category-icon ${category.theme}" aria-hidden="true">${category.icon}</span>`;
}

function searchForm(home = false) {
  return `<form class="search-box" role="search" action="${sitePath('/search')}">
    <span class="magnifier" aria-hidden="true"></span>
    <label class="sr-only" for="query">Search tools</label>
    <input id="query" name="q" type="search" placeholder="Search for a tool…" autocomplete="off">
    ${home ? '<button class="primary" type="submit">Search</button>' : ''}
  </form>`;
}

function breadcrumbs(...items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${sitePath('/')}" data-route>Home</a>
    ${items.map(item => `<span aria-hidden="true">/</span>${typeof item === 'string'
      ? `<span aria-current="page">${item}</span>`
      : `<a href="${sitePath(item.path)}" style="${paletteStyle(item.path)}" data-route>${item.name}</a>`}`).join('')}</nav>`;
}

function toolCard(tool) {
  return `<a class="tool-card" href="${sitePath(tool.path)}" style="${paletteStyle(tool.group.path)}" data-route>
    <span class="tool-icon" aria-hidden="true"><b>${tool.icon ?? tool.category.icon}</b></span>
    <span><strong>${tool.name}</strong><small style="${paletteStyle(tool.category.path)}">${tool.category.name} · ${tool.group.name}</small></span>${arrow}
  </a>`;
}

function discoveryCard(item) {
  const category=item.category??item;
  return `<a class="tool-card" data-route href="${sitePath(item.path)}" style="${paletteStyle(item.path)}">${badge(category)}
    <span><strong>${item.name}</strong><small${item.category ? ` style="${paletteStyle(category.path)}"` : ''}>${item.category?category.name:item.description}</small></span>${arrow}</a>`;
}

const popular = ['/maths/fractions/fraction-simplifier','/writing/text-tools/word-counter','/developer-tools/json/json-formatter','/web-seo-tools/website/qr-code-generator'];
function recentPaths() {
  try { const paths=JSON.parse(localStorage.getItem('toolbox:recent')??'[]');return Array.isArray(paths)?paths:[]; }
  catch {return [];}
}
function showTools(title,paths) {
  const selected=paths.map(path=>tools.find(tool=>tool.path===path)).filter(Boolean);
  return selected.length?`<section class="home-collection"><h2>${title}</h2><div class="discovery-grid">${selected.map(toolCard).join('')}</div></section>`:'';
}

function homePage() {
  return `<section class="hero">
    <div class="hero-copy">
      <h1>Everything you need, <em>all in one toolbox.</em></h1>
      <p>Find a calculator, converter or writing tool in one place.</p>
      <div class="home-search">${searchForm(true)}</div>
      <div class="actions"><a class="secondary readme-link" href="${sitePath('/readme')}" data-route>Read the README ${arrow}</a></div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="art-grid"></div>
      <div class="art-orbit"></div>
      <span class="spark spark-one">✦</span><span class="spark spark-two">✧</span>
      <div class="hero-brand">${toolboxMark}</div>
    </div>
  </section>
  <section class="home-collection category-directory"><h2>Browse categories</h2><div class="discovery-grid">${categories.map(discoveryCard).join('')}</div></section>
  ${showTools('Popular tools',popular)}
  ${showTools('Recently used',recentPaths())}
  <section class="workspace panel" aria-labelledby="workspace-title">
    <div>
      <h2 id="workspace-title">Toolbox workspace</h2>
      <p>Have an idea for a tool we should add? Submit it as a bug report on GitHub.</p>
    </div>
    <div class="actions">
      <a class="secondary" href="https://github.com/Electron8448/Toolbox">View workspace ↗</a>
      <a class="secondary" href="https://github.com/Electron8448/Toolbox/issues/new?title=Tool%20suggestion%3A%20">Submit a bug report ↗</a>
    </div>
  </section>`;
}

function emptyState(icon, title, description) {
  return `<div class="empty"><span class="category-icon ${icon === 'Aa' ? 'writing' : 'maths'}" aria-hidden="true">${icon}</span>
    <h2>${title}</h2><p>${description}</p></div>`;
}

function categoryPage(category) {
  return `${breadcrumbs(category.name)}
    <header class="page-heading">${badge(category)}<h1>${category.name}</h1><p>${category.description}</p></header>
    ${groups.filter(group => group.category === category).map(group => `<section class="tool-group">
      <h2><a href="${sitePath(group.path)}" style="${paletteStyle(group.path)}" data-route>${group.name}</a></h2>
      ${groupCards(group)}
    </section>`).join('')}`;
}

function groupCards(group) {
  return `<div class="directory-grid">${tools.filter(tool => tool.group === group).map(toolCard).join('')}</div>`;
}

function groupPage(group) {
  return `${breadcrumbs(group.category, group.name)}
    <header class="page-heading">${badge(group.category)}<h1>${group.name}</h1></header>
    <section class="tool-group" aria-label="Tools">${groupCards(group)}</section>`;
}

function searchPage() {
  return `${breadcrumbs('Search')}<header class="page-heading"><h1>Search tools</h1>
    <p>Find tools, categories and subcategories by name.</p></header>
    ${searchForm()}
    <p class="sr-only" id="search-status" role="status"></p>
    <section class="search-results" aria-label="Search results"></section>`;
}

function bindSearch() {
  const input = document.querySelector('#query');
  const results = document.querySelector('.search-results');
  const status = document.querySelector('#search-status');
  input.value = new URLSearchParams(location.search).get('q') ?? '';
  function update() {
    const term = input.value.trim().toLowerCase();
    const matches = [...tools, ...categories, ...groups].filter(item => item.name.toLowerCase().includes(term));
    status.textContent = term ? `${matches.length} matching ${matches.length === 1 ? 'result' : 'results'}` : '';
    results.innerHTML = !term
      ? emptyState('⌕', 'Search by tool name', 'Start typing to find a tool, category or subcategory.')
      : matches.length ? matches.map(item => item.group ? toolCard(item) : discoveryCard(item)).join('')
      : emptyState('⌕', 'No matching tools', 'Check the spelling or try a shorter search.');
  }
  input.addEventListener('input', () => {
    const params = new URLSearchParams();
    if (input.value) params.set('q', input.value);
    renderedURL = sitePath('/search') + (params.size ? '?' + params : '');
    history.replaceState(null, '', renderedURL);
    update();
  });
  input.form.addEventListener('submit', event => event.preventDefault());
  update();
}

let disposeTool;
let renderedURL;
function render() {
  renderedURL = location.pathname + location.search;
  disposeTool?.();
  const path = routePath(location.pathname);
  const category = categories.find(item => item.path === path);
  const group = groups.find(item => item.path === path);
  const tool = tools.find(item => item.path === path);
  const toolPage = toolPages.get(path) ?? (tool?.editor ? { page: editorPage, bind: bindEditor } : tool?.run ? { page: standardPage, bind: bindStandard } : null);
  main.className = path === '/' ? 'shell home' : 'shell inner';
  main.style.cssText = paletteStyle(tool?.group.path ?? group?.path ?? category?.path);
  main.innerHTML = category ? categoryPage(category) : toolPage ? toolPage.page(tool, breadcrumbs)
    : group ? groupPage(group) : path === '/readme' ? readmePage(breadcrumbs) : path === '/search' ? searchPage() : homePage();
  document.title = path === '/readme' ? 'README | Toolbox' : path === '/' ? 'Toolbox' : `${category?.name ?? group?.name ?? tool?.name ?? 'Search'} | Toolbox`;
  sidebar.querySelectorAll('nav details').forEach(details => {
    const selected = tool?.category.path ?? group?.category.path ?? category?.path;
    if (selected === details.dataset.category) details.open = true;
  });
  sidebar.querySelectorAll('nav a').forEach(link => {
    const currentPath = tool?.category.path ?? group?.category.path ?? path;
    if (routePath(link.pathname) === currentPath) link.setAttribute('aria-current', routePath(link.pathname) === path ? 'page' : 'location');
    else link.removeAttribute('aria-current');
  });
  disposeTool=toolPage?.bind(tool);
  if(tool){
    try {localStorage.setItem('toolbox:recent',JSON.stringify([tool.path,...recentPaths().filter(path=>path!==tool.path)].slice(0,5)));} catch {}
  }

  if (path === '/search') bindSearch();
  if (path === '/readme') bindReadme();
}

function closeMenu() {
  if (sidebar.open) sidebar.close();
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open menu');
}

function navigate(url, focusSearch = false) {
  closeMenu();
  if (url !== location.pathname + location.search) history.pushState(null, '', url);
  render();
  window.scrollTo(0, 0);
  (focusSearch ? document.querySelector('#query') : main).focus({ preventScroll: true });
}

menu.addEventListener('click', () => {
  if (sidebar.open) return closeMenu();
  sidebar.showModal();
  menu.setAttribute('aria-expanded', 'true');
  menu.setAttribute('aria-label', 'Close menu');
});
sidebar.querySelector('.close-menu').addEventListener('click', closeMenu);
sidebar.addEventListener('cancel', event => {
  event.preventDefault();
  closeMenu();
});
sidebar.addEventListener('click', event => {
  if (event.target === sidebar) {
    const bounds = sidebar.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right) closeMenu();
  }
});
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-route]');
  if (!link || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(link.pathname + link.search, routePath(link.pathname) === '/search');
});
main.addEventListener('submit', event=>{
  if(!event.target.closest('.home-search'))return;
  event.preventDefault();
  const query=new FormData(event.target).get('q').trim();
  navigate(sitePath('/search')+(query?'?'+new URLSearchParams({q:query}):''),true);
});
window.addEventListener('popstate', () => {
  closeMenu();
  if (renderedURL !== location.pathname + location.search) render();
});
render();
