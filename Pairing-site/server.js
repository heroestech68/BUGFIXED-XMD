import express from "express";
import { Boom } from "@hapi/boom";
import pino from "pino";
import {
  makeWASocket,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("pairing-site/public"));

app.set("view engine", "html");
app.set("views", "pairing-site/views");

app.get("/", (req, res) => {
  res.render("index.html");
});

app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).send("Number required");

  const { state, saveCreds } = await useMultiFileAuthState("pairing-site/creds");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
  });

  let code = await sock.requestPairingCode(number);
  code = code?.match(/.{1,4}/g)?.join(" ") || code;

  res.json({
    pairing_code: code,
    message: "Use this code in WhatsApp to link",
  });

  sock.ev.on("creds.update", saveCreds);
});

app.listen(3000, () => {
  console.log("Pairing UI running on port 3000");
});
