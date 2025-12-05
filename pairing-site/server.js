const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Example endpoint for pairing
app.post("/pair", (req, res) => {
    const { phone } = req.body;
    res.json({
        success: true,
        message: `Pairing started for ${phone}`,
        session: "TEMP-SESSION-ID"
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Pairing site running on port " + PORT);
});
