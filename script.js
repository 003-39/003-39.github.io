let playerId = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. 쿼리에서 player=pedro_neto 파싱
    const urlParams = new URLSearchParams(window.location.search);
    const playerName = urlParams.get("player"); // 예: "pedro_neto"
    if (!playerName) {
      console.error("❌ player 쿼리 없음");
      return;
    }
    // 2. player_id.json에서 이름으로 ID 매핑
    const idRes = await fetch("json/playerID.json");
    const playerList = await idRes.json();

    const matchedPlayer = playerList.find(player => player.name === playerName);

    if (!matchedPlayer) {
      console.error("❌ 해당 선수 ID를 찾을 수 없습니다.");
      return;
    }

    playerId = matchedPlayer.id;

    // 3. API 요청
    const response = await fetch(`https://zero03-39-github-io.onrender.com/api/player/${playerId}`);
    const data = await response.json();
    const stats = data.stats;
    const player = data.player;

    // 디버깅: API 응답 구조 확인
    console.log("API Response:", data);
    console.log("Player data:", player);
    console.log("Stats data:", stats);

    // 새로운 API는 stats를 객체로 반환하므로 직접 사용
    const statsMap = stats;

    // 4. player_info.json에서 추가 정보 매핑
    const infoRes = await fetch("json/player_info.json");
    const infoData = await infoRes.json();
    const info = infoData[playerName]; // playerId 대신 playerName 사용

    if (!info) {
      console.error("❌ player_info.json에 해당 ID 정보 없음");
      return;
    }


    // ▶ 이름, 등번호, 이미지
    // knownName에서 이름 분리 (가장 깔끔한 방법)
    let firstName = "Unknown";
    let lastName = "Unknown";
    
    if (player.knownName) {
      const nameParts = player.knownName.split(' ');
      if (nameParts.length >= 2) {
        firstName = nameParts[0];  // 첫 번째 부분 (FirstName)
        lastName = nameParts[nameParts.length - 1];  // 마지막 부분 (LastName만)
      } else {
        firstName = player.knownName;
      }
    } else {
      firstName = player.firstName || player.name?.first || "Unknown";
      lastName = player.lastName || player.name?.last || "Unknown";
    }
    
    document.querySelector(".first-name").textContent = firstName;
    
    // shirtNum이 없으므로 임시로 빈 문자열 사용
    const shirtNum = player.shirtNum || "";
    document.querySelector(".number").textContent = `${lastName} ${shirtNum}`;
    
    // main-image는 별도로 설정 (현재는 placeholder 유지)
    // document.getElementById("main-image").src = "별도_이미지_경로";
    
    // info-img에 player_info.json의 이미지 설정
    const infoImg = document.getElementById("info-img");
    if (infoImg) {
      infoImg.src = info.image || "image/placeholder.png";
    }

    // joined
    const joinedEl = document.getElementById("player-joined");
    if (joinedEl) {
      joinedEl.innerHTML = `<span>${info.joined}</span>`;
    }

    // description
    const descEl = document.getElementById("player-description");
    if (descEl) {
      descEl.innerHTML = "";
      info.paragraphs.forEach(p => {
        const para = document.createElement("p");
        para.textContent = p;
        descEl.appendChild(para);
      });
    }


    // ▶ 공통 적용 함수
    const setValue = (element, value) => {
      const span = element.querySelector("span");
      if (span) {
        span.textContent = value;
      } else {
        element.textContent = value;
      }
    };

    // ▶ 스탯 채우기
    const targetElements = document.querySelectorAll(
      ".apptext-2, .directiontext, .success-text-2, .touchtext-3, .card-text, .completion-text, .foul-text-1, .goal-text-3, .spot-text, .freetext-1, .score-text"
    );

    targetElements.forEach((element) => {
      const name = element.getAttribute("data-name");
      if (!name) return;

      if (statsMap[name] !== undefined) {
        setValue(element, statsMap[name]);
      } else if (name === "goal_per_match") {
        const goals = statsMap["goals"] || 0;
        const apps = statsMap["gamesPlayed"] || 1;
        setValue(element, (goals / apps).toFixed(2));
      } else if (name === "minutes_per_goal") {
        const mins = statsMap["timePlayed"] || 0;
        const goals = statsMap["goals"] || 1;
        setValue(element, (mins / goals).toFixed(0));
      } else if (name === "tackles_won_total") {
        const won = statsMap["tacklesWon"] || 0;
        const total = statsMap["totalTackles"] || 1;
        setValue(element, `${won}/${total}`);
      } else if (name === "duel_won_lost") {
        const won = statsMap["duelsWon"] || 0;
        const lost = statsMap["duelsLost"] || 1;
        setValue(element, `${won}/${lost}`);
      } else if (name === "obox-rate") {
        const obox = statsMap["shotsOnTargetOutsideBox"] || 0;
        const goals = statsMap["totalShots"] || 1;
        setValue(element, ((obox / goals) * 100).toFixed(0) + '%');
      } else if (name === "shotsOnTargetRate") {
        const obox = statsMap["shotsOnTargetIncGoals"] || 0;
        const goals = statsMap["totalShots"] || 1;
        setValue(element, ((obox / goals) * 100).toFixed(0) + '%');
      } else if (name === "inbox-rate") {
        const ibox = statsMap["shotsOnTargetOutsideBox"] || 0;
        const goals = statsMap["totalShots"] || 1;
        setValue(element, ((ibox / goals) * 100).toFixed(0) + '%');
      } else if (name === "long_pass_sucsess") {
        const suc = statsMap["successfulLongPasses"] || 0;
        const total = (statsMap["successfulLongPasses"] || 0) + (statsMap["unsuccessfulLongPasses"] || 0);
        setValue(element, ((suc / total) * 100).toFixed(0) + '%');
      } else if (name === "pass_complecation") {
        // 새로운 API: successfulShortPasses + successfulLongPasses
        const suc = (statsMap["successfulShortPasses"] || 0) + (statsMap["successfulLongPasses"] || 0);
        const total = statsMap["totalPasses"] || 1;
        setValue(element, ((suc / total) * 100).toFixed(0) + '%');
      } else {
        setValue(element, "0");
      }
    });
  } catch (error) {
    console.error("API 요청 중 오류:", error.message);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // URL에서 player 파라미터 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const playerName = urlParams.get("player");
  
  if (!playerName) return;
  
  fetch("json/player_info.json")
  .then(res => res.json())
  .then(data => {
    const playerData = data[playerName];
    if (!playerData) return console.error("❌ 아코디언 데이터 없음");
    renderAccordion(playerData.accordion);
  });
});


function renderAccordion(sections) {
  const container = document.getElementById("ac-wrap");
  container.innerHTML = "";

  sections.forEach((section, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "ac-wrapper-block";

    const panelId = `panel-${idx}`;

    const header = document.createElement("button");
    header.className = "ac-header";
    header.setAttribute("aria-expanded", "false");
    header.setAttribute("aria-controls", panelId);
    header.innerHTML = section.title;

    const toggleBox = document.createElement("div");
    toggleBox.className = "ac-toggle-box";

    const bar1 = document.createElement("div");
    bar1.className = "ac-bar-1";
    const bar2 = document.createElement("div");
    bar2.className = "ac-bar-2";

    toggleBox.appendChild(bar1);
    toggleBox.appendChild(bar2);
    header.appendChild(toggleBox);

    const panel = document.createElement("div");
    panel.className = "ac-panel";
    panel.id = panelId;

    const acBody = document.createElement("div");
    acBody.className = "ac-body";
    acBody.style.height = "0";
    acBody.style.opacity = "0";
    acBody.style.visibility = "hidden";
    acBody.style.overflow = "hidden";
    acBody.style.transition = "height 0.4s ease, opacity 0.4s ease";

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "ac-content";

    section.content.forEach(item => {
      if (item.type === "p") {
        const p = document.createElement("p");
        p.textContent = item.text;
        contentWrapper.appendChild(p);
      } else if (item.type === "img") {
        const imgWrap = document.createElement("div");
        imgWrap.className = "imgbox";

        const img = document.createElement("img");
        img.src = item.src;
        img.alt = item.title || "";
        img.className = "img-1";
        imgWrap.appendChild(img);

        const descBox = document.createElement("div");
        descBox.className = "descriptionbox";

        if (item.title) {
          const title = document.createElement("div");
          title.className = "ac-img-title";
          title.textContent = item.title;
          descBox.appendChild(title);
        }

        if (item.desc) {
          const desc = document.createElement("div");
          desc.className = "ac-img-desc";
          desc.textContent = item.desc;
          descBox.appendChild(desc);
        }

        imgWrap.appendChild(descBox);
        contentWrapper.appendChild(imgWrap);
      }
    });

    acBody.appendChild(contentWrapper);
    panel.appendChild(acBody);
    wrapper.appendChild(header);
    wrapper.appendChild(panel);
    container.appendChild(wrapper);

    // ✅ 여러 개 열리는 toggle
    header.addEventListener("click", () => {
      const isExpanded = header.getAttribute("aria-expanded") === "true";

      if (isExpanded) {
        header.setAttribute("aria-expanded", "false");
        acBody.style.height = "0";
        acBody.style.opacity = "0";
        acBody.style.visibility = "hidden";
      } else {
        header.setAttribute("aria-expanded", "true");
        acBody.style.height = `${acBody.scrollHeight}px`;
        acBody.style.opacity = "1";
        acBody.style.visibility = "visible";
      }
    });
  });
}