const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://003-39.github.io', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 선수 스탯 라우터
app.get("/api/player/:id", async (req, res) => {
  const playerId = req.params.id;
  const url = `https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/competitions/8/seasons/2024/players/${playerId}/stats`;

  try {
    const response = await axios.get(url, {
      headers: {
        Origin: "https://www.premierleague.com",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching player stats:", error.message);
    res.status(500).json({ error: "Failed to fetch player stats" });
  }
});
