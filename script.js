let playerId = null;
let seasonYear = '2024';

const DEFAULT_COMPETITION_ID = 8; // 기본 대회: 프리미어리그
window.competitionId = DEFAULT_COMPETITION_ID;

const API_BASE = 'https://zero03-39-github-io.onrender.com';
const DB_BASE = API_BASE; // same origin for DB routes
const LIVE_SEASON = '2025'; // Only this season hits external PL API

window.refreshStats = async function(y) {
  if (!window.playerId || !y) return;
  try {
    let res;
    const compId = Number(window.competitionId ?? DEFAULT_COMPETITION_ID) || DEFAULT_COMPETITION_ID;
    if (String(y) === LIVE_SEASON) {
      // Live season → Pulselive proxy
      res = await fetch(`${API_BASE}/api/player/${window.playerId}?season=${y}&competition_id=${compId}`);
    } else {
      // Past seasons → MySQL (EAV flattened on server)
      res = await fetch(`${DB_BASE}/db/stats?player_id=${window.playerId}&season=${y}&competition_id=${compId}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    // Allow both {stats:{}} or flat {}
    const stats = payload?.stats || payload || {};

    // 1) Fill direct mapped fields
    document.querySelectorAll('[data-name]').forEach(el => {
      const key = el.getAttribute('data-name');
      if (key in stats) el.textContent = String(stats[key]);
    });

    // 2) Compute & fill derived fields (kept from previous logic)
    const setValue = (element, value) => {
      const span = element.querySelector("span");
      if (span) span.textContent = value; else element.textContent = value;
    };
    const targetElements = document.querySelectorAll(
      ".apptext-2, .directiontext, .success-text-2, .touchtext-3, .card-text, .completion-text, .foul-text-1, .goal-text-3, .spot-text, .freetext-1, .score-text"
    );
    targetElements.forEach((element) => {
      const name = element.getAttribute("data-name");
      if (!name) return;
      if (stats[name] !== undefined) {
        setValue(element, stats[name]);
        return;
      }
      const safeDiv = (a, b) => Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? (a / b) : 0;
      if (name === "goal_per_match") {
        const goals = Number(stats["goals"] ?? 0);
        const apps  = Number(stats["gamesPlayed"] ?? 0);
        setValue(element, safeDiv(goals, Math.max(apps,1)).toFixed(2));
      } else if (name === "minutes_per_goal") {
        const mins  = Number(stats["timePlayed"] ?? 0);
        const goals = Number(stats["goals"] ?? 0);
        setValue(element, goals > 0 ? Math.round(mins / goals).toString() : "0");
      } else if (name === "tackles_won_total") {
        const won   = Number(stats["tacklesWon"] ?? 0);
        const total = Number(stats["totalTackles"] ?? 0);
        setValue(element, `${won}/${total}`);
      } else if (name === "duel_won_lost") {
        const won  = Number(stats["duelsWon"] ?? 0);
        const lost = Number(stats["duelsLost"] ?? 0);
        setValue(element, `${won}/${lost}`);
      } else if (name === "obox-rate") {
        const obox  = Number(stats["shotsOnTargetOutsideBox"] ?? 0);
        const total = Number(stats["totalShots"] ?? 0);
        setValue(element, Math.round(safeDiv(obox, Math.max(total,1)) * 100) + "%");
      } else if (name === "shotsOnTargetRate") {
        const on   = Number(stats["shotsOnTargetIncGoals"] ?? 0);
        const tot  = Number(stats["totalShots"] ?? 0);
        setValue(element, Math.round(safeDiv(on, Math.max(tot,1)) * 100) + "%");
      } else if (name === "inbox-rate") {
        const ibox = Number(stats["shotsOnTargetInBox"] ?? 0);
        const tot  = Number(stats["totalShots"] ?? 0);
        setValue(element, Math.round(safeDiv(ibox, Math.max(tot,1)) * 100) + "%");
      } else if (name === "long_pass_sucsess") {
        const suc   = Number(stats["successfulLongPasses"] ?? 0);
        const fail  = Number(stats["unsuccessfulLongPasses"] ?? 0);
        const total = suc + fail;
        setValue(element, Math.round(safeDiv(suc, Math.max(total,1)) * 100) + "%");
      } else if (name === "pass_complecation") {
        const suc   = Number(stats["successfulShortPasses"] ?? 0) + Number(stats["successfulLongPasses"] ?? 0);
        const total = Number(stats["totalPasses"] ?? 0);
        setValue(element, Math.round(safeDiv(suc, Math.max(total,1)) * 100) + "%");
      }
    });
  } catch (e) {
    console.error('stats fetch failed:', e.message);
  }
};


    	// 초기 스케일링 적용
	applyInitialScaling();
	
	// 첫 화면 스케일 조정 강화
	setTimeout(() => {
		applyInitialScaling();
	}, 100);
	
	// 리사이즈 시에도 스케일링 적용
	window.addEventListener('resize', applyInitialScaling);
	
	// 이미지 리사이징 함수 추가
	forceImageResize();
	
	// 1. 쿼리에서 player=pedro_neto 파싱
    const urlParams = new URLSearchParams(window.location.search);
    const playerName = urlParams.get("player"); // 예: "pedro_neto"
    // Parse optional comp param and set window.competitionId
    const compParam = urlParams.get("comp");
    if (compParam && /^(\d+)$/.test(compParam)) {
      window.competitionId = Number(compParam);
    }
    if (!playerName) {
      console.error("❌ player 쿼리 없음");
      console.log("💡 올바른 URL 예시: ?player=pedro_neto");
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
    window.playerId = matchedPlayer.id;

    // 4. player_info.json에서 추가 정보 매핑
    const infoRes = await fetch("json/player_info.json");
    const infoData = await infoRes.json();
    const info = infoData[playerName]; // playerId 대신 playerName 사용

    if (!info) {
      console.error("❌ player_info.json에 해당 ID 정보 없음");
      return;
    }




// ---- 시즌 메뉴 렌더 + 클릭 이벤트 바인딩 ----
function renderSeasonMenu(labels) {
  const menu = document.getElementById('season-menu');
  const labelEl = document.getElementById('season-label');
  if (!menu || !labelEl) return;

  // 선수별 시즌 개수/텍스트로 메뉴 생성
  menu.innerHTML = labels.map(l => {
    const y = l.slice(0,4);
    return `
      <div class="ssmenu" data-season="${y}">
        <div class="ssmenu-text">${l}</div>
        <svg class="ssmenu-1"><rect class="ssmenu-1" rx="0" ry="0" width="131" height="32" /></svg>
      </div>
    `;
  }).join('');

  // 기본 선택: 2025/26 있으면 그걸, 없으면 최신 라벨, 아무것도 없으면 2025/26
  if (labels.length) {
    const has2025 = labels.some(l => l.startsWith('2025/'));
    const firstLabel = has2025 ? '2025/26' : labels[0];
    labelEl.textContent = firstLabel;
    window.seasonYear = firstLabel.slice(0,4);
  } else {
    labelEl.textContent = '2025/26';
    window.seasonYear = '2025';
  }

  // 클릭 시: 라벨/연도 업데이트 → 스탯 다시 로드
  menu.querySelectorAll('.ssmenu').forEach(item => {
    item.addEventListener('click', () => {
      const y = item.dataset.season; // "2025" 같은 4자리
      const t = item.querySelector('.ssmenu-text')?.textContent?.trim();
      if (y) window.seasonYear = y;
      if (t) labelEl.textContent = t;
      if (typeof refreshStats === 'function') refreshStats(window.seasonYear);
    });
  });
}



    // ▶ 이름, 등번호, 이미지
    // playerID.json에서 선수 정보 가져오기
    let firstName = "Unknown";
    let lastName = "Unknown";
    let shirtNum = "";
    
    // playerID.json에서 선수 정보 찾기
    try {
      const playerIDResponse = await fetch('./json/playerID.json');
      const playerIDData = await playerIDResponse.json();
      
      // URL의 player 파라미터로 선수 찾기
      const playerParam = new URLSearchParams(window.location.search).get('player');
      const playerInfo = playerIDData.find(p => p.name === playerParam);
      
      if (playerInfo) {
        // 이름 분리 (robert_sanchez → Robert Sanchez)
        const nameParts = playerInfo.name.split('_');
        firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
        lastName = nameParts.slice(1).map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join(' ');
        
        // 등번호
        shirtNum = playerInfo.shirtNum || "";
        
        console.log("✅ playerID.json에서 정보 로드:", { firstName, lastName, shirtNum });
      } else {
        console.log("⚠️ playerID.json에서 선수 정보를 찾을 수 없음:", playerParam);
      }
    } catch (error) {
      console.error("❌ playerID.json 로드 실패:", error);
    }
    
    // 화면에 표시
    document.querySelector(".first-name").textContent = firstName;
    document.querySelector(".number").textContent = `${lastName} ${shirtNum}`;
    
    // main-image는 별도로 설정 (현재는 placeholder 유지)
    // document.getElementById("main-image").src = "별도_이미지_경로";
    
    // info-img에 player_info.json의 이미지 설정
    const infoImg = document.getElementById("info-img");
    if (infoImg) {
      const imgElement = infoImg.querySelector("img");
      if (imgElement) {
        imgElement.src = info.image || "image/placeholder.png";
        console.log("✅ info-img src 설정 완료:", imgElement.src);
      } else {
        console.log("❌ info-img 내부 img 요소를 찾을 수 없습니다");
      }
    }

    const mainImg = document.getElementById("main-image");
    console.log("🔍 main-image 요소:", mainImg);
    console.log("🔍 mainImage 경로:", info.mainImage);
    if (mainImg) {
      mainImg.src = info.mainImage || "image/placeholder.png";
      console.log("✅ main-image src 설정 완료:", mainImg.src);
    } else {
      console.log("❌ main-image 요소를 찾을 수 없습니다");
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

    	// ---- 초기 스케일링 적용 ----
	
	// 페이지 로드 시 스케일링 적용 (CSS 우선)
	function applyInitialScaling() {
		// CSS 미디어 쿼리로 스케일링 처리되므로 JavaScript는 비활성화
		console.log('📏 CSS 미디어 쿼리로 스케일링 처리됨');
		
		// 브라우저 호환성을 위한 기본 설정만 유지
		const viewportWidth = window.innerWidth;
		if (viewportWidth < 1280) {
			document.body.style.width = '1280px';
			console.log('📱 모바일 화면 감지: body 너비 1280px로 설정');
		}
		
		// CSS에서 스케일링 처리하므로 JavaScript에서는 제거
		
		// margin-left 강제 제거
		document.documentElement.style.marginLeft = '0px';
		document.body.style.marginLeft = '0px';
		console.log('🚫 margin-left 강제 제거 완료');
	}
	
	// ---- 시즌 메뉴 생성 및 초기 스탯 로드 ----
	
	// 시즌 탐색 함수 정의
    async function discoverSeasons(playerId) {
      // 1) Try DB: expect an array of years e.g., [2024,2023,...]
      try {
        const r = await fetch(`${DB_BASE}/db/seasons?player_id=${playerId}`);
        if (r.ok) {
          const years = await r.json();
          if (Array.isArray(years)) {
            const labels = years
              .sort((a,b) => b - a)
              .map(y => `${y}/${String((y + 1) % 100).padStart(2, '0')}`);
            // Ensure LIVE_SEASON is present for UI even if DB doesn't have it yet
            if (!years.includes(Number(LIVE_SEASON))) {
              labels.unshift(`${LIVE_SEASON}/${String((Number(LIVE_SEASON) + 1) % 100).padStart(2, '0')}`);
            }
            return labels;
          }
        }
      } catch (e) {
        console.warn('DB seasons lookup failed, fallback to API probe:', e.message);
      }
      // 2) Fallback: probe API around LIVE_SEASON only (narrow range)
      return await discoverSeasonsByApi(playerId, {
        startYear: Number(LIVE_SEASON),
        minYear: Number(LIVE_SEASON) - 1,
        pauseMs: 120,
        requireNonEmptyStats: true
      });
    }

    // 시즌 탐색 함수 정의 (API fallback)
    async function discoverSeasonsByApi(playerId, {
      startYear = 2024,     // 기본 2024부터
      minYear   = 2010,     // 너무 과거로 안내려가게 가드
      pauseMs   = 120,      // 호출 간 간격 (레이트리밋 예방)
      requireNonEmptyStats = true // 200이어도 stats 비면 stop
    } = {}) {
      const labels = [];
      let consecutive404Count = 0; // 연속 404 카운트
      const maxConsecutive404 = 2; // 최대 연속 404 허용 횟수
      console.log(`🔍 시즌 탐색 시작: ${startYear} → ${minYear}`);
      
      for (let y = startYear; y >= minYear; y--) {
        const url = `${API_BASE}/api/player/${playerId}?season=${y}`;
        console.log(`🔍 ${y} 시즌 확인 중: ${url}`);
        
        let res;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            console.log(`🔄 ${y} 시즌 시도 ${retryCount + 1}/${maxRetries}`);
            res = await fetch(url);
            console.log(`📡 ${y} 시즌 응답 상태: ${res.status}`);
            break; // 성공하면 while 루프 탈출
          } catch (e) {
            retryCount++;
            console.warn(`❌ ${y} 시즌 fetch error (${retryCount}/${maxRetries}):`, e.message);
            
            if (retryCount >= maxRetries) {
              console.error(`💥 ${y} 시즌 최대 재시도 횟수 초과, 다음 시즌으로`);
              break; // 최대 재시도 횟수 초과 시 다음 시즌으로
            }
            
            // 잠시 대기 후 재시도
            console.log(`⏳ ${y} 시즌 재시도 전 1초 대기...`);
            await new Promise(r => setTimeout(r, 1000));
          }
        }
        
        // 재시도 실패 시 다음 시즌으로
        if (retryCount >= maxRetries) {
          continue;
        }

        if (res.status === 200 || res.status === 304) {
          let json = {};
          try { 
            json = await res.json(); 
            console.log(`📊 ${y} 시즌 stats 키 개수:`, Object.keys(json?.stats || {}).length);
          } catch (e) {
            console.warn(`❌ ${y} 시즌 JSON 파싱 실패:`, e.message);
            // 304인 경우 빈 객체로 처리
            if (res.status === 304) {
              json = {};
            }
          }
          
          const stats = json?.stats || {};
          const keyCount = Object.keys(stats).length;
          
          // 완전히 빈 데이터만 제외
          const hasData = keyCount > 0;
          console.log(`📊 ${y} 시즌 stats 키 개수: ${keyCount}, 데이터 존재: ${hasData}`);
          
          if (!hasData) {
            console.log(`⏹️ ${y} 시즌 완전히 빈 데이터, 탐색 중단`);
            break;
          }
          
          // 키가 5개 이하는 "없는 시즌"으로 간주
          if (keyCount <= 5) {
            console.log(`⚠️ ${y} 시즌 키 개수 부족 (${keyCount}개), 없는 시즌으로 간주`);
            // 키 개수 적은 시즌은 추가하지 않고, 한 시즌만 더 확인
          }
          
          // 키가 6개 이상인 경우에만 추가
          if (keyCount > 5) {
            const label = `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
            
            // 중복 방지: 이미 추가된 시즌은 다시 추가하지 않음
            if (!labels.includes(label)) {
              labels.push(label);
              console.log(`✅ ${y} 시즌 추가됨: ${label}`);
            } else {
              console.log(`⚠️ ${y} 시즌 이미 추가됨: ${label}`);
            }
          }
        } else if (res.status === 404 || res.status === 204) {
          consecutive404Count++;
          console.log(`⚠️ ${y} 시즌 없음 (${res.status}), 연속 404: ${consecutive404Count}/${maxConsecutive404}`);
          
          // 연속 404가 최대 허용 횟수를 초과하면 중단
          if (consecutive404Count >= maxConsecutive404) {
            console.log(`⏹️ 연속 404 최대 허용 횟수 초과 (${maxConsecutive404}), 탐색 중단`);
            break;
          }
        } else {
          // 200/304 등 정상 응답이면 404 카운트 리셋
          consecutive404Count = 0;
        }

        if (pauseMs) {
          console.log(`⏳ ${pauseMs}ms 대기 중...`);
          await new Promise(r => setTimeout(r, pauseMs));
        }
      }
      
      console.log(`🎯 최종 발견된 시즌들:`, labels);
      return labels;
    }

    try {
      console.log("🚀 시즌 탐색 시작...");
      console.log("🔍 API 서버:", API_BASE);
      console.log("🔍 선수 ID:", playerId);
      
      const seasonLabels = await discoverSeasons(playerId);
      const finalLabels = seasonLabels.length ? seasonLabels : ['2024/25'];
      console.log("📋 발견된 시즌들:", finalLabels);
      
      renderSeasonMenu(finalLabels);
      
      // 초기 스탯 로드 (한 번만)
      const initialSeason = window.seasonYear || LIVE_SEASON;
      refreshStats(initialSeason);
    } catch (error) {
      console.error("시즌 메뉴 생성 실패:", error);
      // 기본값으로 설정
      renderSeasonMenu(['2024/25']);
      refreshStats('2024');
    }


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

// 9. 이미지 리사이징 강제 적용 함수
function forceImageResize() {
	const mainImg = document.querySelector('.main-img');
	if (mainImg) {
		// 이미지 크기 강제 업데이트
		mainImg.style.width = '100%';
		mainImg.style.height = '100%';
		
		// 리사이즈 이벤트 리스너 추가
		window.addEventListener('resize', () => {
			forceImageResize();
		});
		
		console.log('✅ 이미지 리사이징 함수 설정 완료');
	}
}