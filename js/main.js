
import {
    auth,
    signInAnonymously
} from "./firebase.js";

import { joinMatch } from "./game.js";

const loginForm = document.getElementById("loginForm");

const loginScreen = document.getElementById("loginScreen");
const gameScreen = document.getElementById("gameScreen");

const avatarButtons = document.querySelectorAll(".avatar");

let selectedAvatar = "🐱";

// 프로필 아이콘 선택
avatarButtons.forEach((button) => {
    button.addEventListener("click", () => {
        avatarButtons.forEach((item) => {
            item.classList.remove("selected");
        });

        button.classList.add("selected");

        selectedAvatar = button.dataset.avatar;
    });
});

// 로그인 및 게임 입장
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const inviteCode = document
        .getElementById("inviteCode")
        .value.trim();

    const nickname = document
        .getElementById("nickname")
        .value.trim();

    const message = document.getElementById("loginMessage");

    if (inviteCode.length < 20) {
        message.textContent = "초대 코드를 20자 이상 입력해 주세요.";
        return;
    }

    if (!nickname) {
        message.textContent = "닉네임을 입력해 주세요.";
        return;
    }

    // Firebase 데이터베이스 경로에 사용할 수 있는 문자만 허용
    if (!/^[a-zA-Z0-9_-]+$/.test(inviteCode)) {
        message.textContent =
            "초대 코드는 영문, 숫자, - 또는 _만 사용할 수 있습니다.";
        return;
    }

    const enterButton = loginForm.querySelector(".enter-button");

    enterButton.disabled = true;
    enterButton.textContent = "입장 중...";

    message.textContent = "";

    try {
        // Firebase 익명 로그인
        const user = auth.currentUser ||
            (await signInAnonymously(auth)).user;

        const uid = user.uid;
        // 플레이어 프로필
        const profile = {
            uid: uid,
            nickname: nickname,
            avatar: selectedAvatar
        };

        // 게임 입장
        await joinMatch(inviteCode, profile, uid);

        // 로그인 화면 숨기기
        loginScreen.classList.add("hidden");

        // 게임 화면 표시
        gameScreen.classList.remove("hidden");

    } catch (error) {
        console.error("게임 입장 오류:", error);

        message.textContent =
            error.message || "게임 입장에 실패했습니다.";

    } finally {
        enterButton.disabled = false;
        enterButton.textContent = "게임 입장하기";
    }
});
