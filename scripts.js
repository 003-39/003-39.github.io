
document.addEventListener("DOMContentLoaded", () => {
    const scaleViewToFit = () => {
        const view = document.querySelector("#template");
        if (!view) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const elementWidth = view.offsetWidth;
        const elementHeight = view.offsetHeight;

        // Calculate scale ratio
        const scaleX = viewportWidth / elementWidth;
        const scaleY = viewportHeight / elementHeight;

        // Use the smaller scale to maintain aspect ratio
        const scale = scaleX

        // Apply the scaling to the view
        view.style.transform = `scale(${scale})`;
        view.style.transformOrigin = "top left";

        // Center the content horizontally only
        const translateX = (viewportWidth - elementWidth * scale) / 2;
        view.style.marginLeft = `${translateX}px`;
    };

    // Initial scaling
    scaleViewToFit();

    // Reapply scaling on window resize
    window.addEventListener("resize", scaleViewToFit);
});
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".ac-header").forEach((header) => {
        header.addEventListener("click", () => {
            const expanded = header.getAttribute("aria-expanded") === "true";
            header.setAttribute("aria-expanded", !expanded);

            const bodyId = header.getAttribute("aria-controls");
            const body = document.getElementById(bodyId);

            if (body) {
                if (!expanded) {
                    body.style.height = `${body.scrollHeight}px`;
                    body.style.visibility = "visible";
                    body.style.opacity = "1";
                } else {
                    body.style.height = "0";
                    body.style.visibility = "hidden";
                    body.style.opacity = "0";
                }
                body.setAttribute("aria-expanded", !expanded);
            }
        });
    });
});



document.addEventListener("DOMContentLoaded", function () {
    const boxMap = {
        appbox: document.querySelector('.appbox'),
        passbox: document.querySelector('.passbox'),
        dicibox: document.querySelector('.dicibox'),
        touchbox: document.querySelector('.touchbox'),
        shotbox: document.querySelector('.shotbox')
    };

    const wrapper = document.querySelector('.stat-contents-wrapper');
    const tap = document.querySelector('.stat-tap');

function showBox(targetKey) {
  Object.entries(boxMap).forEach(([key, box]) => {
    box.style.display = key === targetKey ? 'flex' : 'none';
  });

  const target = boxMap[targetKey];
  const newHeight = target.scrollHeight;

  // transition 제거하고 바로 높이 반영
  wrapper.style.transition = 'none';
  wrapper.style.height = newHeight + 'px';

  // 정확한 위치로 이동 (페이지 맨 위로 튕김 방지)
  const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: wrapperTop - 30,
    behavior: 'auto'  // 'smooth' 넣으면 자연스럽게 스르륵
  });
}
    // 초기 상태
    showBox('appbox');

    tap.addEventListener('click', function (e) {
        const item = e.target.closest('.stat-item');
        if (!item) return;
        const targetKey = item.dataset.target;
        if (targetKey && boxMap[targetKey]) {
            showBox(targetKey);
        }
    });
});




document.addEventListener("DOMContentLoaded", () => {
    // 모든 tapbox-1 요소 선택
    const tapboxes = document.querySelectorAll(".tapbox-1");

    tapboxes.forEach((tapbox) => {
        const tapText = tapbox.querySelector(".tap-text"); // .tapbox-1 내부의 .tap-text 요소 선택

        // hover 시 배경색 및 텍스트 색상 변경
        tapbox.addEventListener("mouseenter", () => {
            tapbox.style.backgroundColor = "rgba(24, 61, 213, 0.8)"; // hover 시 배경색
            if (tapText && !tapbox.classList.contains("active")) {
                tapText.style.color = "rgba(255, 255, 255, 1)"; // hover 시 텍스트 색상
            }
        });

        // hover 해제 시 배경색 및 텍스트 색상 복원
        tapbox.addEventListener("mouseleave", () => {
            if (!tapbox.classList.contains("active")) {
                tapbox.style.backgroundColor = "white"; // 기본 배경색 복원
                if (tapText) {
                    tapText.style.color = "rgba(0, 0, 0, 1)"; // 기본 텍스트 색상 복원
                }
            }
        });

        // 클릭 시 active 상태로 변경
        tapbox.addEventListener("click", () => {
            // 다른 모든 tapbox-1에서 active 클래스 제거 및 기본 스타일 복원
            tapboxes.forEach((box) => {
                box.classList.remove("active");
                box.style.backgroundColor = "white"; // 기본 배경색 복원
                const text = box.querySelector(".tap-text");
                if (text) text.style.color = "rgba(0, 0, 0, 1)"; // 기본 텍스트 색상 복원
            });

            // 클릭된 요소에 active 클래스 추가 및 스타일 업데이트
            tapbox.classList.add("active");
            tapbox.style.backgroundColor = "rgba(24, 61, 213, 1)"; // active 상태 배경색
            if (tapText) {
                tapText.style.color = "rgba(255, 255, 255, 1)"; // active 상태 텍스트 색상
            }
        });
    });
});
document.addEventListener("DOMContentLoaded", function () {
    const menus = [
        { box: ".league", menu: ".league-menu" },
        { box: ".seoson", menu: ".seosonmenu" }
    ];

    menus.forEach(({ box, menu }) => {
        const menuBox = document.querySelector(box);
        const menuElement = document.querySelector(menu);

        if (menuElement && menuBox) {
            menuElement.style.height = '0';

            menuBox.addEventListener('click', function () {
                // 해당 .league 또는 .seoson 내부에서 .league-v 선택
                const menuIcon = menuBox.querySelector(".league-v");

                // 다른 메뉴 닫기
                menus.forEach(({ menu: otherMenu, box: otherBox }) => {
                    if (otherMenu !== menu) {
                        document.querySelector(otherMenu).style.height = '0';
                        document.querySelector(otherMenu).classList.remove('active');
                        const otherBoxElement = document.querySelector(otherBox);
                        if (otherBoxElement) {
                            const otherIcon = otherBoxElement.querySelector(".league-v");
                            if (otherIcon) {
                                otherIcon.style.transform = 'rotate(0deg)';
                            }
                        }
                    }
                });

                if (menuElement.classList.contains('active')) {
                    menuElement.style.height = '0';
                    menuElement.classList.remove('active');
                    if (menuIcon) menuIcon.style.transform = 'rotate(0deg)';
                } else {
                    menuElement.style.height = menuElement.scrollHeight + 'px';
                    menuElement.classList.add('active');
                    if (menuIcon) menuIcon.style.transform = 'rotate(180deg)';
                }
            });
        }
    });
});
document.addEventListener("click", function (event) {
    const leagueBox = document.querySelector('.league');
    const leagueMenu = document.querySelector('.league-menu');
    const seosonBox = document.querySelector('.seoson');
    const seosonMenu = document.querySelector('.seosonmenu');

    if (leagueMenu && !leagueBox.contains(event.target) && !leagueMenu.contains(event.target)) {
        leagueMenu.classList.remove('active'); // 메뉴 닫기
    }
    if (seosonMenu && !seosonBox.contains(event.target) && !seosonMenu.contains(event.target)) {
        seosonMenu.classList.remove('active'); // 메뉴 닫기
    }
});

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
  
      try {
        const response = await fetch("player_info.json");
        const playerData = await response.json();
        console.log("✅ JSON 데이터:", playerData);
      
        const playerId = "cole_palmer";
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
    fetch("player_info.json")
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
    fetch("player_info.json")
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