# Table Tennis Online backend (Cloudflare)

This folder contains the Cloudflare Worker and Durable Object used for private
two-player rooms. It generates six-character invite codes and relays WebSocket
messages between two connected players.

## Deploy it

1. Create/sign in to a Cloudflare account: https://dash.cloudflare.com/
2. Install Node.js if it is not already installed: https://nodejs.org/
3. In a terminal, install Wrangler:
   `npm install -g wrangler`
4. Sign in:
   `wrangler login`
5. From this folder, deploy:
   `wrangler deploy`

After deploy, Cloudflare prints a Worker URL similar to
`https://table-tennis-online.YOUR-SUBDOMAIN.workers.dev`.

Test it by opening `https://YOUR-WORKER-URL/health`. It should return JSON
with `"ok": true`.

## API

- `POST /api/rooms` returns `{ "code": "ABC234" }`.
- Connect each player to `wss://YOUR-WORKER-URL/ws/ABC234`.
- Maximum two active connections per room.
- JSON messages are relayed to the other player inside a `peer-message` packet.

## Important current limitation

This is the online room/connection backend, not a complete game-networking
implementation by itself. The table tennis game's bundled core runs in a
closed-over third-party script, so its paddle controls, ball physics, and score
must be connected to these WebSocket messages before two remote players can
actually play a synchronized match. Do not advertise online gameplay as ready
until that game-side integration has been completed and tested.
