const express = require("express");
const cors = require("cors");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Pairing site backend is running!");
});

// MAIN PAIR ENDPOINT
app.post("/pair", async (req, res) => {
    try {
        const number = req.body.number;
        if (!number) return res.json({ error: "WhatsApp number is required" });

        const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${number}`);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: state
        });

        const code = await sock.requestPairingCode(number);

        res.json({ code });

        sock.ev.on("creds.update", saveCreds);
    } catch (err) {
        console.log("PAIR ERROR:", err);
        res.json({ error: "Could not generate pair code" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Pairing server running on " + PORT));
