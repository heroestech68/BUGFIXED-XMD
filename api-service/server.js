const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// TEST ROUTE
app.get("/", (req, res) => {
  res.json({ status: "API is running", version: "1.0" });
});

// GENERATE PAIR ROUTE (connects to worker)
app.post("/generate-pair", async (req, res) => {
  const { phone } = req.body;

  if (!phone) return res.json({ success: false, error: "Phone missing" });

  return res.json({
    success: true,
    message: "Pair request received",
    phone_received: phone
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on port " + PORT));
