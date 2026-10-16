# Table Tennis Online backend (Cloudflare)

You do **not** need to install Node.js on your own computer. Deploy this folder from the Cloudflare website by connecting GitHub.

## Browser-only deployment

1. Sign in to the Cloudflare dashboard: https://dash.cloudflare.com/
2. Open **Workers & Pages**.
3. Choose **Create application** / **Create Worker**, then choose the option to import a Git repository. If asked to connect GitHub, authorize access to the `Gio-spec-beep/table-tennis` repository.
4. Choose the repository `Gio-spec-beep/table-tennis`.
5. Set the **Root directory** to `cloudflare`.
6. Set the build/deploy command to `npm run deploy`. The `package.json` in this folder installs Wrangler in Cloudflare's build environment, so you do not need it installed locally.
7. Deploy. If the setup page offers a build command separately, use `npm install` as the build command and `npm run deploy` as the deploy command.
8. After deployment, copy the Worker URL Cloudflare shows you. Test `https://YOUR-WORKER-URL/health`; it should return JSON with `"ok": true`.

If the dashboard does not offer Git repository import for Workers in your account, tell me what options you see on the **Workers & Pages** page and I’ll adjust the steps.

## API

- `POST /api/rooms` returns `{ "code": "ABC234" }`.
- Connect each player to `wss://YOUR-WORKER-URL/ws/ABC234`.
- Maximum two active connections per room.
- JSON messages are relayed to the other player inside a `peer-message` packet.

## Important current limitation

This is the online room/connection backend, not a complete game-networking implementation by itself. The table tennis game's bundled core runs in a closed-over third-party script, so its paddle controls, ball physics, and score must be connected to these WebSocket messages before two remote players can actually play. Do not advertise online gameplay as ready until that game-side integration has been completed and tested.
