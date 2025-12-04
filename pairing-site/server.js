import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve frontend from /public
app.use(express.static(path.join(process.cwd(), "public")));

const sessions = {}; // in-memory sessions map

// Helper to make a unique session id
function makeSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

// Start pairing
app.post("/api/start-session", async (req, res) => {
  try {
    const phoneNumber = req.body.phoneNumber;
    if (!phoneNumber) return res.status(400).json({ ok: false, error: "phoneNumber missing" });

    const sessionId = makeSessionId();
    const sessionDir = path.join(process.cwd(), "sessions", sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    // create auth state
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    // fetch latest version (recommended)
    let version = [2, 2304, 10];
    try {
      const v = await fetchLatestBaileysVersion();
      if (v?.version) version = v.version;
    } catch (e) {
      console.warn("Could not fetch latest baileys version, using fallback", e?.message || e);
    }

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ["Bugfixed Sulexh MD", "Chrome", "1.0.0"]
    });

    sessions[sessionId] = {
      sock,
      sessionDir,
      ready: false,
      pairingCode: null,
      qr: null,
      creds: null,
      phoneNumber
    };

    // save creds callback
    sock.ev.on("creds.update", saveCreds);

    // connection updates
    sock.ev.on("connection.update", async (update) => {
      try {
        const { connection, lastDisconnect, qr, pairingCode } = update;

        if (qr) sessions[sessionId].qr = qr;
        if (pairingCode) {
          sessions[sessionId].pairingCode = pairingCode;
        }

        if (connection === "close") {
          // reconnect unless logged out
          const statusCode = (lastDisconnect?.error)?.output?.statusCode;
          if (statusCode !== DisconnectReason.loggedOut) {
            try { await sock.connect(); } catch (e) { console.warn("reconnect failed", e?.message || e); }
          } else {
            // logged out - cleanup
            sessions[sessionId].ready = false;
          }
        }

        if (connection === "open") {
          // try read creds.json
          const credsPath = path.join(sessionDir, "creds.json");
          if (fs.existsSync(credsPath)) {
            const data = fs.readFileSync(credsPath, "utf8");
            sessions[sessionId].creds = data;
            sessions[sessionId].ready = true;
          }
        }
      } catch (e) {
        console.error("connection.update handler error:", e);
      }
    });

    // request pairing code (Baileys 6.x)
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      // store code if returned synchronously
      if (code) sessions[sessionId].pairingCode = code;
    } catch (err) {
      // sometimes requestPairingCode throws — still ok because connection.update emits pairingCode
      console.warn("requestPairingCode error:", err?.message || err);
    }

    // respond with session id so frontend can poll
    return res.json({ ok: true, session: sessionId });
  } catch (err) {
    console.error("start-session error:", err);
    return res.status(500).json({ ok: false, error: "server error" });
  }
});

// Poll status
app.get("/api/status/:sessionId", (req, res) => {
  const id = req.params.sessionId;
  const s = sessions[id];
  if (!s) return res.json({ ok: false, error: "invalid session" });

  return res.json({
    ok: true,
    ready: !!s.ready,
    pairingCode: s.pairingCode || null,
    qr: s.qr || null,
    creds: s.ready ? s.creds : null,
    phoneNumber: s.phoneNumber
  });
});

// Download creds
app.get("/api/download-creds/:sessionId", (req, res) => {
  const id = req.params.sessionId;
  const s = sessions[id];
  if (!s) return res.status(404).send("Not found");

  const file = path.join(s.sessionDir, "creds.json");
  if (!fs.existsSync(file)) return res.status(404).send("Creds not ready");

  res.download(file, `creds-${id}.json`);
});

// Fallback for root to serve index.html (in case static middleware isn't serving)
app.get("/", (req, res) => {
  const index = path.join(process.cwd(), "public", "index.html");
  if (fs.existsSync(index)) return res.sendFile(index);
  return res.status(404).send("No frontend found");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pairing server running on port ${PORT}`));
