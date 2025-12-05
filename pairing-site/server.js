const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve frontend files from public/
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Pairing endpoint (frontend calls this)
app.post("/pair", async (req, res) => {
    try {
        const { phone } = req.body;

        const botUrl = process.env.BOT_API_URL;
        if (!botUrl) {
            return res.json({ success: false, error: "BOT_API_URL not set in Render" });
        }

        // ✅ Correct backend route (your bot uses /pair, NOT /generate-pair)
        const response = await axios.post(botUrl, { phone });

        res.json(response.data);

    } catch (err) {
        console.error("PAIR ERROR:", err.response?.data || err.message);
        res.json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Pairing site running on port", PORT));
