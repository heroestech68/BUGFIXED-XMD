const express = require("express");
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const app = express();
app.use(express.json());

app.post("/generate-pair", async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) return res.json({ success: false, error: "Phone number missing" });

        const { state, saveCreds } = await useMultiFileAuthState("./session/" + phone);
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false
        });

        // request pair code
        const code = await sock.requestPairingCode(phone + "@s.whatsapp.net");

        console.log("PAIR CODE:", code);

        await saveCreds();

        res.json({
            success: true,
            pair_code: code,
            message: `Pair code generated for ${phone}`
        });

        // close after generating pair code
        setTimeout(() => sock.end(), 5000);

    } catch (err) {
        console.error(err);
        res.json({ success: false, error: err.message });
    }
});

module.exports = app;
