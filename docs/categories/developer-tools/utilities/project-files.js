const textTypes = {
  html: 'html', htm: 'html', css: 'css', js: 'javascript', mjs: 'javascript',
  json: 'json', md: 'markdown', txt: 'plaintext', ts: 'typescript', py: 'python',
  svg: 'xml', xml: 'xml', csv: 'plaintext', yml: 'yaml', yaml: 'yaml'
};

export const fileTypes = {
  html: ['HTML', 'html'], css: ['CSS', 'css'], javascript: ['JavaScript', 'js'],
  typescript: ['TypeScript', 'ts'], json: ['JSON', 'json'], markdown: ['Markdown', 'md'],
  python: ['Python', 'py'], xml: ['XML', 'xml'], yaml: ['YAML', 'yaml'], plaintext: ['Plain text', 'txt']
};
const mediaTypes = {
  html:'text/html', htm:'text/html', css:'text/css', js:'text/javascript', mjs:'text/javascript',
  json:'application/json', svg:'image/svg+xml', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
  gif:'image/gif', webp:'image/webp', ico:'image/x-icon', woff:'font/woff', woff2:'font/woff2',
  ttf:'font/ttf', mp4:'video/mp4', mp3:'audio/mpeg', wav:'audio/wav'
};
const extension = path => path.slice(path.lastIndexOf('/') + 1).match(/\.([^.]+)$/)?.[1].toLowerCase();

export function cleanPath(value) {
  const path = value.trim();
  if (!path || path.length > 240 || /[\\:*?"<>|%#\x00-\x1f]/.test(path) ||
      path.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part))) {
    throw new Error('Enter a file name or folder path such as pages/about.html.');
  }
  return path;
}
export function languageFor(path) {
  return textTypes[extension(path)] ?? 'plaintext';
}
export function withType(path, type) {
  const next = fileTypes[type][1];
  return path.replace(/\.[^./]+$/, '') + '.' + next;
}
export function initialFiles(draft = {}) {
  return ['index.html','styles.css','script.js'].map(path => {
    const type = languageFor(path);
    return {path, text: typeof draft?.[type] === 'string' ? draft[type] : ''};
  });
}
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
export const fileBytes = file => file.bytes ?? encoder.encode(file.text);
export function fileMime(file) {
  return mediaTypes[extension(file.path)] ?? (file.bytes ? 'application/octet-stream' : 'text/plain');
}

export async function importFiles(files, folder) {
  if (files.length > 250 || files.reduce((sum,file) => sum + file.size, 0) > 25_000_000) {
    throw new Error('Choose up to 250 files totalling no more than 25 MB.');
  }
  return Promise.all(files.map(async file => {
    const path = cleanPath(folder ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      if (!bytes.includes(0)) return {path, text: decoder.decode(bytes)};
    } catch {}
    return {path, bytes};
  }));
}

export function openDraftStore(key) {
  const open = new Promise((resolve,reject) => {
    const request = indexedDB.open('toolbox-editor-projects', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  async function transaction(mode, operation) {
    const database = await open;
    return new Promise((resolve,reject) => {
      const tx = database.transaction('projects', mode);
      const request = operation(tx.objectStore('projects'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  }
  return {
    read: () => transaction('readonly', store => store.get(key)),
    write: project => transaction('readwrite', store => store.put(project, key))
  };
}

function base64(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    text += String.fromCharCode(...bytes.subarray(i,i+8192));
  }
  return btoa(text);
}

export function projectHTML(files, entry) {
  const lookup = new Map(files.map(file => [file.path,file]));
  const origin = 'https://toolbox-preview.invalid';
  const document = new DOMParser().parseFromString(entry.text, 'text/html');
  const resolvedFiles = new Set();
  const getFile = (reference, from) => {
    if (!reference || reference.startsWith('#')) return;
    try {
      const url = new URL(reference, origin + '/' + from.split('/').map(encodeURIComponent).join('/'));
      if (url.origin === origin) return lookup.get(decodeURIComponent(url.pathname.slice(1)));
    } catch {}
  };
  function resource(reference, from, chain = new Set()) {
    const file = getFile(reference, from);
    if (!file || chain.has(file.path)) return null;
    resolvedFiles.add(file.path);
    const mime = fileMime(file);
    const bytes = mime === 'text/css' && typeof file.text === 'string'
      ? encoder.encode(cssResources(file.text, file.path, new Set([...chain, file.path]))) : fileBytes(file);
    return 'data:' + mime + ';base64,' + base64(bytes);
  }
  function cssResources(text, from, chain) {
    return text
      .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match,_,url) => {
        const data = resource(url.trim(), from, chain);
        return data ? 'url("' + data + '")' : match;
      })
      .replace(/(@import\s+)(['"])(.*?)\2/gi, (match, prefix, _, url) => {
        const data = resource(url, from, chain);
        return data ? prefix + '"' + data + '"' : match;
      });
  }
  for (const element of document.querySelectorAll('script[src], img[src], source[src], video[src], audio[src], link[href]')) {
    const attr = element.hasAttribute('src') ? 'src' : 'href';
    const data = resource(element.getAttribute(attr), entry.path);
    if (data) element.setAttribute(attr, data);
  }
  for (const element of document.querySelectorAll('style')) {
    element.textContent = cssResources(element.textContent, entry.path, new Set());
  }
  if (entry.path === 'index.html') {
    for (const [path, tag, attr] of [['styles.css','link','href'],['script.js','script','src']]) {
      const file = lookup.get(path);
      if (resolvedFiles.has(path) || !file?.text?.trim()) continue;
      const element = document.createElement(tag);
      if (tag === 'link') element.rel = 'stylesheet';
      element.setAttribute(attr, resource(path, entry.path));
      (tag === 'link' ? document.head : document.body).append(element);
    }
  }
  if (!document.querySelector('meta[charset]')) {
    const charset = document.createElement('meta');
    charset.setAttribute('charset','utf-8');
    document.head.prepend(charset);
  }
  return '<!doctype html>\n' + document.documentElement.outerHTML;
}
