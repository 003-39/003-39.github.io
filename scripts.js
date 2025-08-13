
document.addEventListener("DOMContentLoaded", () => {
    // 1. 뷰 스케일링
    const scaleViewToFit = () => {
        // #template을 먼저 찾고, 없으면 body 사용
        let view = document.querySelector("#template");
        if (!view) {
            view = document.body;
            console.log("⚠️ #template을 찾을 수 없어 body에 스케일링 적용");
        }

        console.log("🔍 스케일링 시작");
        console.log("뷰포트 크기:", window.innerWidth, "x", window.innerHeight);
        console.log("요소 크기:", view.offsetWidth, "x", view.offsetHeight);

        // 요소가 로드되었는지 확인
        if (view.offsetWidth === 0) {
            console.log("⚠️ 요소 크기가 0입니다. 잠시 후 다시 시도합니다.");
            setTimeout(scaleViewToFit, 100);
            return;
        }

        const scale = window.innerWidth / view.offsetWidth;
        console.log("계산된 스케일:", scale);

        // 스케일이 너무 작거나 크지 않도록 제한
        const clampedScale = Math.min(Math.max(scale, 0.5), 2.0);
        console.log("제한된 스케일:", clampedScale);

        view.style.transform = `scale(${clampedScale})`;
        view.style.transformOrigin = "top left";
        view.style.marginLeft = `${(window.innerWidth - view.offsetWidth * clampedScale) / 2}px`;
        
        console.log("✅ 스케일링 완료:", clampedScale);
    };

    // 초기 스케일링 (약간 지연)
    setTimeout(scaleViewToFit, 100);
    window.addEventListener("resize", scaleViewToFit);

    // 2. 아코디언 기능
    document.querySelectorAll(".ac-header").forEach((header) => {
        header.addEventListener("click", () => {
            const expanded = header.getAttribute("aria-expanded") === "true";
            header.setAttribute("aria-expanded", !expanded);

            const body = document.getElementById(header.getAttribute("aria-controls"));
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

    // 3. 통계 탭 기능
    const boxMap = {
        appbox: document.querySelector('.appbox'),
        passbox: document.querySelector('.passbox'),
        dicibox: document.querySelector('.dicibox'),
        touchbox: document.querySelector('.touchbox'),
        shotbox: document.querySelector('.shotbox')
    };

    const wrapper = document.querySelector('.stat-contents-wrapper');
    const tap = document.querySelector('.stat-tap');

    if (wrapper && tap) {
        const showBox = (targetKey) => {
            Object.entries(boxMap).forEach(([key, box]) => {
                if (box) {
                    box.style.display = key === targetKey ? 'flex' : 'none';
                }
            });

            const targetBox = boxMap[targetKey];
            if (targetBox) {
                const newHeight = targetBox.scrollHeight;
                wrapper.style.transition = 'none';
                wrapper.style.height = newHeight + 'px';

                const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: wrapperTop - 30, behavior: 'auto' });
            }
        };

        // 초기 상태 설정
        if (boxMap.appbox) {
            showBox('appbox');
        }

        tap.addEventListener('click', (e) => {
            const targetKey = e.target.closest('.stat-item')?.dataset.target;
            if (targetKey && boxMap[targetKey]) {
                showBox(targetKey);
            }
        });
    }

    // 4. 탭박스 스타일링
    const tapboxes = document.querySelectorAll(".tapbox-1");
    tapboxes.forEach((tapbox) => {
        const tapText = tapbox.querySelector(".tap-text");

        const updateStyle = (isActive, isHover = false) => {
            const bgColor = isActive ? "rgba(24, 61, 213, 1)" : 
                           isHover ? "rgba(24, 61, 213, 0.8)" : "white";
            const textColor = (isActive || isHover) ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 1)";
            
            tapbox.style.backgroundColor = bgColor;
            if (tapText) {
                tapText.style.color = textColor;
            }
        };

        tapbox.addEventListener("mouseenter", () => updateStyle(false, true));
        tapbox.addEventListener("mouseleave", () => updateStyle(tapbox.classList.contains("active")));
        tapbox.addEventListener("click", () => {
            tapboxes.forEach(box => {
                box.classList.remove("active");
                updateStyle.call(box, false);
            });
            tapbox.classList.add("active");
            updateStyle.call(tapbox, true);
        });
    });

    // 5. 드롭다운 메뉴
    const menus = [
        { box: ".league", menu: ".league-menu" },
        { box: ".seoson", menu: ".seosonmenu" }
    ];

    menus.forEach(({ box, menu }) => {
        const menuBox = document.querySelector(box);
        const menuElement = document.querySelector(menu);
        
        if (menuElement && menuBox) {
            const menuIcon = menuBox.querySelector(".league-v");
            menuElement.style.height = '0';

            menuBox.addEventListener('click', () => {
                // 다른 메뉴 닫기
                menus.forEach(({ menu: otherMenu, box: otherBox }) => {
                    if (otherMenu !== menu) {
                        const otherMenuEl = document.querySelector(otherMenu);
                        const otherBoxEl = document.querySelector(otherBox);
                        if (otherMenuEl && otherBoxEl) {
                            otherMenuEl.style.height = '0';
                            otherMenuEl.classList.remove('active');
                            const otherIcon = otherBoxEl.querySelector(".league-v");
                            if (otherIcon) {
                                otherIcon.style.transform = 'rotate(0deg)';
                            }
                        }
                    }
                });

                const isActive = menuElement.classList.contains('active');
                if (isActive) {
                    menuElement.style.height = '0';
                    menuElement.classList.remove('active');
                    if (menuIcon) {
                        menuIcon.style.transform = 'rotate(0deg)';
                    }
                } else {
                    menuElement.style.height = menuElement.scrollHeight + 'px';
                    menuElement.classList.add('active');
                    if (menuIcon) {
                        menuIcon.style.transform = 'rotate(180deg)';
                    }
                }
            });
        }
    });
});

// 6. 외부 클릭 시 메뉴 닫기
document.addEventListener("click", (event) => {
    const leagueBox = document.querySelector('.league');
    const leagueMenu = document.querySelector('.league-menu');
    const seosonBox = document.querySelector('.seoson');
    const seosonMenu = document.querySelector('.seosonmenu');

    if (leagueMenu && leagueBox && !leagueBox.contains(event.target) && !leagueMenu.contains(event.target)) {
        leagueMenu.classList.remove('active');
    }
    if (seosonMenu && seosonBox && !seosonBox.contains(event.target) && !seosonMenu.contains(event.target)) {
        seosonMenu.classList.remove('active');
    }
});