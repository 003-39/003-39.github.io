const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());

app.use(express.static("public")); // 정적 파일 제공

app.get("/api/player-stats", async (req, res) => {
  try {
    const response = await axios.get(
      "https://www.chelseafc.com/en/api/profiles/2srYA1QS1OhCE45rzou1ZR/stats?playerEntryId=2srYA1QS1OhCE45rzou1ZR"
    );
    res.json(response.data);
  } catch (error) {
    console.error("API 호출 실패:", error.message);
    res.status(500).send("데이터를 가져오지 못했습니다.");
  }
});

app.listen(3000, () => {
  console.log("서버 실행 중: http://localhost:3000");
});
