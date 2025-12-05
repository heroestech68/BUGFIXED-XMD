const express = require("express");
const cors = require("cors");
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");

const app = express();
app.use(cors());
app.use(express.json());

let globalSocket = null;

// Initialize WhatsApp socket (without starting bot functions)
async function initSocket() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");

    globalSocket = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: ["PairingServer", "Chrome", "1.0"]
    });

    globalSocket.ev.on("creds.update", saveCreds);
}

initSocket();

// API: Generate Pair Code
app.get("/pair", async (req, res) => {
    try {
        const number = req.query.number;
        if (!number) return res.json({ success: false, message: "Phone number missing" });

        if (!globalSocket) return res.json({ success: false, message: "Socket not ready" });

        let code = await globalSocket.requestPairingCode(number);
        code = code?.match(/.{1,4}/g)?.join("-");

        res.json({
            success: true,
            code
        });

    } catch (err) {
        console.error("PAIR ERROR:", err);
        res.json({ success: false, message: "Failed to generate code" });
    }
});

app.listen(3000, () => {
    console.log("PAIRING SERVER RUNNING ON PORT 3000");
});
