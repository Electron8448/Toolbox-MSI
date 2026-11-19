<h1 align="center">Toolbox</h1>

<p align="center">
  Browser tools for maths, writing, coding, design, and everyday work.
</p>

<p align="center">
  <a href="https://electron8448.github.io/Toolbox/"><strong>Open Toolbox</strong></a>
  · <a href="#run-playwright-tests">Run tests</a>
  · <a href="GITHUB-PAGES.md">Publish to GitHub Pages</a>
</p>

<p align="center"><strong>13 categories</strong> · <strong>56 subcategories</strong> · <strong>163 tools</strong></p>

> To publish the website on GitHub Pages, follow the [branch deployment setup](GITHUB-PAGES.md).


## Automatic updates and version history

Toolbox Desktop 1.1.0 checks [Electron8448/Toolbox-MSI releases](https://github.com/Electron8448/Toolbox-MSI/releases) automatically and downloads newer MSI installers after verifying their checksums. It asks before restarting to install. Use **Help → Check for updates** for a manual check.

Read the [versions README](versions/README.md) for release notes, update behaviour and the exact steps for publishing each release. The repository must have a published stable release containing the generated MSI and its .sha256 file. The included **Publish Windows MSI** workflow publishes those assets when a matching version tag is pushed. Install the 1.1.0 MSI manually to add the updater to older installations.

## Toolbox Desktop for Windows

This project is the desktop copy of Toolbox. Electron includes its own Chromium and Node.js runtime, starts the existing backend on an available loopback port, and displays Toolbox in a 1400 × 900 window.

### Development prerequisites

Use Windows 10 or 11 x64, Node.js 22.16 or newer (Node.js 24 recommended), and npm. An internet connection is needed for the initial dependency, Electron runtime and WiX downloads. End users only need Windows to install the resulting MSI.

From this project directory, run:

```powershell
npm install
npm run start:desktop
```

The install step downloads Electron. The web version runs with `npm start` or `npm run start:web` and defaults to port 3000.

### Generate the Windows MSI

```powershell
npm run make:msi
```

The command downloads the pinned portable WiX Toolset 3.14.1 into `.build-tools/wix-3.14.1`, verifies the archive's SHA-256 checksum, packages the app with Electron Forge, and creates:

```text
out/make/wix/x64/Toolbox-1.1.0.msi
```

WiX 3 uses the Windows .NET Framework runtime. Install or enable .NET Framework 4.8 if candle.exe or light.exe reports a runtime error. The build uses WiX 3.14.1 because Forge's WiX maker requires WiX 3. The toolset stays inside this project. Run `npm run setup:wix` to download it separately.

For offline builds, keep the downloaded WiX tools and Electron cache in `.build-tools/`. `npm run package` creates the unpacked application at `out/Toolbox-win32-x64/Toolbox.exe`.

### Install, upgrade and uninstall

Open `Toolbox-1.1.0.msi` and follow the installer. The default is a per-user installation with a Start menu shortcut. Launch Toolbox from the Start menu.

For upgrades, increase `version` in `package.json`, update the lockfile with `npm install --package-lock-only`, rebuild, and run the newer MSI. Keep the application ID and `upgradeCode` in `forge.config.cjs` unchanged. Windows Installer uses that identity to replace the earlier version and rejects downgrades.

Uninstall through Windows Settings → Apps → Installed apps → Toolbox → Uninstall. User drafts and preferences live under `%APPDATA%/Toolbox/` in the persistent `toolbox` browser session. The internal address `toolbox://app/` stays stable across launches, so a different backend port does not reset browser storage. A browser session and the desktop app have separate saved data.

The app opens external HTTP and HTTPS links in your default browser. The app window uses context isolation, a renderer sandbox and disabled Node integration. It closes its backend when it exits.

### Desktop validation

```powershell
npm test
npm run test:desktop
node scripts/test-desktop.mjs out/Toolbox-win32-x64/Toolbox.exe
```

The desktop check uses a separate test profile in `test-results/`. It checks launch, renderer isolation, navigation, a calculation, backend access, the Monaco editor, scripted previews and restart persistence.

### Build verification in this workspace

The Windows MSI was compiled with WiX ICE validation disabled because the managed execution environment could not access the Windows Installer service. On an ordinary Windows development machine, the default build runs validation. For the same restricted build environment, use:

```powershell
$env:TOOLBOX_SKIP_MSI_VALIDATION = '1'
npm run make:msi
Remove-Item Env:TOOLBOX_SKIP_MSI_VALIDATION
```

This switch only disables the optional WiX validation pass. It does not verify that the installer can install successfully. See [BUILD-RESULTS.md](BUILD-RESULTS.md) for the actual test results and outstanding installation and desktop launch checks.

### Desktop troubleshooting

- If the first download is interrupted, rerun `npm install`. Electron and WiX caches are kept under `.build-tools/`.
- If checksum verification fails, delete `.build-tools/wix314-binaries.zip` and rerun `npm run setup:wix`.
- If Electron reports an AppContainer install-directory ACL error, test from a normal Windows terminal outside the managed agent environment. Keep sandboxing enabled for the app.
- If an older development window remains open, close it before testing the packaged build. Toolbox uses a single application instance for each user-data directory.
- For MSI diagnostics, run `msiexec /i "out/make/wix/x64/Toolbox-1.1.0.msi" /L*v "test-results/install.log"`.
- A signing certificate is not configured. Windows may show an unknown-publisher prompt for this local build. Configure Authenticode signing before distributing a signed release.

## What you can do

Browse the category cards on the homepage or open the collapsible sidebar to reach a subcategory. Global search matches the names of categories, subcategories, and tools. Each tool has its own page, and Toolbox remembers your recently opened tools in the current browser.

- **Maths and calculations** cover fractions, algebra, geometry, percentages, dates, and common unit conversions.
- **Writing and data tools** help with spelling patterns, formatting, text analysis, and CSV or JSON conversion. Grammar and writing helpers use local rules and extractive summaries.
- **Developer and design tools** include formatters, encoders, colour previews, and a Monaco-based editor for HTML, CSS and JavaScript with autocomplete, formatting, local drafts and an isolated preview.
- **Image tools** resize, crop, convert, and inspect local files in the browser. Planning tools keep saved entries in the current browser.
- **Responsive navigation** supports desktop and mobile layouts. The Website Link Checker uses the Node server for outbound requests.

## Code Editor

Open **Developer Tools → Utilities → Code Editor**. The starter project includes an HTML page, a stylesheet and a JavaScript file.

- Use **New file**, **Rename** and **File type** to organise source files. Changing the type updates the file extension and syntax highlighting. Text files open with Monaco syntax colours and editing commands.
- Use **Upload files** to add files, or **Open folder** to reopen a project with its folder structure and assets.
- Use **Download file** to save the active file or **Download project** to save a ZIP. To resume on another device, extract the ZIP and open that folder in the editor.
- Use **Run preview** or **Ctrl+Enter** (**Cmd+Enter** on macOS) to preview an HTML page in an isolated frame. **Download HTML** saves the selected preview as a standalone page.
- Toolbox saves draft files in the current browser.

This README is available from **Read the README** on the Toolbox homepage.

## Available tools

Expand a category to browse its subcategories and tools.

<details>
<summary><strong>Maths</strong></summary>

- **Fractions**
  - Fraction Simplifier
  - Fraction Calculator
  - Fraction to Decimal Converter
  - Fraction to Percentage Converter
- **Percentages**
  - Percentage Calculator
  - Percentage Increase and Decrease Calculator
  - Percentage Difference Calculator
- **Algebra**
  - Graphing Calculator
  - Beginner Graph Maker
  - Equation Solver
  - Expression Simplifier
  - Expanding Brackets Calculator
  - Quadratic Equation Solver
- **Geometry**
  - Area Calculator
  - Perimeter Calculator
  - Volume Calculator
  - Pythagoras Calculator

</details>

<details>
<summary><strong>Writing</strong></summary>

- **Grammar & Spelling**
  - Grammar Checker
  - Spell Checker
  - Punctuation Checker
  - Capitalisation Fixer
- **Text Tools**
  - Word Counter
  - Character Counter
  - Uppercase / Lowercase Converter
  - Remove Extra Spaces
  - Find and Replace Text
- **Writing Helpers**
  - Sentence Rewriter
  - Text Summariser
  - Tone Changer
  - Paragraph Improver
- **Formatting**
  - Remove Line Breaks
  - Sort Lines Alphabetically
  - Duplicate Line Remover
  - Text to Bullet Points

</details>

<details>
<summary><strong>Converters</strong></summary>

- **Length**
  - Metres to Feet Converter
  - Kilometres to Miles Converter
  - Inches to Centimetres Converter
- **Weight**
  - Kilograms to Pounds Converter
  - Grams to Ounces Converter
  - Weight Converter
- **Temperature**
  - Celsius to Fahrenheit Converter
  - Fahrenheit to Celsius Converter
- **Time**
  - Seconds to Minutes Converter
  - Hours to Days Converter
  - Time Zone Converter
- **Data**
  - MB to GB Converter
  - KB to MB Converter
  - GB to TB Converter
- **Speed**
  - MPH to KM/H Converter
  - KM/H to MPH Converter

</details>

<details>
<summary><strong>Calculators</strong></summary>

- **Everyday**
  - Standard Calculator
  - Scientific Calculator
  - Percentage Calculator
- **Finance**
  - VAT Calculator
  - Discount Calculator
  - Profit Margin Calculator
- **Time**
  - Date Difference Calculator
  - Days Between Dates Calculator
  - Age Calculator
- **Other**
  - Average Calculator
  - Ratio Calculator
  - Random Number Generator

</details>

<details>
<summary><strong>Date &amp; Time</strong></summary>

- **Date Tools**
  - Date Calculator
  - Date Difference Calculator
  - Add Days to Date Calculator
- **Time Tools**
  - World Clock
  - Time Zone Converter
  - Time Duration Calculator
- **Calendar**
  - Calendar Generator
  - Week Number Calculator
  - Leap Year Checker
- **Countdowns**
  - Countdown Timer
  - Stopwatch
  - Event Countdown

</details>

<details>
<summary><strong>Colour &amp; Design</strong></summary>

- **Colour Tools**
  - Colour Picker
  - HEX to RGB Converter
  - RGB to HEX Converter
- **Palettes**
  - Colour Palette Generator
  - Complementary Colour Finder
  - Gradient Generator
- **Design Helpers**
  - CSS Gradient Generator
  - Box Shadow Generator
  - Border Radius Generator
- **Typography**
  - Font Pairing Suggestions
  - Font Size Converter

</details>

<details>
<summary><strong>Developer Tools</strong></summary>

- **JSON**
  - JSON Formatter
  - JSON Validator
  - JSON Minifier
- **HTML**
  - HTML Formatter
  - HTML Entity Converter
- **CSS**
  - CSS Minifier
  - CSS Formatter
- **JavaScript**
  - JavaScript Formatter
  - JavaScript Minifier
- **Encoding**
  - Base64 Encoder/Decoder
  - URL Encoder/Decoder
- **Utilities**
  - Code Editor
  - UUID Generator
  - Hash Generator

</details>

<details>
<summary><strong>Image Tools</strong></summary>

- **Conversion**
  - PNG to JPG Converter
  - JPG to PNG Converter
  - WebP Converter
- **Editing**
  - Image Resizer
  - Image Cropper
  - Image Rotator
- **Optimisation**
  - Image Compressor
  - Image Dimension Checker
- **Other**
  - Colour Extractor
  - Image Metadata Viewer

</details>

<details>
<summary><strong>Text &amp; Data</strong></summary>

- **Text Cleaning**
  - Remove Duplicate Lines
  - Remove Empty Lines
  - Remove Extra Spaces
- **Text Analysis**
  - Reading Time Calculator
  - Sentence Counter
  - Paragraph Counter
- **Data Formatting**
  - CSV Viewer
  - CSV to JSON Converter
  - JSON to CSV Converter
- **Lists**
  - Alphabetical Sorter
  - Random List Picker
  - List Shuffler

</details>

<details>
<summary><strong>Education &amp; Study</strong></summary>

- **Study Helpers**
  - Flashcard Maker
  - Quiz Generator
  - Study Notes Organiser
- **Revision**
  - Revision Timetable Generator
  - Study Session Planner
- **Learning**
  - Roman Numeral Converter
  - Periodic Table Explorer
  - Metric Prefix Converter
- **Reading**
  - Reading Time Calculator
  - Reading Progress Calculator

</details>

<details>
<summary><strong>Random Generators</strong></summary>

- **Numbers**
  - Random Number Generator
  - Number Range Picker
  - Random Number List Generator
- **Words**
  - Random Word Generator
  - Random Letter Generator
- **Decisions**
  - Yes or No Generator
  - Random Choice Picker
  - Decision Wheel
- **Groups**
  - Team Generator
  - Group Splitter
  - Random Name Picker

</details>

<details>
<summary><strong>Productivity</strong></summary>

- **Planning**
  - To-Do List
  - Daily Planner
  - Weekly Planner
- **Organisation**
  - Checklist Maker
  - Simple Notes
  - Task Prioritiser
- **Time Management**
  - Pomodoro Timer
  - Focus Timer
  - Break Reminder
- **Goals**
  - Goal Tracker
  - Habit Tracker

</details>

<details>
<summary><strong>Web &amp; SEO Tools</strong></summary>

- **SEO**
  - Meta Title Preview
  - Meta Description Preview
  - Keyword Counter
- **Website**
  - URL Parser
  - Website Link Checker
  - QR Code Generator
- **Social Media**
  - Hashtag Counter
  - Social Post Character Counter
- **Formatting**
  - HTML Previewer
  - Markdown Previewer

</details>

## Technologies

- **Frontend:** HTML, CSS, and JavaScript ES modules. The UI uses browser APIs and local storage.
- **Server:** Node.js serves the app and runs the Website Link Checker.
- **Bundled libraries:** Monaco for code editing, Prettier for formatting, CSSO and Terser for minification, Marked for Markdown rendering, exifr for image metadata, and QR Code Generator for QR codes.
- **Development:** npm manages the locked Playwright dependency. Playwright Test runs Chromium desktop and emulated mobile checks.

## Project structure

| Path | Purpose |
| --- | --- |
| [src/index.html](src/index.html) | HTML shell, brand, and navigation markup |
| [src/app.js](src/app.js) and [src/routing.js](src/routing.js) | Page navigation, tool search, recent tools, and GitHub Pages paths |
| [src/categories/](src/categories/) | Category catalogue, subcategory definitions, and tool implementations |
| [src/calculator/](src/calculator/) | Reusable maths and expression logic |
| [src/tool-page.js](src/tool-page.js) and [src/tool-results.js](src/tool-results.js) | Shared tool forms, validation, previews, and results |
| [src/styles.css](src/styles.css) | Site styling and responsive layouts |
| [src/vendor/](src/vendor/) | Browser libraries, data, and their licence files |
| [server.js](server.js), [src/server.js](src/server.js), and [src/link-checker.js](src/link-checker.js) | Local server entry point, asset serving, and link checking |
| [scripts/build-pages.js](scripts/build-pages.js) and [docs/](docs/) | Static build script and generated branch deployment files |
| [package.json](package.json) and [package-lock.json](package-lock.json) | npm scripts and locked dependencies |
| [playwright.config.js](playwright.config.js) and [playwright/](playwright/) | Browser test configuration and specs |

## Run Playwright tests

Install Chromium once after installing dependencies:

```bash
npx playwright install chromium
```

| To run | Command |
| --- | --- |
| The full suite | `npm test` or `npx playwright test` |
| With the browser visible | `npx playwright test --headed` |
| With Playwright's interactive UI | `npx playwright test --ui` |
| A specific spec | `npx playwright test playwright/code-editor.spec.js` |
| A test by name | `npx playwright test -g "fraction simplifier"` |
| Only mobile checks | `npm test -- --project=mobile` |

Playwright starts a separate Toolbox server on port **3195**. Terminal output shows results by default. To generate and open the HTML report:

```bash
npx playwright test --reporter=html
npx playwright show-report
```

Failed tests can leave traces in `test-results/`. The HTML report is in `playwright-report/`.

## Development and publishing

- Add a tool to its subcategory definition under [src/categories/](src/categories/). The catalogue feeds both navigation and global search.
- Keep reusable calculation logic in [src/calculator/](src/calculator/) and use the shared tool form and result components where possible.
- Run the relevant Playwright spec when changing a tool, then run the full suite before opening a pull request.
- For branch-based GitHub Pages publishing, run `npm run build:pages -- --docs`, then commit the generated `docs/` changes with the source. Configure Pages to publish from `main` and `/docs`. [Publishing instructions](GITHUB-PAGES.md)

## Troubleshooting

- **Dependencies fail to install:** Run `npm ci` from the project root with Node.js 24 and check that the npm registry is reachable.
- **Playwright cannot find Chromium:** Run `npx playwright install chromium`. On Linux, `npx playwright install --with-deps chromium` can also install the required system libraries.
- **Port 3195 is in use:** Stop the other server. To test against a Toolbox server you deliberately started on 3195, set `PLAYWRIGHT_REUSE_SERVER=1` before running Playwright.
- **A browser test fails:** Run its spec with `--headed` or `--ui` and open the trace from the failed test to inspect the page and actions.
