# Publishing Toolbox on GitHub Pages

## Deploy from a branch

1. From the Toolbox project folder, run `npm run build:pages -- --docs`. This creates a ready-to-publish `docs/` folder.
2. Commit and push the source changes and generated `docs/` folder to `main`.
3. In **Settings → Pages → Build and deployment**, set **Source** to **Deploy from a branch**.
4. Under **Branch**, select **main** and **/docs**, then click **Save**.
5. When it finishes publishing, open the URL shown under **Settings → Pages**. For this repository's default domain, it is `https://electron8448.github.io/Toolbox/`.

For later updates, rebuild `docs/`, then commit and push it with the source changes. GitHub publishes from the branch automatically. The `/docs` publishing folder does not appear in the public URL. If the public URL shows the repository README, verify that the branch folder is set to `/docs` and that `docs/index.html` is on the published branch. Toolbox links to the README from its homepage.

The build defaults to the `/Toolbox` project path. Set `PAGES_BASE_PATH` for a different repository path, or to `/` for a root site or a custom domain serving Toolbox at the root.

## Optional custom GitHub Actions workflow

Select **GitHub Actions** as the Pages source, then run **Deploy Toolbox to GitHub Pages** from the Actions tab. The workflow detects the Pages base path and builds into `dist/`.

The Code Editor runs in the browser on Pages. It can also download a standalone `index.html` for a separate site. The Toolbox Website Link Checker requires the Node server.
