# Tutoring Hub

A purple-themed website that brings games and learning activities together in one place.

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
│       └── index.html
├── .github/workflows/pages.yml
└── README.md
```

## Add another game

Create a folder under `games/`, place that game's entry page and related files inside it, then add a card to the game grid in the root `index.html`. Keep each game's assets and scripts inside its own folder wherever licensing and file structure allow.

## Deployment

GitHub Pages deploys the repository root through the workflow in `.github/workflows/pages.yml`.

Live site: https://gio-spec-beep.github.io/table-tennis/

## External assets

Some games still load assets from their original CDN sources. The HTML and JavaScript folder structure has been organized here, but the games are not guaranteed to be fully offline/self-contained.
