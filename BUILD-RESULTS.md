# Toolbox Desktop build results

Verified on 19 November 2026 in the managed Windows build environment.

- Installed dependencies into this project and locked Electron 45.4.1, Electron Forge 8.0.1 and its WiX maker 8.0.1.
- Downloaded WiX 3.14.1 locally and verified the pinned archive SHA-256.
- The copied web application passed 201 existing Playwright tests. Five previously pending editor acceptance tests remain opt-in.
- Both additional desktop navigation and content-policy tests passed in Chromium, including Monaco and scripted previews inside isolated frames.
- Electron Forge packaged the application, including its runtime and source assets.
- WiX compiled a genuine MSI with ICE validation disabled using TOOLBOX_SKIP_MSI_VALIDATION=1. The default build retains validation.
- Windows Installer COM opened the MSI database and verified product Toolbox, version 1.0.0.0, per-user mode and upgrade identity 732CCA6C-39AD-4A51-BEE0-5F6207D9877D.
- A silent install attempt failed with Windows Installer error 1601. The log reports access denied when connecting to the installer service. Installation, upgrade, installed launch and uninstallation remain unverified.
- Native Electron launch failed before the window opened. Electron reported that the managed AppContainer environment prevents sandboxed children reading the runtime directory. The desktop smoke-test command is provided for use outside that environment.
- The original Toolbox source, assets and documentation match the SHA-256 inventory captured before this work.
- Added eight updater tests covering release selection, downloads and checksums, interrupted downloads, concurrent checks, postponement, the installer handoff, offline behaviour and restart error feedback. All eight passed with network and process mocks.
- A live check of the configured public repository returned the no-published-release message.
- The release workflow and version history are prepared locally. No commits, tags or releases were pushed by this task.
- Updating a live installed app and the GitHub Actions release workflow remain unverified. The repository currently has no published release, and this environment restricts native installation and Electron startup.
- This build is unsigned.

The runnable package is at out/Toolbox-win32-x64/Toolbox.exe.
The updater-enabled installer is at out/make/wix/x64/Toolbox-1.1.1.msi.
Its release checksum is at out/make/wix/x64/Toolbox-1.1.1.msi.sha256.
The earlier installer attempt returned Windows Installer error 1601. Playwright may clear test-results/ when running later tests.

Run npm run test:desktop on a normal Windows development machine. Run node scripts/test-desktop.mjs out/Toolbox-win32-x64/Toolbox.exe to test the packaged executable.

Version 1.1.1 explicitly requests limited MSI privileges, stores files under LocalAppDataFolder/Programs/Toolbox and uses current-user registry entries. Updater installations target that same location. Native installation remains unverified because the managed environment blocks the Windows Installer service.
