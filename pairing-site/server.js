import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import { fileURLToPath } from "url";

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const sessions = {}; // Store running sockets

// ─────────────────────────────────────────────────────────────
// START PAIRING
// ─────────────────────────────────────────────────────────────
app.post("/api/pair", async (req, res) => {
  try {
    const phone = req.body.phone;
    if (!phone) return res.json({ ok: false, error: "Phone missing" });

    const sessionId = Date.now().toString();
    const sessionDir = path.join(__dirname, "sessions", sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["Bugfixed Sulexh Tech", "Chrome", "1.0.0"],
      mobile: false
    });

    sessions[sessionId] = {
      sock,
      qr: null,
      code: null,
      ready: false,
      creds: null
    };

    // Save creds
    sock.ev.on("creds.update", saveCreds);

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr, pairingCode } = update;

      // QR CODE (will show on frontend)
      if (qr) sessions[sessionId].qr = qr;

      // PAIRING CODE (this is what shows “Link this number?” on WhatsApp)
      if (pairingCode) sessions[sessionId].code = pairingCode;

      // Reconnect logic
      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          console.log("Reconnecting...");
          sock.connect();
        } else {
          console.log("Logged out.");
        }
      }

      // Connection successful
      if (connection === "open") {
        const credsPath = path.join(sessionDir, "creds.json");

        if (fs.existsSync(credsPath)) {
          const data = fs.readFileSync(credsPath, "utf8");
          sessions[sessionId].ready = true;
          sessions[sessionId].creds = data;
        }
      }
    });

    res.json({
      ok: true,
      session: sessionId,
      qr: null,
      code: null,
      ready: false
    });

  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// POLL SESSION STATUS
// ─────────────────────────────────────────────────────────────
app.get("/api/status/:sessionId", (req, res) => {
  const id = req.params.sessionId;
  const s = sessions[id];

  if (!s) return res.json({ ok: false, error: "Invalid session" });

  res.json({
    ok: true,
    ready: s.ready,
    qr: s.qr,
    code: s.code,
    creds: s.ready ? s.creds : null
  });
});

// ─────────────────────────────────────────────────────────────
// DOWNLOAD CREDS
// ─────────────────────────────────────────────────────────────
app.get("/api/download/:sessionId/:format", (req, res) => {
  const { sessionId, format } = req.params;
  const s = sessions[sessionId];

  if (!s || !s.creds) return res.status(404).send("Not ready");

  if (format === "json") {
    res.setHeader("Content-Disposition", `attachment; filename=creds-${sessionId}.json`);
    return res.end(s.creds);
  }

  if (format === "js") {
    res.setHeader("Content-Disposition", `attachment; filename=creds-${sessionId}.js`);
    return res.end(`export default ${s.creds}`);
  }

  res.status(400).send("Invalid format");
});

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PAIRING SERVER STARTED ON PORT ${PORT}`);
});
