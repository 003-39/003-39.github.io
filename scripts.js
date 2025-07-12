
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

