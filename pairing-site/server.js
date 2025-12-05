const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// serve frontend
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// call BOT API
app.post("/pair", async (req, res) => {
    try {
        const { phone } = req.body;

        const botUrl = process.env.BOT_API_URL; 
        if (!botUrl) return res.json({ success: false, error: "BOT_API_URL not set" });

        const response = await axios.post(botUrl + "/generate-pair", { phone });

        res.json(response.data);

    } catch (err) {
        console.error(err);
        res.json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Pairing site running on port", PORT));
