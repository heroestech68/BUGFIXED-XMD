import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { Boom } from "@hapi/boom";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import { fileURLToPath } from "url";

// Folder setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage for active sessions
const sessions = {};

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

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
      browser: ["Bugfixed Sulexh Tech", "Chrome", "1.0.0"]
    });

    sessions[sessionId] = { sock, ready: false, creds: null };

    sock.ev.on("creds.update", () => saveCreds());

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Return QR to frontend
      if (qr) {
        sessions[sessionId].qr = qr;
      }

      // Return pairing code when WhatsApp requests it
      if (update.pairingCode) {
        sessions[sessionId].code = update.pairingCode;
      }

      if (connection === "close") {
        if ((lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
          sock.connect();
        }
      }

      // Once connected, save creds
      if (connection === "open") {
        const credsPath = path.join(sessionDir, "creds.json");
        const data = fs.readFileSync(credsPath, "utf8");

        sessions[sessionId].ready = true;
        sessions[sessionId].creds = data;
      }
    });

    // Respond immediately
    return res.json({
      ok: true,
      session: sessionId,
      type: "waiting",
      qr: null,
      code: null
    });
  } catch (err) {
    console.error(err);
    return res.json({ ok: false, error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// POLL SESSION STATUS
// ─────────────────────────────────────────────────────────────
app.get("/api/status/:sessionId", (req, res) => {
  const id = req.params.sessionId;
  const session = sessions[id];

  if (!session) return res.json({ ok: false, error: "Invalid Session" });

  return res.json({
    ok: true,
    ready: session.ready,
    qr: session.qr || null,
    code: session.code || null,
    creds: session.ready ? session.creds : null
  });
});

// ─────────────────────────────────────────────────────────────
// DOWNLOAD CREDS
// ─────────────────────────────────────────────────────────────
app.get("/api/download/:sessionId/:format", (req, res) => {
  const { sessionId, format } = req.params;
  const session = sessions[sessionId];
  if (!session || !session.creds)
    return res.status(404).send("Not ready");

  if (format === "json") {
    res.setHeader("Content-Disposition", `attachment; filename=creds-${sessionId}.json`);
    return res.end(session.creds);
  }

  if (format === "js") {
    res.setHeader("Content-Disposition", `attachment; filename=creds-${sessionId}.js`);
    return res.end(`export default ${session.creds}`);
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
