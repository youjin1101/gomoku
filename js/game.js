
import {
    db,
    ref,
    onValue,
    runTransaction
} from "./firebase.js";

const BOARD_SIZE = 20;

let currentUid = null;
let currentSlot = null;
let currentCode = null;
let roomData = null;

let unsubscribe = null;

const canvas = document.getElementById("omokBoard");
const ctx = canvas.getContext("2d");

const CELL = 28;
const PADDING = 34;

// 20 x 20 빈 오목판 생성
function createEmptyBoard() {
    return Array.from(
        { length: BOARD_SIZE },
        () => Array(BOARD_SIZE).fill(0)
    );
}

// 오목판 그리기
function drawBoard(board) {
    ctx.clearRect(0, 0, 600, 600);

    // 배경
    ctx.fillStyle = "#e8c99c";
    ctx.fillRect(0, 0, 600, 600);

    // 가로, 세로 선
    ctx.strokeStyle = "#765b3c";
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
        const position = PADDING + i * CELL;

        ctx.beginPath();
        ctx.moveTo(PADDING, position);
        ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL, position);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(position, PADDING);
        ctx.lineTo(position, PADDING + (BOARD_SIZE - 1) * CELL);
        ctx.stroke();
    }

    // 돌 그리기
    board.forEach((row, y) => {
        row.forEach((stone, x) => {
            if (stone === 0) return;

            const px = PADDING + x * CELL;
            const py = PADDING + y * CELL;

            ctx.beginPath();
            ctx.arc(px, py, 11, 0, Math.PI * 2);

            ctx.fillStyle = stone === 1 ? "#222" : "#fff";
            ctx.fill();

            ctx.strokeStyle = stone === 1 ? "#111" : "#bbb";
            ctx.stroke();
        });
    });
}

// 플레이어 정보 표시
function renderPlayers(players) {
    const black = players?.black;
    const white = players?.white;

    const blackElement = document.getElementById("blackPlayer");
    const whiteElement = document.getElementById("whitePlayer");

    blackElement.querySelector(".player-avatar").textContent =
        black?.avatar || "⚫";

    blackElement.querySelector(".player-nickname").textContent =
        black?.nickname || "대기 중";

    whiteElement.querySelector(".player-avatar").textContent =
        white?.avatar || "⚪";

    whiteElement.querySelector(".player-nickname").textContent =
        white?.nickname || "대기 중";
}

// 게임 상태 표시
function renderGame(game, players) {
    if (!game) return;

    const status = document.getElementById("gameStatus");
    const turnMessage = document.getElementById("turnMessage");

    if (game.status === "waiting") {
        status.textContent = "친구가 접속하기를 기다리는 중...";
        turnMessage.textContent = "친구에게 초대 코드를 공유해 주세요.";
    } else if (game.status === "finished") {
        const winnerName =
            players?.[game.winner]?.nickname || "플레이어";

        status.textContent = `${winnerName} 승리!`;
        turnMessage.textContent = "게임이 종료되었습니다.";
    } else {
        const turnName =
            players?.[game.turn]?.nickname || "플레이어";

        status.textContent = `${turnName}의 차례입니다.`;

        if (game.turn === currentSlot) {
            turnMessage.textContent = "당신의 차례입니다!";
        } else {
            turnMessage.textContent = "상대방의 차례입니다.";
        }
    }

    drawBoard(game.board);
}

// 게임방 데이터 감시
function listenToRoom() {
    const roomRef = ref(db, `matches/${currentCode}`);

    if (unsubscribe) {
        unsubscribe();
    }

    unsubscribe = onValue(roomRef, (snapshot) => {
        roomData = snapshot.val();

        if (!roomData) return;

        renderPlayers(roomData.players);
        renderGame(roomData.game, roomData.players);
    });
}

// 게임방 입장
export async function joinMatch(code, profile, uid) {
    currentCode = code;
    currentUid = uid;

    const playersRef = ref(db, `matches/${code}/players`);

    // 흑돌 또는 백돌 자리 배정
    const result = await runTransaction(
        playersRef,
        (players) => {
            players = players || {};

            // 기존 플레이어 재접속
            if (players.black?.uid === uid) {
                players.black = profile;
                return players;
            }

            if (players.white?.uid === uid) {
                players.white = profile;
                return players;
            }

            // 빈 자리 찾기
            if (!players.black) {
                players.black = profile;
                return players;
            }

            if (!players.white) {
                players.white = profile;
                return players;
            }

            // 두 자리가 모두 차 있으면 입장 거부
            return;
        }
    );

    if (!result.committed) {
        throw new Error("게임에 참여할 수 없습니다. 이미 두 명이 입장했습니다.");
    }

    const players = result.snapshot.val();

    if (players.black?.uid === uid) {
        currentSlot = "black";
    } else if (players.white?.uid === uid) {
        currentSlot = "white";
    } else {
        throw new Error("플레이어 자리를 확인할 수 없습니다.");
    }

    // 게임 데이터 최초 생성
    const gameRef = ref(db, `matches/${code}/game`);

    await runTransaction(gameRef, (game) => {
        if (game) return game;

        return {
            board: createEmptyBoard(),
            turn: "black",
            status: "waiting",
            winner: null
        };
    });

    // 두 명이 모두 입장하면 게임 시작
    if (players.black && players.white) {
        await runTransaction(gameRef, (game) => {
            if (!game || game.status !== "waiting") return game;

            return {
                ...game,
                status: "playing"
            };
        });
    }

    // 실시간 데이터 감시
    listenToRoom();
}

// 승리 판정
function checkWinner(board, x, y, stone) {
    const directions = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];

    for (const [dx, dy] of directions) {
        let count = 1;

        for (const sign of [1, -1]) {
            let nx = x + dx * sign;
            let ny = y + dy * sign;

            while (
                nx >= 0 && nx < BOARD_SIZE &&
                ny >= 0 && ny < BOARD_SIZE &&
                board[ny][nx] === stone
            ) {
                count++;
                nx += dx * sign;
                ny += dy * sign;
            }
        }

        if (count >= 5) return true;
    }

    return false;
}

// 오목판 클릭
canvas.addEventListener("click", async (event) => {
    if (!currentSlot || !currentCode || !roomData?.game) return;

    const game = roomData.game;

    if (game.status !== "playing") return;
    if (game.turn !== currentSlot) return;

    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    const x = Math.round((mouseX - PADDING) / CELL);
    const y = Math.round((mouseY - PADDING) / CELL);

    if (
        x < 0 || x >= BOARD_SIZE ||
        y < 0 || y >= BOARD_SIZE
    ) return;

    const stone = currentSlot === "black" ? 1 : 2;

    const gameRef = ref(db, `matches/${currentCode}/game`);

    // 트랜잭션으로 중복 착수와 차례 변경을 검사
    const result = await runTransaction(gameRef, (currentGame) => {
        if (!currentGame || currentGame.status !== "playing") {
            return;
        }

        if (currentGame.turn !== currentSlot) {
            return;
        }

        if (currentGame.board[y][x] !== 0) {
            return;
        }

        const newBoard = currentGame.board.map(row => [...row]);

        newBoard[y][x] = stone;

        const won = checkWinner(newBoard, x, y, stone);

        return {
            ...currentGame,
            board: newBoard,
            turn: won
                ? currentSlot
                : currentSlot === "black" ? "white" : "black",
            status: won ? "finished" : "playing",
            winner: won ? currentSlot : null
        };
    });

    if (!result.committed) {
        document.getElementById("gameMessage").textContent =
            "착수할 수 없습니다. 차례나 위치를 확인해 주세요.";
    } else {
        document.getElementById("gameMessage").textContent = "";
    }
});
