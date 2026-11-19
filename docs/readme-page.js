const repo = 'https://github.com/Electron8448/Toolbox';
const elements = new Set(['A','P','DIV','SPAN','STRONG','EM','CODE','PRE','BLOCKQUOTE','UL','OL','LI','DETAILS','SUMMARY','TABLE','THEAD','TBODY','TR','TH','TD','H1','H2','H3','H4','HR','BR']);

export function readmePage(breadcrumbs) {
  return `${breadcrumbs('README')}<header class="page-heading"><h1>Toolbox README</h1></header>
    <article class="panel readme-content" aria-label="Toolbox documentation" aria-busy="true"><p>Loading README…</p></article>`;
}

export async function bindReadme() {
  const target = document.querySelector('.readme-content');
  try {
    const [response, {marked}] = await Promise.all([fetch(new URL('./README.md', import.meta.url)), import('./vendor/marked.mjs')]);
    if (!response.ok) throw new Error('The documentation file could not be loaded.');
    const fragment = document.createElement('template');
    fragment.innerHTML = await marked.parse(await response.text());
    if (!target.isConnected) return;
    fragment.content.querySelector('h1')?.remove();
    const counts = new Map();
    for (const node of fragment.content.querySelectorAll('*')) {
      if (!elements.has(node.tagName)) { node.remove(); continue; }
      const href = node.getAttribute('href');
      for (const attribute of [...node.attributes]) node.removeAttribute(attribute.name);
      if (/^H[2-4]$/.test(node.tagName)) {
        const slug = node.textContent.trim().toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-');
        const count = counts.get(slug) ?? 0;
        counts.set(slug,count+1);
        node.id = count ? slug+'-'+count : slug;
      }
      if (node.tagName !== 'A' || !href) continue;
      if (href.startsWith('#')) {
        node.href = href;
      } else {
        const absolute = /^(?:https?:|mailto:)/i.test(href);
        if (absolute) node.href = href;
        else if (/^[\w./-]+(?:#[\w-]+)?$/.test(href) && !href.startsWith('/')) {
          node.href = repo + (href.endsWith('/') ? '/tree/main/' : '/blob/main/') + href;
        }
        if (node.hasAttribute('href')) {
          node.target = '_blank';
          node.rel = 'noopener noreferrer';
        }
      }
    }
    target.replaceChildren(fragment.content);
  } catch {
    if (!target.isConnected) return;
    const link = document.createElement('a');
    link.href = repo + '/blob/main/README.md';
    link.textContent = 'Read the documentation on GitHub';
    target.replaceChildren(link);
  } finally {
    target.removeAttribute('aria-busy');
  }
}
