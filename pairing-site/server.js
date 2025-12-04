const express = require("express");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send(`
        <center>
        <h1 style="font-family: Arial;margin-top:40px">🔥 Bugfixed-XMD Pairing Portal</h1>
        <p>Enter the pairing code displayed below</p>
        <h2 id="code-box" style="border:1px solid #ddd;padding:10px;border-radius:8px;width:240px">Waiting...</h2>
        <script>
            const evt = new EventSource("/pair");
            evt.onmessage = (e) => {
                document.getElementById("code-box").innerHTML = e.data;
            };
        </script>
        </center>
    `);
});

app.get("/pair", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");

    const { state, saveCreds } = await useMultiFileAuthState("./auth");

    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Bugfixed-XMD", "Chrome", "1.0"]
    });

    // show pairing code on browser
    if (!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(process.env.OWNER_NUMBER || "");
        res.write(`data: ${code}\n\n`);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("Pairing successful!");

            // Path to creds.json
            const credsPath = path.join(__dirname, "..", "auth", "creds.json");

            // Wait until the file exists
            if (fs.existsSync(credsPath)) {
                const credsText = fs.readFileSync(credsPath, "utf-8");

                // 1️⃣ Send plaintext creds as a message
                await sock.sendMessage(sock.user.id, {
                    text: `🔥 *Your Bugfixed-XMD Session (creds.json)*\n\n\`\`\`json\n${credsText}\n\`\`\`\n\n⚠️ Keep this file safe.`
                });

                // 2️⃣ Send creds.json as file directly
                await sock.sendMessage(sock.user.id, {
                    document: fs.readFileSync(credsPath),
                    mimetype: "application/json",
                    fileName: "creds.json",
                    caption: "🔥 Your session file"
                });

                console.log("Session creds sent!");
            }
        }

        if (connection === "close") {
            const shouldReconnect =
                (lastDisconnect.error = new Boom(lastDisconnect?.error)?.output.statusCode !== 401);
            if (shouldReconnect) console.log("Reconnecting...");
        }
    });
});

app.listen(PORT, () => {
    console.log(`Pairing-site running at http://localhost:${PORT}`);
});
