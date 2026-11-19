const path = require('node:path');
const { rename, readFile, writeFile } = require('node:fs/promises');
const { createHash } = require('node:crypto');

module.exports = {
  packagerConfig: {
    name: 'Toolbox',
    executableName: 'Toolbox',
    appBundleId: 'io.github.electron8448.toolbox',
    appCopyright: 'Toolbox contributors',
    asar: true,
    download: {cacheRoot: path.join(__dirname, '.build-tools', 'electron-cache')},
    icon: path.join(__dirname, 'electron', 'toolbox.ico'),
    ignore: [
      /^\/(?:\.git|\.github|\.npm-cache|\.build-tools|docs|dist|out|playwright|test-results|playwright-report)(?:\/|$)/,
      /^\/(?:playwright\.config\.js|forge\.config\.cjs|GITHUB-PAGES\.md|debug\.log)$/,
      /^\/scripts(?:\/|$)/
    ]
  },
  makers: [{
    name: '@electron-forge/maker-wix',
    config: {
      name: 'Toolbox',
      shortName: 'Toolbox',
      exe: 'Toolbox.exe',
      manufacturer: 'Toolbox',
      appUserModelId: 'io.github.electron8448.toolbox',
      upgradeCode: '732CCA6C-39AD-4A51-BEE0-5F6207D9877D',
      programFilesFolderName: 'Toolbox',
      shortcutFolderName: 'Toolbox',
      language: 1033,
      icon: path.join(__dirname, 'electron', 'toolbox.ico'),
      ui: {chooseDirectory: true},
      beforeCreate(creator) {
        creator.defaultInstallMode = 'perUser';
        if (process.env.TOOLBOX_SKIP_MSI_VALIDATION === '1') {
          creator.lightSwitches.push('-sval');
          console.warn('WiX ICE validation disabled for this build by TOOLBOX_SKIP_MSI_VALIDATION.');
        }
        creator.shortcutName = 'Toolbox';
        creator.wixTemplate = creator.wixTemplate.replaceAll(/ \(Machine(?: - MSI)?\)| \(User(?: - MSI)?\)/g, '');
      }
    }
  }],
  hooks: {
    async postMake(config, results) {
      for (const result of results) {
        for (const [index, artifact] of result.artifacts.entries()) {
          if (!artifact.endsWith('.msi')) continue;
          const target = path.join(path.dirname(artifact), 'Toolbox-' + require('./package.json').version + '.msi');
          if (target !== artifact) await rename(artifact, target);
          result.artifacts[index] = target;
          const digest = createHash('sha256').update(await readFile(target)).digest('hex');
          const checksum = target + '.sha256';
          await writeFile(checksum, digest + '  ' + path.basename(target) + '\n');
          result.artifacts.push(checksum);
        }
      }
    }
  }
};
