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
// server.js (또는 api 서버 파일)
app.get("/api/player/:id", async (req, res) => {
  const playerId = req.params.id;
  const season = String(req.query.season || "2025"); // 기본 2025/26
  const url = `https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/competitions/8/seasons/${season}/players/${playerId}/stats`;

  try {
    const r = await axios.get(url, {
      headers: {
        Origin: "https://www.premierleague.com",
        Referer: "https://www.premierleague.com/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
      },
      timeout: 12000,
      // -> 여기서 던지게 하지 말고 그대로 상태를 전달하도록 둔다
      validateStatus: () => true,
    });

    // 상태 그대로 프록시
    res.status(r.status).json(r.data);
  } catch (e) {
    // 여기까지 오면 네트워크 레벨 예외
    console.error("PL proxy fatal:", {
      url,
      msg: e.message,
    });
    res.status(500).json({ error: "proxy_failed", detail: e.message });
  }
});