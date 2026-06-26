
document.addEventListener('DOMContentLoaded', () => {
    const cells = Array.from(document.querySelectorAll('.cell'));
    const boardEl = document.querySelector('.board');
    const menuPanel = document.querySelector('.menu-panel');
    const botBtn = document.getElementById('play-bot');
    const friendBtn = document.getElementById('play-friend');

    const controls = document.getElementById('controls');
    const difficultyContainer = document.getElementById('difficulty-container');
    const difficultySelect = document.getElementById('difficulty');
    const themeButtons = Array.from(document.querySelectorAll('.theme-button'));
    const scoreP1El = document.getElementById('score-p1');
    let scoreP2El = document.getElementById('score-p2');
    const scoreP2Label = document.getElementById('score-p2-label');
    const playAgainBtn = document.getElementById('play-again');
    const backMenuBtn = document.getElementById('back-menu');
    const boardMessage = document.getElementById('board-message');
    const settingsBtn = document.getElementById('settings-button');
    const settingsClose = document.getElementById('settings-close');
    const settingsPanel = document.getElementById('settings-panel');

    const ROWS = 6;
    const COLS = 7;
    let board = [];
    let mode = null; // 'bot' or 'friend'
    let gameOver = false;
    let isBotThinking = false;

    let scores = { p1: 0, p2: 0 };
    let friendTurn = 1; // for friend mode turn tracking

    function initBoard() {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        cells.forEach((cell, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.classList.remove('red', 'yellow', 'column-hover');
            cell.onclick = () => handleColumnClick(col);
            cell.onmouseenter = () => highlightColumn(col);
            cell.onmouseleave = () => clearColumnHighlight(col);
        });
        boardEl.classList.remove('disabled');
        boardMessage.classList.remove('visible');
        boardMessage.textContent = '';
        gameOver = false;
        isBotThinking = false;
        if (mode === 'bot') updateStatus('Player 1 goes first. Choose a column.');
        else if (mode === 'friend') updateStatus('Player 1 starts. Choose a column.');
        else updateStatus('Choose a mode.');
    }

    function highlightColumn(col) {
        cells.forEach(cell => {
            if (Number(cell.dataset.col) === col) cell.classList.add('column-hover');
        });
    }

    function clearColumnHighlight(col) {
        cells.forEach(cell => {
            if (Number(cell.dataset.col) === col) cell.classList.remove('column-hover');
        });
    }

    function updateScoreboard() {
        scoreP1El.textContent = scores.p1;
        scoreP2El.textContent = scores.p2;
    }

    function handleColumnClick(col) {
        if (gameOver) return;
        if (mode === 'bot') {
            if (isBotThinking) return;
            if (!playerDrop(col, 1)) return;
            if (checkWin(1)) return endGame('You');
            isBotThinking = true;
            updateStatus('Bot is thinking...');
            setTimeout(() => botMove(), 250);
        } else if (mode === 'friend') {
            const next = nextPlayer();
            if (!playerDrop(col, next)) return;
            if (checkWin(next)) return endGame(next === 1 ? 'Player 1' : 'Player 2');
        }
    }

    function playerDrop(col, player) {
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === 0) {
                board[r][col] = player;
                const cellIndex = r * COLS + col;
                const el = cells[cellIndex];
                el.classList.add(player === 1 ? 'red' : 'yellow');
                el.classList.add('drop');
                el.addEventListener('animationend', () => el.classList.remove('drop'), { once: true });
                return true;
            }
        }
        return false;
    }

    function botMove() {
        if (gameOver) return;
        const valid = getValidColumns();
        if (valid.length === 0) {
            isBotThinking = false;
            return endGame('Draw');
        }

        const difficulty = difficultySelect ? difficultySelect.value : 'medium';
        let chosenCol = null;
        if (difficulty === 'easy') {
            chosenCol = chooseRandom();
        } else if (difficulty === 'medium') {
            chosenCol = chooseMedium();
        } else if (difficulty === 'hard') {
            chosenCol = chooseMinimax(4).col;
        } else { // impossible
            chosenCol = chooseMinimax(6).col;
        }

        if (chosenCol === null || chosenCol === undefined || !valid.includes(chosenCol)) {
            chosenCol = chooseRandom();
        }

        if (chosenCol === null || chosenCol === undefined) {
            isBotThinking = false;
            return endGame('Draw');
        }

        const placed = playerDrop(chosenCol, 2);
        if (!placed) {
            const fallback = chooseRandom();
            if (fallback === null || fallback === undefined) {
                isBotThinking = false;
                return endGame('Draw');
            }
            playerDrop(fallback, 2);
        }

        if (checkWin(2)) return endGame('Bot');
        if (checkDraw()) return endGame('Draw');
        isBotThinking = false;
        updateStatus('Your turn. Choose a column.');
    }

    function checkDraw() {
        return getValidColumns().length === 0;
    }

    function chooseRandom() {
        const valid = getValidColumns();
        if (!valid.length) return null;
        return valid[Math.floor(Math.random() * valid.length)];
    }

    function chooseMedium() {
        // try win, then block, else random
        const valid = getValidColumns();
        for (const c of valid) {
            const r = getNextOpenRow(board, c);
            board[r][c] = 2;
            const win = winningMove(board, 2);
            board[r][c] = 0;
            if (win) return c;
        }
        // block player
        for (const c of valid) {
            const r = getNextOpenRow(board, c);
            board[r][c] = 1;
            const wouldWin = winningMove(board, 1);
            board[r][c] = 0;
            if (wouldWin) return c;
        }
        // otherwise center-first preference
        if (valid.includes(3)) return 3;
        return chooseRandom();
    }

    function chooseMinimax(depth) {
        return minimax(board, depth, -Infinity, Infinity, true);
    }

    function getValidColumns(boardState = board) {
        const valid = [];
        for (let c = 0; c < COLS; c++) if (boardState[0][c] === 0) valid.push(c);
        return valid;
    }

    function getNextOpenRow(bd, col) {
        for (let r = ROWS - 1; r >= 0; r--) if (bd[r][col] === 0) return r;
        return -1;
    }

    function winningMove(bd, piece) {
        // horizontal
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 3; c++) if (bd[r][c] === piece && bd[r][c+1] === piece && bd[r][c+2] === piece && bd[r][c+3] === piece) return true;
        // vertical
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS - 3; r++) if (bd[r][c] === piece && bd[r+1][c] === piece && bd[r+2][c] === piece && bd[r+3][c] === piece) return true;
        // diag down-right
        for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS - 3; c++) if (bd[r][c] === piece && bd[r+1][c+1] === piece && bd[r+2][c+2] === piece && bd[r+3][c+3] === piece) return true;
        // diag up-right
        for (let r = 3; r < ROWS; r++) for (let c = 0; c < COLS - 3; c++) if (bd[r][c] === piece && bd[r-1][c+1] === piece && bd[r-2][c+2] === piece && bd[r-3][c+3] === piece) return true;
        return false;
    }

    function evaluateWindow(window, piece) {
        const opp = piece === 1 ? 2 : 1;
        let score = 0;
        const countPiece = window.filter(x => x === piece).length;
        const countOpp = window.filter(x => x === opp).length;
        const countEmpty = window.filter(x => x === 0).length;
        if (countPiece === 4) score += 1000;
        else if (countPiece === 3 && countEmpty === 1) score += 5;
        else if (countPiece === 2 && countEmpty === 2) score += 2;
        if (countOpp === 3 && countEmpty === 1) score -= 4;
        return score;
    }

    function scorePosition(bd, piece) {
        let score = 0;
        // center column preference
        const centerArray = [];
        for (let r = 0; r < ROWS; r++) centerArray.push(bd[r][Math.floor(COLS/2)]);
        const centerCount = centerArray.filter(x => x === piece).length;
        score += centerCount * 3;
        // horizontal
        for (let r = 0; r < ROWS; r++) {
            const rowArray = bd[r];
            for (let c = 0; c < COLS - 3; c++) {
                const window = rowArray.slice(c, c+4);
                score += evaluateWindow(window, piece);
            }
        }
        // vertical
        for (let c = 0; c < COLS; c++) {
            const colArray = [];
            for (let r = 0; r < ROWS; r++) colArray.push(bd[r][c]);
            for (let r = 0; r < ROWS - 3; r++) {
                const window = colArray.slice(r, r+4);
                score += evaluateWindow(window, piece);
            }
        }
        // positive diagonal
        for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS - 3; c++) {
            const window = [bd[r][c], bd[r+1][c+1], bd[r+2][c+2], bd[r+3][c+3]];
            score += evaluateWindow(window, piece);
        }
        // negative diagonal
        for (let r = 3; r < ROWS; r++) for (let c = 0; c < COLS - 3; c++) {
            const window = [bd[r][c], bd[r-1][c+1], bd[r-2][c+2], bd[r-3][c+3]];
            score += evaluateWindow(window, piece);
        }
        return score;
    }

    function copyBoard(bd) {
        return bd.map(row => row.slice());
    }

    function minimax(bd, depth, alpha, beta, maximizingPlayer) {
        const validLocations = getValidColumns(bd);
        const isTerminal = winningMove(bd, 1) || winningMove(bd, 2) || validLocations.length === 0;
        if (depth === 0 || isTerminal) {
            if (isTerminal) {
                if (winningMove(bd, 2)) return { col: null, score: 100000000000 };
                else if (winningMove(bd, 1)) return { col: null, score: -100000000000 };
                else return { col: null, score: 0 };
            } else {
                return { col: null, score: scorePosition(bd, 2) };
            }
        }
        if (maximizingPlayer) {
            let value = -Infinity;
            let column = validLocations[Math.floor(Math.random()*validLocations.length)];
            for (const col of validLocations) {
                const row = getNextOpenRow(bd, col);
                if (row < 0) continue;
                const tempBoard = copyBoard(bd);
                tempBoard[row][col] = 2;
                const newScore = minimax(tempBoard, depth-1, alpha, beta, false).score;
                if (newScore > value) { value = newScore; column = col; }
                alpha = Math.max(alpha, value);
                if (alpha >= beta) break;
            }
            return { col: column, score: value };
        } else {
            let value = Infinity;
            let column = validLocations[Math.floor(Math.random()*validLocations.length)];
            for (const col of validLocations) {
                const row = getNextOpenRow(bd, col);
                if (row < 0) continue;
                const tempBoard = copyBoard(bd);
                tempBoard[row][col] = 1;
                const newScore = minimax(tempBoard, depth-1, alpha, beta, true).score;
                if (newScore < value) { value = newScore; column = col; }
                beta = Math.min(beta, value);
                if (alpha >= beta) break;
            }
            return { col: column, score: value };
        }
    }

    function nextPlayer() {
        friendTurn = friendTurn === 1 ? 2 : 1;
        return friendTurn;
    }

    function checkWin(player) {
        // horizontal
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                if (board[r][c] === player && board[r][c+1] === player && board[r][c+2] === player && board[r][c+3] === player) return true;
            }
        }
        // vertical
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS - 3; r++) {
                if (board[r][c] === player && board[r+1][c] === player && board[r+2][c] === player && board[r+3][c] === player) return true;
            }
        }
        // diag down-right
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                if (board[r][c] === player && board[r+1][c+1] === player && board[r+2][c+2] === player && board[r+3][c+3] === player) return true;
            }
        }
        // diag up-right
        for (let r = 3; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                if (board[r][c] === player && board[r-1][c+1] === player && board[r-2][c+2] === player && board[r-3][c+3] === player) return true;
            }
        }
        return false;
    }

    function endGame(winner) {
        gameOver = true;
        boardEl.classList.add('disabled');
        if (winner === 'You' || winner === 'Player 1' || winner === 1) scores.p1++;
        if (winner === 'Bot' || winner === 'Player 2' || winner === 2) scores.p2++;
        updateScoreboard();
        updateStatus('');
        showBoardMessage(`${winner} won!`);
    }

    function showBoardMessage(message) {
        boardMessage.textContent = message;
        boardMessage.classList.add('visible');
    }

    function updateStatus(message) {
        const statusEl = document.getElementById('game-status');
        if (statusEl) statusEl.textContent = message;
    }

    botBtn.addEventListener('click', () => {
        mode = 'bot';
        menuPanel.style.display = 'none';
        controls.style.display = 'flex';
        difficultyContainer.style.display = 'block';
        scoreP2Label.innerHTML = 'Bot: <span id="score-p2">' + scores.p2 + '</span>';
        scoreP2El = document.getElementById('score-p2');
        updateScoreboard();
        friendTurn = 1;
        initBoard();
        updateStatus('Player 1 goes first. Choose a column.');
    });

  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('visible');
});

    settingsClose.addEventListener('click', () => {
        settingsPanel.classList.remove('visible');
    });

    settingsPanel.addEventListener('click', event => {
        if (event.target === settingsPanel) {
            settingsPanel.classList.remove('visible');
        }
    });

    if (themeButtons.length) {
        themeButtons.forEach(button => {
            button.addEventListener('click', () => setTheme(button.dataset.theme));
        });
    }

    function setTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        themeButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.theme === theme);
        });
        window.localStorage.setItem('connect4-theme', theme);
    }

    function initTheme() {
        const saved = window.localStorage.getItem('connect4-theme') || 'classic';
        setTheme(saved);
    }

    difficultySelect.addEventListener('change', () => {
        if (mode === 'bot') {
            initBoard();
            updateStatus('Difficulty changed. Game restarted. Choose a column.');
        }
    });

    friendBtn.addEventListener('click', () => {
        mode = 'friend';
        menuPanel.style.display = 'none';
        controls.style.display = 'flex';
        difficultyContainer.style.display = 'none';
        scoreP2Label.innerHTML = 'Player 2: <span id="score-p2">' + scores.p2 + '</span>';
        scoreP2El = document.getElementById('score-p2');
        updateScoreboard();
        friendTurn = 2; // so nextPlayer flips to 1 on first move
        initBoard();
        updateStatus('Player 1 starts. Choose a column.');
    });

    playAgainBtn.addEventListener('click', () => {
        initBoard();
        updateStatus('Round restarted. Choose a column.');
    });

    backMenuBtn.addEventListener('click', () => {
        controls.style.display = 'none';
        menuPanel.style.display = 'block';
        updateStatus('');
        boardMessage.classList.remove('visible');
        boardMessage.textContent = '';
    });

    // initialize theme and board in a passive state so the menu shows first
    initTheme();
    initBoard();
});

const bgMusic = document.getElementById("bgMusic");

document.querySelectorAll(".music-option").forEach(button => {

    button.addEventListener("click", () => {

        const song = button.dataset.song;

        bgMusic.src = song;
        bgMusic.volume = 0.35;

        bgMusic.play();

    });

});

document.getElementById("stopMusic").addEventListener("click", () => {

    bgMusic.pause();
    bgMusic.currentTime = 0;

});