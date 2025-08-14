// 1. 선수 데이터 로드
async function loadPlayers() {
    try {
        // playerID.json에서 선수 목록 가져오기
        const playersResponse = await fetch('../json/playerID.json');
        const players = await playersResponse.json();
        
        // player_info.json에서 추가 정보 가져오기
        const infoResponse = await fetch('../json/player_info.json');
        const playerInfo = await infoResponse.json();
        
        // 2. 선수 카드 생성 (3열 그리드 유지)
        const container = document.getElementById('players-container');
        
        // 3개씩 그룹으로 나누어 그리드 생성 (기존 #aav와 동일한 구조)
        for (let i = 0; i < players.length; i += 3) {
            const row = document.createElement('div');
            row.id = `aav-${Math.floor(i/3)}`; // 기존 aav와 동일한 ID 패턴
            
            // 현재 행의 3개 선수 처리
            for (let j = 0; j < 3 && (i + j) < players.length; j++) {
                const player = players[i + j];
                const card = createPlayerCard(player, playerInfo);
                row.appendChild(card);
            }
            
            container.appendChild(row);
        }
        
        console.log(`✅ ${players.length}명의 선수 카드 생성 완료`);
        
    } catch (error) {
        console.error('❌ 선수 데이터 로드 실패:', error);
        // 에러 시 기본 카드 표시
        const container = document.getElementById('players-container');
        container.innerHTML = '<div class="error">선수 정보를 불러올 수 없습니다.</div>';
    }
}

// 3. 선수 카드 HTML 생성
function createPlayerCard(player, playerInfo) {
    const card = document.createElement('div');
    card.className = 'card';
    
    // 선수 이름에서 firstName, lastName 추출
    const nameParts = player.name.split('_');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // player_info.json에서 추가 정보 가져오기
    const info = playerInfo[player.name] || {};
    const shirtNum = info.shirtNum || '';
    
    card.innerHTML = `
        <div class="player-image-container"> 
            <img class="player-image" src="image/${player.name}.png" />
        </div>
        <svg class="accent-line">
            <rect height="0.49" id="accent-line" rx="0" ry="0" width="312.588" x="0" y="0">
            </rect>
        </svg>
        <div class="number">
            <span>${shirtNum}</span>
        </div>
        <div class="name">
            <span>${firstName.toUpperCase()} </span><br/><span style="font-size:51px;">${lastName.toUpperCase()}</span>
        </div>
        <div class="player-stats">
            <div class="stat">
              <span class="label">APPEARANCE</span>
              <span class="value">0</span>
            </div>
            <div class="stat">
              <span class="label">GOALS</span>
              <span class="value">0</span>
            </div>
            <div class="stat">
              <span class="label">ASSISTS</span>
              <span class="value">0</span>
            </div>
          </div>
        <img class="flag-icon" src="image/${getNationality(player.name)}.png" srcset="image/${getNationality(player.name)}.png 1x, image/${getNationality(player.name)}@2x.png 2x"/>
    `;
    
    // 4. 클릭 이벤트 추가 (개별 선수 페이지로 이동)
    card.addEventListener('click', () => {
        window.location.href = `../?player=${player.name}`;
    });
    
    return card;
}

// 5. 국적 매핑 함수 (이미지 파일명에 맞춤)
function getNationality(playerName) {
    const nationalityMap = {
        'robert_sanchez': 'spain',
        'filp_jorgensen': 'denmark',
        'gaga_slonina': 'usa',
        'marc_cucurella': 'spain',
        'tosin_adarabioyo': 'eng',
        'benoit_badiashile': 'fr',
        'levi_colwill': 'eng',
        'trevoh_chalobah': 'eng',
        'reece_james': 'eng',
        'malo_gusto': 'fr',
        'wesley_fofana': 'fr',
        'josh_acheampong': 'eng',
        'mamadu_sarr': 'fr',
        'enzo_fernandez': 'arg',
        'mykhilo_mudyrk': 'ukr',
        'kiernan_dewsburry-hall': 'eng',
        'moises_caicedo': 'eqd',
        'omary_kellyman': 'eng',
        'mathis_amougou': 'fr',
        'dario_essugo': 'portugal',
        'andrey_santos': 'brazil',
        'joao_pedro': 'brazil',
        'noni_madueke': 'eng',
        'nicolas_jackson': 'senegal',
        'christopher_nkunku': 'fr',
        'tyrique_george': 'eng',
        'marc_guiu': 'spain',
        'liam_delap': 'eng',
        'cole_palmer': 'eng',
        'pedro_neto': 'portugal'
    };
    
    return nationalityMap[playerName] || 'eng'; // 기본값은 영국
}

// 6. 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 선수 목록 페이지 로드 시작');
    loadPlayers();
});