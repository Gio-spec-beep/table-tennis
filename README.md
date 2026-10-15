# Table Tennis World Tour (working copy)

This repository contains a working copy of the game's JavaScript files so they can be edited independently of the original repository.

## JavaScript files

- `js/all.js` — main game engine
- `js/start.js` — game loader / startup framework
- `js/fix.js` — compatibility fixes

## Source and assets

These JavaScript files were copied from the publicly accessible `thirstygithub/congenial-robot` repository. The game also references image/audio assets and startup resources from that original project. Before redistributing or publishing a public fork, review the original repository's license and attribution requirements.

## Next step

The HTML entry point should load the scripts from this repository (for example, `https://cdn.jsdelivr.net/gh/Gio-spec-beep/table-tennis@main/js/all.js`) while retaining the original asset base URL until the required assets are copied and verified here. The customized abilities UI is currently in the separately generated HTML file, and has not yet been committed to this repository.
