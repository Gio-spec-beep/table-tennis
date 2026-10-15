# Game Hub

A purple-themed game website with a growing collection of games and custom mods.

## Project structure

```
.
├── index.html
├── games/
│   ├── table-tennis/
│   │   ├── index.html
│   │   └── js/
│   │       ├── all.js
│   │       ├── fix.js
│   │       └── start.js
│   └── 8-ball-pool/
│       ├── index.html
│       └── js/
│           ├── famobi-shim.js
│           ├── asset-paths.js
│           └── pool-mods.js
├── .github/workflows/pages.yml
└── README.md
```

## Pool JavaScript

The 8-Ball Pool page's JavaScript is now organized in `games/8-ball-pool/js/`:
- `famobi-shim.js` — compatibility stubs expected by the game.
- `asset-paths.js` — redirects relative game asset requests to the upstream CDN.
- `pool-mods.js` — the custom pool abilities, cue collection, and visual assists.

The Phaser engine and original game assets still load from the upstream CDN.

## Add another game

Create a folder under `games/`, place the game's entry page and related files inside it, then add a card to the game grid in the root `index.html`.

## Deployment

GitHub Pages deploys the repository root through the workflow in `.github/workflows/pages.yml`.

Live site: https://gio-spec-beep.github.io/table-tennis/
