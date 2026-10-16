/**
 * Table Tennis Online — Cloudflare Worker + Durable Objects
 *
 * Routes:
 *   GET  /health
 *   POST /api/rooms        -> { code }
 *   GET  /ws/ROOMCODE      -> WebSocket room connection
 *
 * Two WebSocket clients are allowed per room. Messages from one player are
 * relayed to the other. The browser game still needs to send/consume gameplay
 * input/state messages to make the actual match playable online.
 */

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, service: "table-tennis-online" });
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      // The creator immediately connects to /ws/CODE. The room itself is
      // allocated by Durable Objects when that WebSocket connection opens.
      return json({ code: makeCode() }, 201);
    }

    const match = url.pathname.match(/^\/ws\/([A-HJ-NP-Z2-9]{6})$/i);
    if (match && request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const code = match[1].toUpperCase();
      const id = env.MATCH_ROOMS.idFromName(code);
      return env.MATCH_ROOMS.get(id).fetch(request);
    }

    return json({ error: "Not found" }, 404);
  },
};

export class MatchRoom {
  constructor(ctx) {
    this.ctx = ctx;
    this.sessions = [];
  }

  async fetch(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }

    const live = this.sessions.filter((ws) => ws.readyState === WebSocket.OPEN);
    this.sessions = live;
    if (live.length >= 2) {
      return new Response("This match already has two players.", { status: 409 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const role = this.sessions.length === 0 ? "host" : "guest";
    server.serializeAttachment({ role });
    this.sessions.push(server);

    server.send(JSON.stringify({ type: "connected", role, players: this.sessions.length }));
    for (const peer of this.sessions) {
      if (peer !== server && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify({ type: "peer-joined", players: this.sessions.length }));
      }
    }

    server.addEventListener("message", (event) => {
      let message;
      try {
        message = typeof event.data === "string" ? JSON.parse(event.data) : null;
      } catch {
        return;
      }
      if (!message || typeof message.type !== "string") return;
      // Limit relayed payloads to avoid accidental or abusive huge messages.
      if (typeof event.data === "string" && event.data.length > 16000) return;
      const packet = JSON.stringify({
        type: "peer-message",
        from: role,
        message,
      });
      for (const peer of this.sessions) {
        if (peer !== server && peer.readyState === WebSocket.OPEN) {
          try { peer.send(packet); } catch {}
        }
      }
    });

    const cleanup = () => {
      this.sessions = this.sessions.filter((ws) => ws !== server && ws.readyState === WebSocket.OPEN);
      for (const peer of this.sessions) {
        try { peer.send(JSON.stringify({ type: "peer-left" })); } catch {}
      }
    };
    server.addEventListener("close", cleanup);
    server.addEventListener("error", cleanup);

    return new Response(null, { status: 101, webSocket: client });
  }
}
