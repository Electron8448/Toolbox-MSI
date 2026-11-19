import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { delimiter, join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
async function run(command, args, env = process.env) {
  const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
  const [code] = await once(child, 'exit');
  if (code !== 0) throw new Error(command + ' failed with exit code ' + code);
}

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('Build this MSI on Windows x64 with Node.js 22.16 or newer.');
}
await run('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-File',join(root,'scripts','setup-wix.ps1')]);
const wix = join(root,'.build-tools','wix-3.14.1');
const env = {...process.env, PATH: wix + delimiter + process.env.PATH};
const forge = join(root,'node_modules','@electron-forge','cli','dist','electron-forge.js');
await run(process.execPath, [forge,'make','--platform=win32','--arch=x64'], env);
