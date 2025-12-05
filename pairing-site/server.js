const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/pair", async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) return res.json({ status: false, message: "Phone number required!" });

        const sessionFolder = `./sessions/${phone}`;
        if (!fs.existsSync("./sessions")) fs.mkdirSync("./sessions");
        if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);

        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
        const { version } = await fetchLatestBaileysVersion();

        let sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false
        });

        sock.ev.on("creds.update", saveCreds);

        sock.on("connection.update", (update) => {
            const { qr, pairingCode, connection } = update;

            if (pairingCode) {
                res.json({
                    status: true,
                    pairingCode: pairingCode,
                    message: "Enter this code on WhatsApp → Linked Devices"
                });
            }

            if (connection === "open") {
                console.log("Connected Successfully!");
            }
        });

        await sock.requestPairingCode(phone);

    } catch (err) {
        console.error("Error:", err);
        res.json({ status: false, message: "Server error", error: err.toString() });
    }
});

app.listen(10000, () => {
    console.log("Server running on port 10000");
});
