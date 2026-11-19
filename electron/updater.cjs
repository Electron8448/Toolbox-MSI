const { createHash, randomUUID } = require('node:crypto');
const { createReadStream } = require('node:fs');
const { mkdir, open, readFile, rename, rm, writeFile } = require('node:fs/promises');
const { join, dirname } = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

const repository = 'Electron8448/Toolbox-MSI';
const releaseAPI = 'https://api.github.com/repos/' + repository + '/releases/latest';
const maximumBytes = 512 * 1024 * 1024;

function versionParts(version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw new Error('The release must use a stable major.minor.patch version.');
  const parts = version.split('.').map(Number);
  if (parts.some((part, index) => part > (index === 2 ? 65535 : 255))) throw new Error('The version exceeds Windows MSI version limits.');
  return parts;
}

function compareVersions(first, second) {
  const a = versionParts(first);
  const b = versionParts(second);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return Math.sign(a[index] - b[index]);
  }
  return 0;
}

function releaseAsset(release, name) {
  const matches = release.assets?.filter(asset => asset.name === name);
  if (matches?.length !== 1) throw new Error('The GitHub release is missing ' + name + '.');
  const asset = matches[0];
  const url = new URL(asset.browser_download_url);
  const expected = 'https://github.com/' + repository + '/releases/download/' +
    encodeURIComponent(release.tag_name) + '/' + encodeURIComponent(name);
  if (url.href !== expected) throw new Error('The release asset does not belong to the Toolbox-MSI repository.');
  if (!Number.isSafeInteger(asset.size) || asset.size < 1 || asset.size > (name.endsWith('.sha256') ? 4096 : maximumBytes)) throw new Error('The release asset size is invalid.');
  return asset;
}

function resolveRelease(release, currentVersion) {
  if (!release || typeof release !== 'object') throw new Error('GitHub returned an invalid release.');
  if (release.draft || release.prerelease) return null;
  const version = String(release.tag_name ?? '').replace(/^v/, '');
  if (compareVersions(version, currentVersion) <= 0) return null;
  const filename = 'Toolbox-' + version + '.msi';
  return {
    version, filename,
    installer: releaseAsset(release, filename),
    checksum: releaseAsset(release, filename + '.sha256')
  };
}

function checksumValue(text, filename) {
  const match = /^([a-f0-9]{64})(?:[ \t]+\*?([^\r\n]+))?[ \t]*\r?\n?$/i.exec(text);
  if (!match || match[2] && match[2] !== filename) throw new Error('The release checksum file is invalid.');
  return match[1].toLowerCase();
}

async function hashFile(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}

function verifyDownloadURL(response) {
  if (!response.url) return;
  const url = new URL(response.url);
  if (url.protocol !== 'https:' || !['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(url.hostname)) {
    throw new Error('GitHub redirected the download to an unexpected location.');
  }
}

async function downloadUpdate(release, root, fetcher, signal) {
  const checksum = await fetcher(release.checksum.browser_download_url, {signal});
  if (!checksum.ok) throw new Error('Could not download the release checksum.');
  verifyDownloadURL(checksum);
  if (Number(checksum.headers.get('content-length')) > 4096) throw new Error('The checksum file is too large.');
  const checksumChunks = [];
  let checksumSize = 0;
  for await (const bytes of checksum.body) {
    checksumSize += bytes.length;
    if (checksumSize > 4096) throw new Error('The checksum file is too large.');
    checksumChunks.push(Buffer.from(bytes));
  }
  const expectedHash = checksumValue(Buffer.concat(checksumChunks).toString('utf8'), release.filename);
  const directory = join(root, release.version);
  await mkdir(directory, {recursive:true});
  const destination = join(directory, release.filename);
  try {
    if (await hashFile(destination) === expectedHash) return destination;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const partial = destination + '.' + randomUUID() + '.partial';
  let file;
  try {
    const response = await fetcher(release.installer.browser_download_url, {signal});
    if (!response.ok || !response.body) throw new Error('Could not download the update (HTTP ' + response.status + ').');
    verifyDownloadURL(response);
    file = await open(partial, 'wx');
    const hash = createHash('sha256');
    let size = 0;
    for await (const bytes of response.body) {
      const chunk = Buffer.from(bytes);
      size += chunk.length;
      if (size > maximumBytes || size > release.installer.size) throw new Error('The update download is larger than expected.');
      hash.update(chunk);
      await file.writeFile(chunk);
    }
    if (size !== release.installer.size) throw new Error('The update download did not complete.');
    if (hash.digest('hex') !== expectedHash) throw new Error('The update checksum does not match. Nothing was installed.');
    await file.close();
    file = undefined;
    await rename(partial, destination);
    return destination;
  } finally {
    await file?.close();
    await rm(partial, {force:true});
  }
}

function createUpdater({app, dialog, fetcher = globalThis.fetch, spawnProcess = spawn, executable = process.execPath}) {
  const updateRoot = join(app.getPath('userData'), 'updates');
  let active;
  let lastPrompt;
  let timeout;
  let interval;
  let controller;
  let disposed = false;

  async function notify(title, message) {
    await dialog.showMessageBox({type:'info', title, message, buttons:['OK']});
  }

  async function install(installer, version) {
    const directory = dirname(installer);
    const helper = join(directory, 'install-update.ps1');
    const request = join(directory, 'install-request.json');
    await writeFile(helper, await readFile(join(__dirname, 'install-update.ps1')));
    await writeFile(request, JSON.stringify({
      parentProcess:process.pid, installer, version, executable,
      log:join(directory,'install.log'), result:join(updateRoot,'install-result.json')
    }));
    const child = spawnProcess('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helper, '-RequestPath', request
    ], {detached:true, windowsHide:true, stdio:'ignore'});
    await once(child, 'spawn');
    child.unref();
    app.quit();
  }

  async function check(manual = false) {
    if (disposed) return;
    if (active) return active;
    if (!app.isPackaged || process.platform !== 'win32') {
      if (manual) await notify('Toolbox updates', 'Automatic updates are available in the installed Windows application.');
      return;
    }
    active = (async () => {
      controller = new AbortController();
      const downloadTimeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
      try {
        const response = await fetcher(releaseAPI, {
          headers:{Accept:'application/vnd.github+json', 'User-Agent':'Toolbox/' + app.getVersion(), 'X-GitHub-Api-Version':'2022-11-28'},
          signal:AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])
        });
        if (response.status === 404) {
          if (manual) await notify('Toolbox updates', 'No Toolbox release has been published on GitHub yet.');
          return;
        }
        if (!response.ok) throw new Error('GitHub update check failed (HTTP ' + response.status + '). Try again later.');
        const release = resolveRelease(await response.json(), app.getVersion());
        if (!release) {
          if (manual) await notify('Toolbox is up to date', 'You are using Toolbox ' + app.getVersion() + '.');
          return;
        }
        if (!manual && lastPrompt === release.version) return;
        const installer = await downloadUpdate(release, updateRoot, fetcher, controller.signal);
        if (disposed) return;
        lastPrompt = release.version;
        const decision = await dialog.showMessageBox({
          type:'info', title:'Toolbox update ready',
          message:'Toolbox ' + release.version + ' is ready to install.',
          detail:'Save and download any files you are working on. Toolbox will close, run the MSI upgrade, and reopen. Your saved drafts and preferences are kept.',
          buttons:['Restart and install', 'Later'], defaultId:1, cancelId:1
        });
        if (decision.response === 0 && !disposed) await install(installer, release.version);
      } catch (error) {
        if (disposed) return;
        console.error('Toolbox updater:', error.message);
        if (manual) await dialog.showMessageBox({type:'error', title:'Could not update Toolbox', message:error.message, buttons:['OK']});
      } finally {
        clearTimeout(downloadTimeout);
        controller = undefined;
      }
    })();
    try { return await active; }
    finally { active = undefined; }
  }

  async function start() {
    if (!app.isPackaged) return;
    try {
      const resultPath = join(updateRoot,'install-result.json');
      let result;
      try { result = JSON.parse((await readFile(resultPath,'utf8')).replace(/^\uFEFF/, '')); }
      catch (error) { if (error.code !== 'ENOENT') console.error('Could not read update result:', error.message); }
      if (result) {
        await rm(resultPath,{force:true});
        if (!result.success) await dialog.showMessageBox({
          type:'error', title:'Toolbox update needs attention', message:result.message,
          detail:'The installer log is in ' + result.log, buttons:['OK']
        });
      }
    } catch (error) { console.error('Toolbox updater:', error.message); }
    if (disposed) return;
    timeout = setTimeout(() => void check(), 30000);
    interval = setInterval(() => void check(), 6 * 60 * 60 * 1000);
    timeout.unref();
    interval.unref();
  }

  function stop() {
    disposed = true;
    clearTimeout(timeout);
    clearInterval(interval);
    controller?.abort();
  }
  return {check, start, stop};
}

module.exports = {createUpdater, resolveRelease, compareVersions, checksumValue, downloadUpdate};
