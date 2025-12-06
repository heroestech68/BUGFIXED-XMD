// BUGFIXED-XMD - Railway Optimized Index.js
// Stable Baileys + Express Pairing API

const express = require("express");
const { Boom } = require("@hapi/boom");
const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root alive checker
app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "BUGFIXED-XMD Running on Railway Successfully",
  });
});

// GLOBAL SOCKET REFERENCE
let sock;

// START WHATSAPP SOCKET
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    version,
    browser: ["BUGFIXED-XMD", "Chrome", "1.0"],
    syncFullHistory: false,
  });

  // connection updates
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const error = lastDisconnect?.error;
      const isRestart = error && error.output?.statusCode !== 401;

      console.log("Connection closed:", error);

      if (isRestart) {
        console.log("Restarting socket...");
        startBot();
      } else {
        console.log("Session expired. Needs re-pairing.");
      }
    }

    if (connection === "open") {
      console.log("WhatsApp Bot Connected Successfully!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// PAIRING ENDPOINT
app.post("/generate-pair", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.json({
        success: false,
        error: "Phone number is required",
      });
    }

    if (!sock) {
      return res.json({
        success: false,
        error: "WhatsApp socket not ready",
      });
    }

    console.log("Generating pairing code for:", phone);

    const code = await sock.requestPairingCode(phone);

    if (!code) {
      return res.json({
        success: false,
        error: "Failed to generate pairing code",
      });
    }

    return res.json({
      success: true,
      pairing_code: code,
      message: "Enter this code in WhatsApp → Linked Devices"
    });

  } catch (err) {
    console.error("Pair endpoint error:", err);
    res.json({
      success: false,
      error: err.message || "Unknown error",
    });
  }
});

// START EXPRESS + BOT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🌐 Express server running on port", PORT);
  startBot();
});
