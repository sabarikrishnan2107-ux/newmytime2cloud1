// MyTime2Cloud — local push relay (SSE).
//
// Replaces the live external push server (v2push.mytime2cloud.com) for the
// fully-local desktop build. Same tiny protocol:
//   GET  /stream?clientId=X   browser EventSource subscribes (one company_id)
//   POST /notify              backend posts {clientId,type,message,data,...};
//                             we fan it out to every /stream client on that id
//
// Pure Node http, zero dependencies. Binds 0.0.0.0 so other LAN PCs reach it;
// CORS is open because the desktop has no fixed origin (the client's host/IP
// varies). No static URLs here — host comes from whoever connects.

const http = require("http");

const PORT = Number(process.env.PUSH_PORT || 8077);

// clientId -> Set<res>. A client is a live SSE response we keep writing to.
const clients = new Map();

function addClient(clientId, res) {
  if (!clients.has(clientId)) clients.set(clientId, new Set());
  clients.get(clientId).add(res);
}
function removeClient(clientId, res) {
  const set = clients.get(clientId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(clientId);
}

function send(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");

  // Open CORS for every response — the desktop origin is whatever LAN host/IP
  // the browser used; we can't enumerate it ahead of time.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // ── Browser subscribes ───────────────────────────────────────────────────
  if (req.method === "GET" && u.pathname === "/stream") {
    const clientId = u.searchParams.get("clientId");
    if (!clientId) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      return res.end("clientId required");
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("retry: 3000\n\n");
    send(res, { type: "connected", clientId, timestamp: new Date().toISOString() });
    addClient(clientId, res);

    // Heartbeat keeps proxies/keep-alive from dropping an idle stream.
    const beat = setInterval(() => {
      try { res.write(": ping\n\n"); } catch (_) {}
    }, 25000);

    req.on("close", () => {
      clearInterval(beat);
      removeClient(clientId, res);
    });
    return;
  }

  // ── Backend pushes an event ──────────────────────────────────────────────
  if (req.method === "POST" && u.pathname === "/notify") {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 1e6) req.destroy(); // guard against runaway payloads
    });
    req.on("end", () => {
      let payload;
      try { payload = JSON.parse(body || "{}"); }
      catch (_) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: false, error: "invalid json" }));
      }
      const clientId = payload.clientId != null ? String(payload.clientId) : null;
      const set = clientId ? clients.get(clientId) : null;
      let delivered = 0;
      if (set) {
        for (const r of set) {
          try { send(r, payload); delivered++; } catch (_) {}
        }
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, delivered }));
    });
    return;
  }

  // ── Health ───────────────────────────────────────────────────────────────
  if (req.method === "GET" && u.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, clients: clients.size }));
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[push] SSE relay listening on 0.0.0.0:${PORT}`);
});
