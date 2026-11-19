const pagesBase = typeof document === 'undefined' ? null : document.querySelector('meta[name="toolbox-pages-base"]');
const basePath = pagesBase?.content ?? '';
export const staticHosting = pagesBase !== null;

export function sitePath(path) {
  return basePath + path + (staticHosting && path !== '/' ? '/' : '');
}

export function routePath(pathname) {
  return pathname.slice(basePath.length).replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
}
