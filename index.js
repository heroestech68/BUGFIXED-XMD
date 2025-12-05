// ===============================================
// BUGFIXED-XMD — MAIN BOT FILE WITH PAIR API
// ===============================================

require("./settings");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const pino = require("pino");
const express = require("express");

// =====================================================
// EXPRESS SERVER (FOR PAIR API + KEEP-ALIVE)
// =====================================================
const app = express();
app.use(express.json());

// =============================
// 1. GENERATE PAIR CODE API
// =============================
app.post("/generate-pair", async (req, res) => {
    try {
        const phone = req.body.phone;
        if (!phone)
            return res.json({ success: false, error: "Phone number missing" });

        console.log("⚡ Generating pair code for:", phone);

        const { state, saveCreds } = await useMultiFileAuthState("./session");

        const sock = makeWASocket({
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.macOS("Safari"),
        });

        const code = await sock.requestPairingCode(phone);
        console.log("PAIR CODE:", code);

        return res.json({
            success: true,
            pair_code: code,
            message: "Use this code inside WhatsApp Settings → Linked Devices"
        });

    } catch (err) {
        console.log("PAIR ERROR:", err);
        return res.json({ success: false, error: err.message });
    }
});

// =============================
// 2. KEEP ALIVE PAGE
// =============================
app.get("/", (req, res) => {
    res.send("BUGFIXED-XMD BOT IS RUNNING OK ✔");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🌐 Express server running on port " + PORT);
});

// =====================================================
// START THE BOT ITSELF
// =====================================================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");

    const client = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.macOS("Safari"),
    });

    client.ev.on("creds.update", saveCreds);

    client.ev.on("messages.upsert", async (msg) => {
        // you can add your commands here
    });

    return client;
}

startBot();

// =====================================================
// WATCH FILES (AUTO-RELOAD)
// =====================================================
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log("♻ Reloading " + __filename);
    delete require.cache[file];
    require(file);
});
