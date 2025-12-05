import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { makeWASocket, useMultiFileAuthState } from "whiskeysockets/baileys";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

app.post("/generate", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.json({ code: "Invalid number!" });

    const { state, saveCreds } = await useMultiFileAuthState("./session");

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    const code = await sock.requestPairingCode(number);

    res.json({ code });
    await saveCreds();
  } catch (err) {
    console.log("Pair error:", err);
    res.json({ code: "Error generating code" });
  }
});

app.listen(3000, () => console.log("Pairing Site Running on Port 3000"));
