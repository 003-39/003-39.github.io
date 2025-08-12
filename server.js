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

// Sofascore API 라우터 추가
app.get("/api/sofascore/:playerId", async (req, res) => {
  const playerId = req.params.playerId;
  const url = `https://www.sofascore.com/api/v1/player/${playerId}/unique-tournament/17/season/61627/statistics/overall`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching Sofascore stats:", error.message);
    res.status(500).json({ error: "Failed to fetch Sofascore stats" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});