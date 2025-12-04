import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.post("/save-creds", (req, res) => {
  try {
    const credsData = req.body.creds;
    fs.writeFileSync(path.join(__dirname, "creds.js"), credsData);
    res.json({ success: true, message: "creds.js saved successfully" });
  } catch (err) {
    console.error("Error saving creds:", err);
    res.status(500).json({ success: false });
  }
});

app.listen(3000, () => {
  console.log("Pairing site server running on port 3000");
});
