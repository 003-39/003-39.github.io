document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("https://zero03-39-github-io.onrender.com/api/player-stats");
    const data = await response.json();
    const stats = data.stats;
    const player = data.entity;

    const statsMap = Object.fromEntries(stats.map(stat => [stat.name, stat.value]));

    // ▶ 이름, 등번호, 이미지
    document.querySelector(".first-name").textContent = player.name.first;
    document.querySelector(".number").textContent = `${player.name.last} ${player.info.shirtNum}`;
    document.getElementById("main-image").src = "image/cole_main.png"; // 수동 관리
    
    console.log("▶ player_info.json 로드 시작");

    const params = new URLSearchParams(window.location.search);
    const playerId = params.get("id") || "cole_palmer"; // 기본값 설정
    
    try {
      const response = await fetch("json/player_info.json");
      const playerData = await response.json();
      console.log("✅ JSON 데이터:", playerData);
    
      const info = playerData[playerId];
    
      if (!info) {
        console.error(`❌ '${playerId}'에 해당하는 정보가 없습니다.`);
        return;
      }
    
      // 이미지
      const imgEl = document.getElementById("info-img");
      console.log("🖼️ info-img 엘리먼트:", imgEl);
      if (imgEl && info.image) {
        imgEl.src = info.image;
        console.log("✅ 이미지 삽입 완료");
      }
    
      // joined
      const joinedEl = document.getElementById("player-joined");
      console.log("📅 player-joined 엘리먼트:", joinedEl);
      if (joinedEl) {
        joinedEl.innerHTML = `<span>${info.joined}</span>`;
        console.log("✅ joined 텍스트 삽입 완료");
      }
    
      // paragraphs
      const descEl = document.getElementById("player-description");
      console.log("📄 player-description 엘리먼트:", descEl);
      if (descEl) {
        descEl.innerHTML = "";
        info.paragraphs.forEach((p, i) => {
          const para = document.createElement("p");
          para.textContent = p;
          descEl.appendChild(para);
          console.log(`✅ 문단 ${i + 1} 삽입:`, p);
        });
      }
    
    } catch (err) {
      console.error("❌ JSON 로딩 실패:", err);
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
        const apps = statsMap["appearances"] || 1;
        setValue(element, (goals / apps).toFixed(2));
      } else if (name === "minutes_per_goal") {
        const mins = statsMap["mins_played"] || 0;
        const goals = statsMap["goals"] || 1;
        setValue(element, (mins / goals).toFixed(0));
      } else if (name === "tackles_won_total") {
        const won = statsMap["won_tackle"] || 0;
        const total = statsMap["total_tackle"] || 1;
        setValue(element, `${won}/${total}`);
      } else if (name === "duel_won_lost") {
        const won = statsMap["duel_won"] || 0;
        const lost = statsMap["duel_lost"] || 1;
        setValue(element, `${won}/${lost}`);
      } else if (name === "obox-rate") {
        const obox = statsMap["att_obox_goal"] || 0;
        const goals = statsMap["goals"] || 1;
        setValue(element, ((obox / goals) * 100).toFixed(0) + '%');
      } else if (name === "inbox-rate") {
        const ibox = statsMap["att_ibox_goal"] || 0;
        const goals = statsMap["goals"] || 1;
        setValue(element, ((ibox / goals) * 100).toFixed(0) + '%');
      } else if (name === "long_pass_sucsess") {
        const suc = statsMap["accurate_long_balls"] || 0;
        const total = statsMap["total_long_balls"] || 1;
        setValue(element, ((suc / total) * 100).toFixed(0) + '%');
      } else if (name === "pass_complecation") {
        const suc = statsMap["accurate_pass"] || 0;
        const total = statsMap["total_pass"] || 1;
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
  fetch("json/player_info.json")
    .then(res => res.json())
    .then(data => {
      const palmerData = data.cole_palmer;
      renderAccordion(palmerData.accordion); // 아코디언 데이터 렌더링
    })
    .catch(err => {
      console.error("❌ JSON 로딩 실패:", err);
    });
});

document.addEventListener("DOMContentLoaded", function () {
  fetch("json/player_info.json")
    .then(res => res.json())
    .then(data => {
      const palmerData = data.cole_palmer;
      renderAccordion(palmerData.accordion);
    })
    .catch(err => {
      console.error("JSON 로딩 실패:", err);
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