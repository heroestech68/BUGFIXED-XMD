import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.post("/pair", async (req, res) => {
  const { number } = req.body;

  if (!number) return res.json({ error: "Phone number required" });

  res.json({ status: "Pairing started", number });

  startPairing(number);
});

async function startPairing(number) {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["Bugfixed Sulexh MD", "Chrome", "1.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.on("connection.update", async (update) => {
    const { connection, pairingCode } = update;

    if (pairingCode) {
      io.emit("pairing_code", {
        code: pairingCode,
        number
      });
    }

    if (connection === "open") {
      io.emit("paired_success", {
        message: "WhatsApp Linked Successfully!",
        number
      });
    }
  });

  try {
    await sock.requestPairingCode(number);
  } catch (err) {
    console.log("Error generating pair code:", err);
    io.emit("pair_error", { error: String(err) });
  }
}

io.on("connection", () => {
  console.log("Frontend connected");
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
