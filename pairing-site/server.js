import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import qrcode from "qrcode";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/pairing-site/views/index.html");
});

// Generate QR
app.get("/generate-qr", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "No code provided" });

    const qr = await qrcode.toDataURL(code);
    res.json({ qr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "QR generation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`PAIRING SITE running on PORT ${PORT}`);
});
