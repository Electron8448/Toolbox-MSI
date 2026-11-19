import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = join(root, '.build-tools', 'temp');
await mkdir(temporary, {recursive:true});
const env = {
  ...process.env, TEMP:temporary, TMP:temporary,
  electron_config_cache:join(root,'.build-tools','electron-cache')
};
const child = spawn(process.execPath, [join(root,'node_modules','electron','install.js')], {env,stdio:'inherit'});
process.exitCode = (await once(child,'exit'))[0];
