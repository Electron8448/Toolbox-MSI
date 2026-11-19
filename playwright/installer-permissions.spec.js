import { win32 } from 'node:path';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const config = require('../forge.config.cjs');

test('MSI configuration installs with limited privileges in the current user profile', async () => {
  const creator = {
    wixTemplate:await readFile(new URL('../node_modules/electron-wix-msi/static/wix.xml',import.meta.url),'utf8'),
    lightSwitches:[]
  };
  config.makers[0].config.beforeCreate(creator);
  expect(creator.defaultInstallMode).toBe('perUser');
  expect(creator.wixTemplate).toContain('InstallScope="perUser" InstallPrivileges="limited"');
  expect(creator.wixTemplate).toContain('<Directory Id="LocalAppDataFolder"><Directory Id="ToolboxProgramsFolder" Name="Programs">');
  expect(creator.wixTemplate).not.toContain('<Directory Id="{{ProgramFilesFolder}}">');
  expect(creator.wixTemplate).not.toContain('Root="HKMU"');
  expect(config.packagerConfig.win32metadata['requested-execution-level']).toBe('asInvoker');
});

test('updater installs and restarts from Local AppData without requesting elevation', async () => {
  const helper=await readFile(new URL('../electron/install-update.ps1',import.meta.url),'utf8');
  expect(helper).toContain("[Environment]::GetFolderPath('LocalApplicationData')");
  expect(helper).toContain(win32.join('Programs', 'Toolbox'));
  expect(helper).toContain(' + $installRoot + ');
  expect(helper).toContain('$restartExecutable = if ($success) { $updatedExecutable } else { $request.executable }');
  expect(helper).not.toMatch(/-Verb\s+RunAs/i);
});
