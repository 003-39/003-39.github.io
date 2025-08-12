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

  // 하드코딩(PL=17, 시즌=61627) 유지
  const UNIQUE_TOURNAMENT_ID = 17;
  const SEASON_ID = 61627;

  const url = `https://api.sofascore.com/api/v1/player/${playerId}/unique-tournament/${UNIQUE_TOURNAMENT_ID}/season/${SEASON_ID}/statistics/overall`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
        Referer: "https://api.sofascore.com/"
        // ⚠️ 일부 환경에서 Origin/Accept-Encoding 넣으면 오히려 403 나는 경우 있음 → 생략
      },
      timeout: 12000,
      validateStatus: s => s >= 200 && s < 300
    });

    res.json(response.data);
  } catch (error) {
    console.error("Sofascore Error:", error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch Sofascore stats",
      status: error.response?.status || 500,
      detail: error.response?.data || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});