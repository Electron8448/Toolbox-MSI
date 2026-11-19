import { sitePath } from '../../../routing.js';
import { showDetails } from '../../../tool-results.js';
import { cleanPath, fileBytes, fileMime, fileTypes, importFiles, initialFiles, languageFor, openDraftStore, projectHTML, withType } from './project-files.js';

const base = new URL('../../../vendor/monaco/vs/', import.meta.url);
const icons = { html: '<>', css: '#', javascript: 'JS', typescript: 'TS', json: '{}', markdown: 'MD' };
let engine;
function loadEditor() {
  if (engine) return engine;
  engine = new Promise((resolve, reject) => {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = new URL('editor/editor.main.css', base).href;
    document.head.append(style);
    const loader = document.createElement('script');
    loader.src = new URL('loader.js', base).href;
    loader.onload = () => {
      const amd = globalThis.require;
      amd.config({ paths: { vs: base.href.replace(/\/$/, '') } });
      amd(['vs/editor/editor.main'], module => resolve(module ?? globalThis.monaco), reject);
    };
    loader.onerror = () => reject(new Error('The full editor could not load.'));
    document.head.append(loader);
  });
  return engine;
}

export function editorPage(tool, breadcrumbs) {
  return `${breadcrumbs(tool.category, tool.group, tool.name)}
    <header class="page-heading"><span class="category-icon maths" aria-hidden="true">⌘</span>
      <h1>Code Editor</h1><p>Edit a project, preview an HTML page, and download your files.</p></header>
    <form class="panel standard-tool code-editor-form">
      <div class="editor-workbench">
        <aside class="editor-explorer" aria-label="Explorer">
          <div class="editor-explorer-title">Explorer</div>
          <div class="editor-files"></div>
        </aside>
        <div class="editor-main">
          <div class="editor-toolbar" aria-label="Project commands">
            <button type="button" data-command="new">New file</button>
            <button type="button" data-command="rename">Rename file</button>
            <button type="button" data-command="files">Upload files</button>
            <button type="button" data-command="folder">Open folder</button>
            <button type="button" data-command="save">Download file</button>
            <button type="button" data-command="zip">Download ZIP</button>
            <input type="file" class="editor-import" aria-label="Upload project files" multiple hidden>
            <input type="file" class="editor-folder" aria-label="Upload project folder" webkitdirectory multiple hidden>
          </div>
          <div class="editor-tab-controls">
            <div class="editor-tabs" role="tablist" aria-label="Open files"></div>
            <label>File type <select class="editor-type"></select></label>
          </div>
          <div class="editor-panel" role="tabpanel" id="editor-document">
            <textarea class="code-input editor-fallback" aria-label="Source code" spellcheck="false" wrap="off"></textarea>
            <div class="editor-monaco" hidden></div>
            <p class="editor-binary" hidden>This file can be kept in the project and downloaded.</p>
          </div>
          <div class="editor-status">
            <span class="editor-language"></span><span class="editor-position"></span>
            <button type="button" data-command="find" data-monaco>Find</button>
            <button type="button" data-command="replace" data-monaco>Replace</button>
            <button type="button" data-command="format" data-monaco>Format</button>
          </div>
          <p class="editor-message" role="status" hidden></p>
        </div>
      </div>
      <div class="actions editor-preview-actions">
        <label>Preview page <select class="editor-entry"></select></label>
        <button class="primary">Run preview</button>
      </div>
    </form>
    <section class="panel standard-result" aria-labelledby="editor-preview-title" hidden>
      <h2 id="editor-preview-title">Preview</h2><div class="result-details"></div>
    </section>
    <dialog class="editor-path-dialog" aria-labelledby="editor-path-title">
      <form><h2 id="editor-path-title"></h2><div class="field">
        <label for="editor-path">File name or path</label><input id="editor-path" required maxlength="240" placeholder="pages/about.html">
      </div><p class="error" role="alert"></p>
      <div class="actions"><button class="primary">Save</button><button class="secondary" type="button">Cancel</button></div></form>
    </dialog>`;
}

export function bindEditor() {
  const form = document.querySelector('.code-editor-form');
  const tabs = form.querySelector('.editor-tabs');
  const explorer = form.querySelector('.editor-files');
  const panel = form.querySelector('.editor-panel');
  const host = form.querySelector('.editor-monaco');
  const fallback = form.querySelector('.editor-fallback');
  const binary = form.querySelector('.editor-binary');
  const typeSelect = form.querySelector('.editor-type');
  const entrySelect = form.querySelector('.editor-entry');
  const filename = document.querySelector('.editor-path-dialog');
  const pathInput = filename.querySelector('input');
  const result = document.querySelector('.standard-result');
  const details = result.querySelector('.result-details');
  const message = form.querySelector('.editor-message');
  const drafts = openDraftStore(sitePath('/'));
  const models = new Map();
  let files = initialFiles();
  try { files = initialFiles(JSON.parse(localStorage.getItem('toolbox:editor:' + sitePath('/')))); } catch {}
  let active = files[0];
  let entry = 'index.html';
  let mode;
  let editor;
  let monaco;
  let changed = false;
  let disposed = false;
  let saveTimer;
  let disposePreview = () => {};

  function announce(text) {
    message.textContent = text;
    message.hidden = !text;
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    drafts.write({files, entry}).catch(() => {
      if (!disposed) announce('The browser could not save this draft. Download the project to keep it.');
    });
  }

  function changedProject() {
    changed = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 250);
  }

  function setPosition() {
    const cursor = editor?.getModel() && editor.getPosition();
    form.querySelector('.editor-position').textContent = cursor ? `Ln ${cursor.lineNumber}, Col ${cursor.column}` : '';
  }

  function modelFor(file) {
    if (!models.has(file)) {
      const model = monaco.editor.createModel(file.text, languageFor(file.path), monaco.Uri.file('/toolbox/' + file.path));
      models.set(file, {model});
      model.onDidChangeContent(() => { file.text = model.getValue(); changedProject(); });
    }
    return models.get(file);
  }

  function markActive() {
    for (const [index, file] of files.entries()) {
      const selected = file === active;
      tabs.children[index].setAttribute('aria-selected', String(selected));
      tabs.children[index].tabIndex = selected ? 0 : -1;
      explorer.children[index].setAttribute('aria-pressed', String(selected));
      if (selected) panel.setAttribute('aria-labelledby', tabs.children[index].id);
    }
  }

  function activate(file, focus = false) {
    if (editor && active && models.has(active) && editor.getModel()) models.get(active).view = editor.saveViewState();
    active = file;
    const readable = typeof file.text === 'string';
    const language = languageFor(file.path);
    binary.hidden = readable;
    fallback.hidden = !readable || Boolean(editor);
    host.hidden = !readable || !editor;
    fallback.value = file.text ?? '';
    typeSelect.disabled = !readable;
    typeSelect.value = Object.hasOwn(fileTypes, language) ? language : 'plaintext';
    form.querySelector('.editor-language').textContent = readable ? fileTypes[language]?.[0] ?? 'Text' : fileMime(file);
    for (const button of form.querySelectorAll('[data-monaco]')) button.disabled = !editor || !readable;
    if (editor) {
      const current = readable ? modelFor(file) : null;
      editor.setModel(current?.model ?? null);
      if (current?.view) editor.restoreViewState(current.view);
      if (readable) editor.layout();
    }
    markActive();
    setPosition();
    if (focus && readable) (editor ?? fallback).focus();
  }

  function appendFileButton(parent, file, index, isTab) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = isTab ? '' : 'editor-file';
    if (isTab) {
      button.id = 'project-tab-' + index;
      button.setAttribute('role','tab');
      button.setAttribute('aria-controls','editor-document');
    }
    const symbol = document.createElement('span');
    const language = languageFor(file.path);
    symbol.className = 'file-icon ' + language;
    symbol.textContent = icons[language] ?? '·';
    symbol.setAttribute('aria-hidden','true');
    button.append(symbol, file.path);
    button.addEventListener('click', () => activate(file, !isTab));
    if (isTab) button.addEventListener('keydown', event => {
      const keys = {ArrowLeft:(index+files.length-1)%files.length, ArrowRight:(index+1)%files.length, Home:0, End:files.length-1};
      if (!Object.hasOwn(keys,event.key)) return;
      event.preventDefault();
      activate(files[keys[event.key]]);
      tabs.children[keys[event.key]].focus();
    });
    parent.append(button);
  }

  function render(selected = active) {
    tabs.replaceChildren();
    explorer.replaceChildren();
    files.forEach((file,index) => {
      appendFileButton(tabs,file,index,true);
      appendFileButton(explorer,file,index,false);
    });
    const pages = files.filter(file => typeof file.text === 'string' && languageFor(file.path) === 'html');
    if (!pages.some(file => file.path === entry)) entry = pages.find(file => file.path === 'index.html')?.path ?? pages[0]?.path;
    entrySelect.replaceChildren(...(pages.length ? pages.map(file => new Option(file.path,file.path)) : [new Option('No HTML file','')]));
    entrySelect.value = entry ?? '';
    form.querySelector('button[type="submit"], .editor-preview-actions button').disabled = !entry;
    activate(selected);
  }

  function ensureUnique(paths) {
    const lower = paths.map(path=>path.toLowerCase());
    const known = new Set(lower);
    if (known.size !== lower.length || lower.some(path => {
      const parts = path.split('/');
      return parts.slice(1).some((_,index) => known.has(parts.slice(0,index+1).join('/')));
    })) throw new Error('A file with that name or folder path already exists.');
  }

  function disposeModel(file) {
    const current = models.get(file);
    if (!current) return;
    if (editor.getModel() === current.model) editor.setModel(null);
    current.model.dispose();
    models.delete(file);
  }

  function rename(file, path) {
    const next = cleanPath(path);
    if (next === file.path) return;
    ensureUnique([...files.filter(item=>item!==file).map(item=>item.path),next]);
    disposeModel(file);
    if (entry === file.path) entry = next;
    file.path = next;
    render(file);
    changedProject();
  }

  function showPathDialog(action) {
    mode = action;
    filename.querySelector('h2').textContent = action === 'new' ? 'New file' : 'Rename file';
    filename.querySelector('.error').textContent = '';
    pathInput.value = action === 'new' ? '' : active.path;
    filename.showModal();
    pathInput.select();
  }
  filename.querySelector('.secondary').addEventListener('click', () => filename.close());
  filename.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const path = cleanPath(pathInput.value);
      if (mode === 'new') {
        if (files.length >= 250) throw new Error('This project has reached its 250-file limit.');
        ensureUnique([...files.map(file=>file.path),path]);
        const file = {path, text:''};
        files.push(file);
        render(file);
        changedProject();
      } else {
        rename(active,path);
      }
      filename.close();
    } catch (error) {
      filename.querySelector('.error').textContent = error.message;
    }
  });
  typeSelect.append(...Object.entries(fileTypes).map(([key,[label]])=>new Option(label,key)));
  typeSelect.addEventListener('change', () => {
    try {
      rename(active, withType(active.path,typeSelect.value));
      announce('File type updated. File contents were preserved.');
    } catch (error) {
      typeSelect.value = languageFor(active.path);
      announce(error.message);
    }
  });

  async function handleUpload(input, folder) {
    const selection = [...input.files];
    input.value = '';
    if (!selection.length) return;
    try {
      const added = await importFiles(selection,folder);
      if (disposed) return;
      const next = folder ? added : [...files, ...added];
      ensureUnique(next.map(file=>file.path));
      if (next.length > 250 || next.reduce((size,file)=>size+fileBytes(file).length,0)>25_000_000) throw new Error('Keep the project under 250 files and 25 MB.');
      if (folder && files.some(file=>file.text || file.bytes) && !window.confirm('Replace the current project with this folder?')) return;
      if (folder) {
        for (const file of files) disposeModel(file);
        entry = undefined;
      }
      files = next;
      render(folder ? files.find(file=>file.path==='index.html') ?? files[0] : added[0]);
      changedProject();
      announce(folder ? `Opened folder with ${added.length} files.` : `Added ${added.length} file${added.length===1?'':'s'}.`);
    } catch (error) {
      announce(error.message);
    }
  }
  const fileInput = form.querySelector('.editor-import');
  const folderInput = form.querySelector('.editor-folder');
  fileInput.addEventListener('change', () => handleUpload(fileInput,false));
  folderInput.addEventListener('change', () => handleUpload(folderInput,true));
  fallback.addEventListener('input', () => {active.text=fallback.value;changedProject();});
  entrySelect.addEventListener('change', () => {entry=entrySelect.value;changedProject();});

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const commands = {
    new: () => showPathDialog('new'),
    rename: () => showPathDialog('rename'),
    files: () => fileInput.click(),
    folder: () => folderInput.click(),
    save: () => download(new Blob([fileBytes(active)], {type:fileMime(active)}), active.path.split('/').at(-1)),
    zip: async () => {
      try {
        const {zipSync} = await import('../../../vendor/fflate.mjs');
        const entries = Object.assign(Object.create(null), Object.fromEntries(files.map(file=>[file.path,fileBytes(file)])));
        download(new Blob([zipSync(entries,{level:0})],{type:'application/zip'}),'toolbox-project.zip');
      } catch { announce('Could not create a ZIP. You can still download each file separately.'); }
    },
    find: () => editor?.getAction('actions.find')?.run(),
    replace: () => editor?.getAction('editor.action.startFindReplaceAction')?.run(),
    format: () => editor?.getAction('editor.action.formatDocument')?.run()
  };
  form.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', async () => {
    try { await commands[button.dataset.command](); } catch { announce('The editor could not complete that command.'); }
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const page = files.find(file=>file.path===entry);
      if (!page) throw new Error('Choose an HTML file to preview.');
      const html = projectHTML(files,page);
      disposePreview();
      details.replaceChildren();
      result.hidden = false;
      disposePreview = showDetails(details,{
        html, runScripts:true, blob:new Blob([html],{type:'text/html'}),
        filename:page.path.split('/').at(-1), downloadLabel:'Download HTML'
      },()=>{});
      announce('');
    } catch (error) {
      announce(error.message);
    }
  });
  form.addEventListener('keydown', event => {
    if (event.target === fallback && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  render();
  drafts.read().then(saved => {
    if (disposed || changed || !saved?.files?.length) return;
    for (const file of files) disposeModel(file);
    files = saved.files;
    entry = saved.entry;
    render(files.find(file=>file.path===entry) ?? files[0]);
  }).catch(() => {});
  loadEditor().then(api => {
    if (disposed || !form.isConnected) return;
    monaco = api;
    monaco.editor.defineTheme('toolbox-dark',{
      base:'vs-dark',inherit:true,rules:[
        {token:'keyword',foreground:'569CD6'},{token:'tag',foreground:'569CD6'},{token:'string',foreground:'CE9178'},
        {token:'comment',foreground:'6A9955'},{token:'number',foreground:'B5CEA8'},{token:'attribute.name',foreground:'9CDCFE'}
      ],colors:{'editor.background':'#182924','editor.foreground':'#E0EBE4'}
    });
    host.hidden = false;
    editor = monaco.editor.create(host, {
      model:null, theme:'toolbox-dark', ariaLabel:'Source code', automaticLayout:true,
      fontFamily:'"Cascadia Code", Consolas, monospace',fontSize:14,
      minimap:{enabled:!matchMedia('(max-width: 640px)').matches},
      scrollBeyondLastLine:false,tabSize:2
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => form.requestSubmit());
    editor.onDidChangeCursorPosition(setPosition);
    activate(active);
  }).catch(() => {
    if (!disposed) announce('The enhanced editor did not load. File editing, preview and downloads are still available.');
  });

  const saveBeforeLeaving = () => { if (saveTimer) persist(); };
  window.addEventListener('pagehide', saveBeforeLeaving);
  return () => {
    window.removeEventListener('pagehide', saveBeforeLeaving);
    if (saveTimer && changed) persist();
    disposed = true;
    disposePreview();
    editor?.dispose();
    for (const {model} of models.values()) model.dispose();
  };
}
