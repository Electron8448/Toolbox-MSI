import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import updaterModule from '../electron/updater.cjs';

const {createUpdater, compareVersions, resolveRelease, downloadUpdate, checksumValue} = updaterModule;
const content = Buffer.from('Windows MSI fixture bytes for update verification');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function latest(version = '1.2.0') {
  const filename = 'Toolbox-' + version + '.msi';
  return {
    tag_name:'v' + version, draft:false, prerelease:false,
    assets:[filename,filename+'.sha256'].map(name => ({
      name, size:name.endsWith('.sha256') ? 100 : content.length,
      browser_download_url:'https://github.com/Electron8448/Toolbox-MSI/releases/download/v' + version + '/' + name
    }))
  };
}

function fakeDownload(bytes = content, digest = hash(content)) {
  const calls = [];
  const fetcher = async url => {
    calls.push(url);
    if (url.endsWith('.sha256')) return new Response(digest+'  Toolbox-1.2.0.msi\n');
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.subarray(0, 7));
        controller.enqueue(bytes.subarray(7));
        controller.close();
      }
    }));
  };
  return {fetcher, calls};
}

function harness(root, {response = 1, status = 200, release = latest(), packaged = true, error} = {}) {
  const messages = [];
  const network = fakeDownload();
  let quits = 0;
  const children = [];
  const app = {isPackaged:packaged,getPath:()=>root,getVersion:()=> '1.1.0',quit:()=>{quits++;}};
  const fetcher = async (url, options) => {
    if (error) throw new Error(error);
    if (url.includes('api.github.com')) {
      expect(options.headers['User-Agent']).toBe('Toolbox/1.1.0');
      return new Response(JSON.stringify(release),{status});
    }
    return network.fetcher(url);
  };
  const dialog = {showMessageBox:async options => {messages.push(options);return {response};}};
  const spawnProcess = (command, args, options) => {
    const child = new EventEmitter();
    child.unref = () => {};
    children.push({command,args,options});
    process.nextTick(()=>child.emit('spawn'));
    return child;
  };
  return {
    instance:createUpdater({app,dialog,fetcher,spawnProcess,executable:'C:\\Toolbox\\Toolbox.exe'}),
    messages,children,network,quits:()=>quits
  };
}

test('release version ordering rejects downgrades, previews and invalid MSI versions', () => {
  expect(compareVersions('1.10.0','1.9.99')).toBe(1);
  expect(compareVersions('1.0.0','1.0.0')).toBe(0);
  expect(compareVersions('1.0.0','2.0.0')).toBe(-1);
  expect(resolveRelease(latest('1.1.0'),'1.1.0')).toBeNull();
  expect(resolveRelease(latest('1.0.0'),'1.1.0')).toBeNull();
  expect(resolveRelease({...latest(),draft:true},'1.1.0')).toBeNull();
  expect(resolveRelease({...latest(),prerelease:true},'1.1.0')).toBeNull();
  for (const version of ['1.2.0-beta.1','01.2.0','1.2','256.0.0','1.0.65536','../../bad']) {
    expect(()=>resolveRelease(latest(version),'1.1.0')).toThrow();
  }
});

test('updates require MSI and checksum assets from the exact repository', () => {
  const release = latest();
  expect(resolveRelease(release,'1.1.0').version).toBe('1.2.0');
  expect(()=>resolveRelease({...release,assets:[]},'1.1.0')).toThrow(/missing/);
  const altered = latest();
  altered.assets[0].browser_download_url = 'https://example.com/Toolbox-1.2.0.msi';
  expect(()=>resolveRelease(altered,'1.1.0')).toThrow(/repository/);
  const oversized = latest();
  oversized.assets[1].size = 5000;
  expect(()=>resolveRelease(oversized,'1.1.0')).toThrow(/size/);
  expect(checksumValue(hash(content)+'  Toolbox-1.2.0.msi\n','Toolbox-1.2.0.msi')).toBe(hash(content));
  expect(()=>checksumValue(hash(content)+'  other.msi','Toolbox-1.2.0.msi')).toThrow();
});

test('downloads stream every chunk, verify SHA-256 and reuse verified cached files', async ({}, testInfo) => {
  const root=testInfo.outputPath('updates');
  const network=fakeDownload();
  const release=resolveRelease(latest(),'1.1.0');
  const path=await downloadUpdate(release,root,network.fetcher);
  expect(await readFile(path)).toEqual(content);
  expect((await readdir(join(root,'1.2.0'))).filter(file=>file.includes('.partial'))).toEqual([]);
  expect(await downloadUpdate(release,root,network.fetcher)).toBe(path);
  expect(network.calls.filter(url=>url.endsWith('.msi'))).toHaveLength(1);
});

test('corrupt and incomplete downloads are removed without damaging saved project data', async ({}, testInfo) => {
  const root=testInfo.outputPath('updates');
  await mkdir(root,{recursive:true});
  await writeFile(join(root,'project.txt'),'Keep my project');
  const release=resolveRelease(latest(),'1.1.0');
  const corrupt=fakeDownload(Buffer.alloc(content.length), hash(content));
  await expect(downloadUpdate(release,root,corrupt.fetcher)).rejects.toThrow(/checksum/);
  const incomplete=fakeDownload(content.subarray(0,8));
  await expect(downloadUpdate(release,root,incomplete.fetcher)).rejects.toThrow(/complete/);
  expect(await readdir(join(root,'1.2.0'))).toEqual([]);
  expect(await readFile(join(root,'project.txt'),'utf8')).toBe('Keep my project');
});

test('startup downloads an update, lets users postpone, and retries manually', async ({}, testInfo) => {
  const h=harness(testInfo.outputPath('profile'));
  try {
    await Promise.all([h.instance.check(),h.instance.check()]);
    expect(h.messages).toHaveLength(1);
    expect(h.messages[0].buttons).toEqual(['Restart and install','Later']);
    expect(h.quits()).toBe(0);
    await h.instance.check();
    expect(h.messages).toHaveLength(1);
    await h.instance.check(true);
    expect(h.messages).toHaveLength(2);
    expect(h.network.calls.filter(url=>url.endsWith('.msi'))).toHaveLength(1);
  } finally {h.instance.stop();}
});

test('accepting an update starts the detached MSI helper before closing Toolbox', async ({}, testInfo) => {
  const root=testInfo.outputPath('profile');
  const h=harness(root,{response:0});
  try {
    await h.instance.check(true);
    expect(h.children).toHaveLength(1);
    expect(h.children[0].command).toBe('powershell.exe');
    expect(h.children[0].options).toMatchObject({detached:true,windowsHide:true,stdio:'ignore'});
    expect(h.quits()).toBe(1);
    const request=JSON.parse(await readFile(join(root,'updates','1.2.0','install-request.json'),'utf8'));
    expect(request.version).toBe('1.2.0');
    expect(request.installer).toBe(join(root,'updates','1.2.0','Toolbox-1.2.0.msi'));
    expect(request.executable).toBe('C:\\Toolbox\\Toolbox.exe');
    expect(await readFile(join(root,'updates','1.2.0','install-update.ps1'),'utf8')).toContain('732CCA6C-39AD-4A51-BEE0-5F6207D9877D');
  } finally {h.instance.stop();}
});

test('no releases, no newer release, offline checks and development mode show clear messages', async ({}, testInfo) => {
  for (const [index, options] of [
    {status:404}, {release:latest('1.1.0')}, {error:'Offline'}, {packaged:false}
  ].entries()) {
    const h=harness(testInfo.outputPath('profile'+index),options);
    try {
      await h.instance.check(true);
      expect(h.messages).toHaveLength(1);
      expect(h.messages[0].message).toMatch(/No Toolbox|1.1.0|Offline|installed Windows/);
      expect(h.quits()).toBe(0);
    } finally {h.instance.stop();}
  }
});

test('failed installer feedback survives restart including Windows PowerShell UTF-8 BOMs', async ({}, testInfo) => {
  const root=testInfo.outputPath('profile');
  await mkdir(join(root,'updates'),{recursive:true});
  await writeFile(join(root,'updates','install-result.json'),'\uFEFF'+JSON.stringify({
    success:false,message:'Windows Installer returned error 1601.',log:'install.log'
  }));
  const h=harness(root);
  try {
    await h.instance.start();
    expect(h.messages[0].message).toContain('1601');
    expect(h.messages[0].detail).toContain('install.log');
  } finally {h.instance.stop();}
});
