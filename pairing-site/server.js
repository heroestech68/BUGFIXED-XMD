const express = require("express");
const path = require("path");
const manager = require("./manager");
const fs = require("fs");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views/index.html"));
});

app.get("/generate", async (req, res) => {
    try {
        const code = await manager.generatePairingCode();
        res.json({ status: true, code });
    } catch (err) {
        res.json({ status: false, message: err.message });
    }
});

app.post("/save-creds", (req, res) => {
    try {
        const { creds } = req.body;
        if (!creds) return res.json({ status: false, message: "No creds provided" });

        if (!fs.existsSync("./creds")) fs.mkdirSync("./creds");

        fs.writeFileSync("./creds/creds.js", creds, "utf8");

        res.json({ status: true, message: "creds.js saved successfully!" });
    } catch (err) {
        res.json({ status: false, message: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Pairing site running on port " + PORT);
});
