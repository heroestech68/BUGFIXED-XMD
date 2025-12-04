import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import makeWASocket, { useMultiFileAuthState, Browsers } from "@whiskeysockets/baileys";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const sessions = {};  // store active sessions

// ------------------------------
// START SESSION
// ------------------------------
app.post("/api/start-session", async (req, res) => {
    try {
        const { sessionId, phoneNumber } = req.body;

        if (!sessionId || !phoneNumber) {
            return res.status(400).json({ success: false, message: "Missing sessionId or phoneNumber" });
        }

        // Initialize multi-file auth folder
        const authFolder = path.join(__dirname, "sessions", sessionId);
        if (!fs.existsSync(authFolder)) fs.mkdirSync(authFolder, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(authFolder);

        const sock = makeWASocket({
            printQRInTerminal: false,
            browser: Browsers.macOS("Desktop"),
            auth: state
        });

        sessions[sessionId] = { sock, saveCreds, status: "starting", pairingCode: null };

        // 🔥 Request Pairing Code
        const code = await sock.requestPairingCode(phoneNumber);
        sessions[sessionId].pairingCode = code;
        sessions[sessionId].status = "pairing";

        console.log("PAIRING CODE:", code);

        return res.json({ success: true });

        // ------------------------------
        // SOCKET EVENTS
        // ------------------------------
        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", (update) => {
            let { connection } = update;

            if (connection === "open") {
                sessions[sessionId].status = "connected";

                // Save final creds.json (export)
                const credsPath = path.join(authFolder, "creds.json");
                fs.writeFileSync(
                    credsPath,
                    JSON.stringify(state.creds, null, 2)
                );

            } else if (connection === "close") {
                sessions[sessionId].status = "closed";
            }
        });

    } catch (err) {
        console.error("Error starting session:", err);
        res.status(500).json({ success: false });
    }
});

// ------------------------------
// GET STATUS
// ------------------------------
app.get("/api/status/:sessionId", (req, res) => {
    const sessionId = req.params.sessionId;

    if (!sessions[sessionId]) {
        return res.json({ exists: false });
    }

    const s = sessions[sessionId];

    res.json({
        exists: true,
        status: s.status,
        pairingCode: s.pairingCode,
        credsReady: s.status === "connected"
    });
});

// ------------------------------
// DOWNLOAD CREDS
// ------------------------------
app.get("/api/download-creds/:sessionId", (req, res) => {
    const sessionId = req.params.sessionId;

    const credsPath = path.join(__dirname, "sessions", sessionId, "creds.json");

    if (!fs.existsSync(credsPath)) {
        return res.status(404).json({ error: "Creds not found" });
    }

    res.download(credsPath);
});

// ------------------------------
app.listen(3000, () => {
    console.log("Pairing server running on port 3000");
});
