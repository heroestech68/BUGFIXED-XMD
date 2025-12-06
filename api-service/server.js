// ===============================
//  BUGFIXED-XMD API SERVICE
//  Auto-load Bot + API Server
// ===============================

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------
// 1. START BOT-SERVICE
// ---------------------------------
console.log("Starting BOT service...");
try {
    require("../bot-service/index.js");
    console.log("BOT service loaded successfully!");
} catch (err) {
    console.error("BOT service failed to start:", err);
}

// ---------------------------------
// 2. PAIR CODE ENDPOINT (for pairing-site)
// ---------------------------------
app.get("/pair", async (req, res) => {
    return res.json({
        success: true,
        message: "Pairing API is running",
        instructions: "Use /generate to get pairing code"
    });
});

const generatePairingCode = require("../pairing-api.js");

// Generate pairing code
app.get("/generate", async (req, res) => {
    try {
        const code = await generatePairingCode();
        return res.json({
            success: true,
            pairingCode: code
        });
    } catch (error) {
        return res.json({
            success: false,
            error: error.message
        });
    }
});

// ---------------------------------
// 3. STATIC FRONTEND (pairing-site)
// ---------------------------------
app.use("/", express.static(path.join(__dirname, "../pairing-site")));

// ---------------------------------
// 4. START SERVER
// ---------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API service running on PORT ${PORT}`);
});
