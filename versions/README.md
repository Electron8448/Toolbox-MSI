# Toolbox Desktop versions

Repository and downloads are available at [Electron8448/Toolbox-MSI](https://github.com/Electron8448/Toolbox-MSI) and [GitHub Releases](https://github.com/Electron8448/Toolbox-MSI/releases).

## 1.1.0

Prepared locally on 19 November 2026. Publication to GitHub is pending.

- Automatically checks the latest stable GitHub release 30 seconds after startup and every six hours.
- Downloads newer Windows MSI installers and verifies SHA-256 checksums.
- Asks before restarting Toolbox to install an update. Choose Later to continue working.
- Adds Help → Check for updates, Version history, and About Toolbox.
- Uses a detached Windows Installer helper so Toolbox exits before its files are replaced.
- Preserves the existing application ID, MSI upgrade identity and user-data directory.
- Records installation errors and shows them when Toolbox next starts.
- Includes an automated GitHub Actions release workflow that builds and uploads the MSI and its checksum.

Install this version manually to introduce automatic updating to earlier installations.

## 1.0.0

Initial local desktop build on 19 November 2026.

- Electron Forge desktop application with an embedded Node backend.
- Windows MSI installer, Start menu shortcut and Toolbox icon.
- Stable desktop origin for saved drafts and preferences.
- Toolbox tools, categories, code editor and backend link checker.

## Publishing the next version

1. Change the stable three-part version in package.json, for example 1.2.0. MSI versions allow major and minor values up to 255, and patch values up to 65535.
2. Add its changes to this file and run npm install --package-lock-only.
3. Run npm test and build with npm run make:msi.
4. Commit and push the source changes to Electron8448/Toolbox-MSI.
5. Create and push the matching tag. For version 1.2.0, run git tag v1.2.0 and git push origin v1.2.0.
6. GitHub Actions runs Publish Windows MSI, tests the application and publishes a GitHub release with both Toolbox-1.2.0.msi and Toolbox-1.2.0.msi.sha256.

To publish the current version, use tag v1.1.0. Enable GitHub Actions for the repository. A release is available to the updater once it is published as a stable release. Drafts and prereleases are ignored. Committing code alone does not publish an update.

To publish manually, run npm run make:msi, create a stable GitHub release with the matching version tag and upload both generated files from out/make/wix/x64/. Keep the asset names exactly as generated.

## Update behaviour

Updates use the public GitHub Releases API and HTTPS downloads from this repository. A GitHub token is not embedded in the app. GitHub API rate limits and offline connections can delay automatic checks. Use Help → Check for updates to retry and view an error message.

The app never installs an older or equal version. Installers must include a matching checksum and the existing Toolbox MSI upgrade identity. Checksums detect incomplete or altered downloads against the release asset. Signing the MSI with an Authenticode certificate is a separate release configuration.

Downloads and installation logs are stored in %APPDATA%/Toolbox/updates/. Saved drafts and preferences stay in the application's existing user-data directory. For an update, Toolbox asks you to finish your work, closes, runs Windows Installer with a progress display, and reopens the application.

Native installation and restart verification remain pending outside the managed execution environment, which blocks the Windows Installer service and native Electron sandbox startup.
