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

// SERVE FRONTEND
app.use(express.static(path.join(process.cwd(), "public")));

const sessions = {};

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// API: START SESSION
app.post("/api/start-session", async (req, res) => {
  const phone = req.body.phoneNumber;
  if (!phone) return res.json({ ok: false, error: "Missing phone number" });

  const sessionId = newId();
  const sessionPath = path.join(process.cwd(), "sessions", sessionId);
  fs.mkdirSync(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  let version = (await fetchLatestBaileysVersion()).version;

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    browser: ["Bugfixed-XMD", "Chrome", "1.0"],
  });

  sessions[sessionId] = {
    sock,
    sessionPath,
    pairingCode: null,
    ready: false,
    creds: null,
  };

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, pairingCode } = update;

    if (pairingCode) sessions[sessionId].pairingCode = pairingCode;

    if (connection === "open") {
      const file = path.join(sessionPath, "creds.json");
      if (fs.existsSync(file)) {
        sessions[sessionId].creds = fs.readFileSync(file, "utf8");
        sessions[sessionId].ready = true;
      }
    }

    if (connection === "close") {
      const reason = update?.lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        try { await sock.connect(); } catch {}
      }
    }
  });

  await sock.requestPairingCode(phone);

  return res.json({ ok: true, session: sessionId });
});

// API: GET STATUS
app.get("/api/status/:id", (req, res) => {
  const id = req.params.id;
  const s = sessions[id];
  if (!s) return res.json({ ok: false });

  res.json({
    ok: true,
    pairingCode: s.pairingCode,
    ready: s.ready,
    creds: s.ready ? s.creds : null,
  });
});

// API: DOWNLOAD CREDS
app.get("/api/download-creds/:id", (req, res) => {
  const id = req.params.id;
  const s = sessions[id];
  if (!s) return res.status(404).send("Not found");

  const file = path.join(s.sessionPath, "creds.json");
  res.download(file, "creds.json");
});

// SERVE FRONTEND FOR /
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("PAIRING SERVER RUNNING ON", PORT));
