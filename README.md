# Table Tennis World Tour — working copy

This repository contains a customizable HTML entry point and local copies of the game's JavaScript files.

## Files

- `index.html` — game page with the ability inventory, bottom-right HUD, cooldowns, and Hyper Charge fire effect.
- `js/all.js` — main game engine copied from the upstream project.
- `js/start.js` — startup framework copied from the upstream project.
- `js/fix.js` — compatibility fixes.
- `.github/workflows/pages.yml` — deploys the site to GitHub Pages on pushes to `main`.

## Asset status

The original engine references image, audio, and other game assets from `thirstygithub/congenial-robot`. Those binary assets have **not** been copied into this repository, because the upstream license/redistribution permission has not been verified. The current page keeps the upstream asset base URL for those resources while loading the JavaScript from this repository.

Before distributing a fully self-contained public copy, verify the original project's license or obtain permission, then migrate the assets and update the asset paths.

## GitHub Pages

The workflow deploys the repository root on every push to `main`. If Pages has not been enabled for this repository yet, open **Settings → Pages** and set the build/deployment source to **GitHub Actions**.

After deployment, the site URL should be:

https://gio-spec-beep.github.io/table-tennis/
