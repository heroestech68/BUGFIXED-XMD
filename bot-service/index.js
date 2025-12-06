require("dotenv").config();
const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  Browsers
} = require("@whiskeysockets/baileys");

const axios = require("axios");
const pino = require("pino");

// ------------------------------
// CONFIG
// ------------------------------
const API_URL = process.env.API_URL || "YOUR_API_URL_HERE"; // Example: https://bugfixed-api-production.up.railway.app

// ------------------------------
// START BOT
// ------------------------------
async function connectBot() {
  try {
    console.log("🚀 Starting BUGFIXED-XMD Bot...");

    const { state, saveCreds } = await useMultiFileAuthState("./creds");

    const sock = makeWASocket({
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      browser: Browsers.macOS("Safari"),
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true
    });

    // ------------------------------
    // SAVE CREDS
    // ------------------------------
    sock.ev.on("creds.update", saveCreds);

    // ------------------------------
    // HANDLE PAIRING REQUEST (Railway Web API will signal)
    // ------------------------------
    sock.ev.on("connection.update", async (update) => {
      const { connection, qr, pairingCode } = update;

      if (connection === "open") {
        console.log("✅ WhatsApp Connected!");
      }

      // Send pairing code to API service
      if (pairingCode) {
        console.log("📨 Sending pairing code to API:", pairingCode);

        await axios.post(`${API_URL}/pair-code`, {
          pairingCode
        }).catch(err => console.log("API send error:", err.message));
      }

      if (qr) {
        console.log("⚠ QR RECEIVED — but QR is disabled, using pairing only.");
      }

      if (connection === "close") {
        console.log("❌ Connection closed. Reconnecting...");
        setTimeout(connectBot, 3000);
      }
    });

    // ------------------------------
    // PROCESS MESSAGES
    // ------------------------------
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const m = messages[0];
      if (!m.message) return;

      const from = m.key.remoteJid;
      const text =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        "";

      console.log("📩 MESSAGE:", from, "|", text);

      // simple command
      if (text.toLowerCase() === "ping") {
        await sock.sendMessage(from, { text: "Pong 🟢" });
      }
    });

  } catch (err) {
    console.error("❌ Bot crashed:", err);
    setTimeout(connectBot, 3000);
  }
}

connectBot();
