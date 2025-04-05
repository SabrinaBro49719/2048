// 游戏参数
const GRID_SIZE = 5;
let cells = [];
let grid = [];
let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;
let gameIsOver = false;
let notificationTimeout = null;
let soundEnabled = true;
let movesCount = 0;
let startTime = null;
let gameTimer = null;
let highestTile = 0;
let difficulty = 'easy';
let comboCount = 0;
let lastMergeTime = 0;
const COMBO_TIMEOUT = 1000; // 1秒内连续合并算连击
let activeAnimations = new Set(); // 跟踪活动动画
let touchStartX = 0;
let touchStartY = 0;

// 预加载图片
function preloadImages() {
    const images = [
        'image/bunny.jpeg',
        'image/duck.jpeg',
        'image/puppy.jpeg',
        'image/cat.jpeg',
        'image/otter pup.jpeg',
        'image/fox.jpeg',
        'image/panda.jpeg',
        'image/deer.jpeg',
        'image/hedgehog.jpeg',
        'image/alpaca.jpeg',
        'image/lion.jpeg',
        'image/elephant.jpeg',
        'image/lamb.jpeg',
        'image/bear.jpeg',
        'image/squirrel.jpeg',
        'image/tiger.jpeg'
    ];

    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// 音频元素
const mergeSound = document.getElementById('merge-sound');
const gameOverSound = document.getElementById('game-over-sound');

// 设置音频音量
mergeSound.volume = 0.5;
gameOverSound.volume = 0.5;

// 音频初始化标志
let audioInitialized = false;

// 初始化音频
function initializeAudio() {
    if (!audioInitialized) {
        // 创建一个静音的音频上下文
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.resume();
        
        // 预加载音频
        mergeSound.load();
        gameOverSound.load();
        
        // 尝试播放一个静音的音频来解锁音频上下文
        const unlockAudio = () => {
            mergeSound.play().then(() => {
                mergeSound.pause();
                audioInitialized = true;
            }).catch(() => {
                // 如果播放失败，等待用户交互
                document.addEventListener('click', unlockAudio, { once: true });
                document.addEventListener('touchstart', unlockAudio, { once: true });
            });
        };
        
        unlockAudio();
    }
}

// 声音控制
document.getElementById('music-toggle').addEventListener('click', () => {
    toggleSound();
    initializeAudio();
});

function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('music-toggle').style.opacity = soundEnabled ? 1 : 0.5;
}

// 播放音效的辅助函数
function playSound(sound) {
    if (soundEnabled && sound) {
        initializeAudio();
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Failed to play sound:', e));
    }
}

// 初始化网格UI
function initGrid() {
    const gridElement = document.getElementById('grid');
    gridElement.innerHTML = '';
    cells = [];

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';

        // 为每个单元格添加数字显示元素
        const span = document.createElement('span');
        cell.appendChild(span);

        gridElement.appendChild(cell);
        cells.push(cell);
    }

    // 初始化数据网格
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));

    // 添加触摸事件监听器
    gridElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    gridElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    gridElement.addEventListener('touchend', handleTouchEnd, { passive: false });
}

// 触摸事件处理函数
function handleTouchStart(event) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    event.preventDefault(); // 阻止默认行为
}

function handleTouchMove(event) {
    if (gameIsOver) return;
    
    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;
    
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;
    
    // 防止页面滚动
    event.preventDefault();
}

function handleTouchEnd(event) {
    if (gameIsOver) return;
    
    const touchX = event.changedTouches[0].clientX;
    const touchY = event.changedTouches[0].clientY;
    
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;
    
    // 设置最小滑动距离阈值
    const minSwipeDistance = 30;
    
    // 确定滑动方向
    if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // 水平滑动
            if (deltaX > 0) {
                move('right');
            } else {
                move('left');
            }
        } else {
            // 垂直滑动
            if (deltaY > 0) {
                move('down');
            } else {
                move('up');
            }
        }
    }
    event.preventDefault(); // 阻止默认行为
}

// 1. 更新playScoreAnimation函数来改进特效显示
function playScoreAnimation(points, x, y) {
    // 清理过期的动画
    activeAnimations.forEach(anim => {
        if (!document.body.contains(anim)) {
            activeAnimations.delete(anim);
        }
    });

    // 创建得分动画元素
    const scoreAnim = document.createElement('div');
    scoreAnim.className = 'score-animation';
    scoreAnim.textContent = '+' + points;

    // 更精确的位置设置 - 直接在合并的方块上方
    scoreAnim.style.left = (x - 20) + 'px';
    scoreAnim.style.top = (y - 20) + 'px';

    document.body.appendChild(scoreAnim);
    activeAnimations.add(scoreAnim);

    // 播放合并音效
    playSound(mergeSound);

    // 检查是否连击
    const now = Date.now();
    if (now - lastMergeTime < COMBO_TIMEOUT) {
        comboCount++;
        if (comboCount > 1) {
            showComboAnimation(comboCount);
        }
    } else {
        comboCount = 1;
    }
    lastMergeTime = now;

    // 动画结束后移除元素
    setTimeout(() => {
        if (document.body.contains(scoreAnim)) {
            document.body.removeChild(scoreAnim);
            activeAnimations.delete(scoreAnim);
        }
    }, 1500);
}

// 显示连击动画
function showComboAnimation(count) {
    const comboAnim = document.createElement('div');
    comboAnim.className = 'combo-animation';
    comboAnim.textContent = count + ' Combo!';
    document.querySelector('.game-container').appendChild(comboAnim);

    setTimeout(() => {
        document.querySelector('.game-container').removeChild(comboAnim);
    }, 1000);
}

// 更新游戏统计
function updateStats() {
    document.getElementById('moves-count').textContent = movesCount;
    document.getElementById('highest-tile').textContent = highestTile;
}

// 更新游戏时间
function updateGameTime() {
    if (!startTime) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('time-played').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 检查成就
function checkAchievements() {
    if (highestTile >= 2048) {
        document.getElementById('first-2048').classList.remove('locked');
    }
    if (movesCount >= 1000) {
        document.getElementById('master-mover').classList.remove('locked');
    }
}

// 开始新游戏
function newGame() {
    // 初始化音频
    initializeAudio();
    
    // 清除之前的游戏状态
    if (gameTimer) {
        clearInterval(gameTimer);
    }

    // 移除游戏结束显示
    const gameOverElement = document.querySelector('.game-over');
    if (gameOverElement) {
        gameOverElement.remove();
    }

    // 重置游戏状态
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    initGrid();
    score = 0;
    movesCount = 0;
    gameIsOver = false;
    startTime = Date.now();
    highestTile = 0;

    // 始终使用简单难度 (2个初始方块)
    let initialTiles = 2;

    for (let i = 0; i < initialTiles; i++) {
        addNewTile();
    }

    updateScore();
    updateStats();

    // 启动游戏计时器
    gameTimer = setInterval(updateGameTime, 1000);
}

// 添加新块
function addNewTile() {
    // 找出所有空白位置
    const emptyPositions = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (grid[row][col] === 0) {
                emptyPositions.push({ row, col });
            }
        }
    }

    if (emptyPositions.length === 0) return false;

    // 随机选择一个空位置
    const position = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];

    // 90%几率是2，10%几率是4
    // 根据最高方块值动态调整生成概率
    let value;
    const highTileThreshold = highestTile >= 512 ? 3 : (highestTile >= 128 ? 2 : 1);
    const rng = Math.random();

    // 基础概率设置
    let prob2 = 0.8; // 生成2的基础概率
    let prob4 = 0.15; // 生成4的基础概率
    let prob8 = 0.05; // 生成8的基础概率

    // 根据游戏进度调整概率
    if (highestTile >= 64) {
        prob2 = 0.7;
        prob4 = 0.2;
        prob8 = 0.1;
    }
    if (highestTile >= 256) {
        prob2 = 0.6;
        prob4 = 0.25;
        prob8 = 0.15;
    }
    if (highestTile >= 1024) {
        prob2 = 0.5;
        prob4 = 0.3;
        prob8 = 0.2;
    }

    // 每200个移动后，额外调整概率
    if (movesCount > 200) {
        prob2 -= 0.1;
        prob4 += 0.05;
        prob8 += 0.05;
    }

    // 确保概率总和为1
    const probTotal = prob2 + prob4 + prob8;
    prob2 /= probTotal;
    prob4 /= probTotal;
    // prob8不需要调整，因为它就是剩余的概率

    // 根据概率范围决定生成的值
    if (rng < prob2) {
        value = 2;
    } else if (rng < prob2 + prob4) {
        value = 4;
    } else {
        value = 8;
    }

    // 每500个移动后，有极小概率(0.5%)生成16
    if (movesCount > 500 && Math.random() < 0.005) {
        value = 16;
    }
    grid[position.row][position.col] = value;

    // 更新UI
    const cellIndex = position.row * GRID_SIZE + position.col;
    // 设置值到span元素
    const span = cells[cellIndex].querySelector('span');
    span.textContent = value || '';
    cells[cellIndex].className = value ? `cell cell-${value} tile-new` : 'cell';

    return true;
}

// 更新分数
function updateScore() {
    document.getElementById('score').textContent = score;
    if (score > bestScore) {
        bestScore = score;
        document.getElementById('best-score').textContent = bestScore;
        localStorage.setItem('bestScore', bestScore);
    } else {
        document.getElementById('best-score').textContent = bestScore;
    }
}

// 更新网格UI
function updateGridUI() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const value = grid[row][col];
            const cellIndex = row * GRID_SIZE + col;

            // 设置值到span元素
            const span = cells[cellIndex].querySelector('span');
            span.textContent = value || '';
            cells[cellIndex].className = value ? `cell cell-${value}` : 'cell';
        }
    }
}

// 显示操作无效通知
function showInvalidMoveNotification(message) {
    const notification = document.getElementById('move-notification');
    notification.textContent = message;
    notification.classList.add('show');

    // 清除之前的超时
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    // 2秒后隐藏
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// 5. 修改move函数，移除全局特效显示
function move(direction) {
    if (gameIsOver) return false;

    // 保存之前的状态
    const previousGrid = grid.map(row => [...row]);
    let moved = false;
    let totalScore = 0; // 此次移动的总得分

    // 根据方向处理移动
    switch (direction) {
        case 'right':
            const rightResult = moveRight(totalScore);
            moved = rightResult.moved;
            totalScore = rightResult.score;
            break;
        case 'down':
            const downResult = moveDown(totalScore);
            moved = downResult.moved;
            totalScore = downResult.score;
            break;
        case 'left':
            const leftResult = moveLeft(totalScore);
            moved = leftResult.moved;
            totalScore = leftResult.score;
            break;
        case 'up':
            const upResult = moveUp(totalScore);
            moved = upResult.moved;
            totalScore = upResult.score;
            break;
    }

    // 如果发生了移动
    if (moved) {
        // 播放合并音效
        playSound(mergeSound);

        // 更新移动计数
        movesCount++;
        updateStats();

        // 添加新块
        addNewTile();

        // 更新分数
        score += totalScore;
        updateScore();

        // 更新UI
        updateGridUI();

        // 检查游戏是否结束
        if (isGameOver()) {
            gameOver();
        }
    } else {
        showInvalidMoveNotification('Invalid Move');
    }

    return moved;
}

// 向右移动
function moveRight(totalScore) {
    let moved = false;
    let score = totalScore;

    for (let row = 0; row < GRID_SIZE; row++) {
        // 从右向左遍历每一行
        for (let col = GRID_SIZE - 2; col >= 0; col--) {
            if (grid[row][col] !== 0) {
                let currentCol = col;
                // 向右移动直到遇到非空格子或到达边界
                while (currentCol < GRID_SIZE - 1 && grid[row][currentCol + 1] === 0) {
                    grid[row][currentCol + 1] = grid[row][currentCol];
                    grid[row][currentCol] = 0;
                    currentCol++;
                    moved = true;
                }
                // 如果右边相邻格子值相同，合并
                if (currentCol < GRID_SIZE - 1 && grid[row][currentCol + 1] === grid[row][currentCol]) {
                    grid[row][currentCol + 1] *= 2;
                    grid[row][currentCol] = 0;
                    score += grid[row][currentCol + 1];
                    moved = true;
                    // 更新最高方块值
                    highestTile = Math.max(highestTile, grid[row][currentCol + 1]);
                    
                    // 添加得分动画
                    const cellIndex = row * GRID_SIZE + currentCol + 1;
                    const cell = cells[cellIndex];
                    const rect = cell.getBoundingClientRect();
                    playScoreAnimation(grid[row][currentCol + 1], rect.left + rect.width/2, rect.top + rect.height/2);
                }
            }
        }
    }

    return { moved, score };
}

// 向左移动
function moveLeft(totalScore) {
    let moved = false;
    let score = totalScore;

    for (let row = 0; row < GRID_SIZE; row++) {
        // 从左向右遍历每一行
        for (let col = 1; col < GRID_SIZE; col++) {
            if (grid[row][col] !== 0) {
                let currentCol = col;
                // 向左移动直到遇到非空格子或到达边界
                while (currentCol > 0 && grid[row][currentCol - 1] === 0) {
                    grid[row][currentCol - 1] = grid[row][currentCol];
                    grid[row][currentCol] = 0;
                    currentCol--;
                    moved = true;
                }
                // 如果左边相邻格子值相同，合并
                if (currentCol > 0 && grid[row][currentCol - 1] === grid[row][currentCol]) {
                    grid[row][currentCol - 1] *= 2;
                    grid[row][currentCol] = 0;
                    score += grid[row][currentCol - 1];
                    moved = true;
                    // 更新最高方块值
                    highestTile = Math.max(highestTile, grid[row][currentCol - 1]);
                    
                    // 添加得分动画
                    const cellIndex = row * GRID_SIZE + currentCol - 1;
                    const cell = cells[cellIndex];
                    const rect = cell.getBoundingClientRect();
                    playScoreAnimation(grid[row][currentCol - 1], rect.left + rect.width/2, rect.top + rect.height/2);
                }
            }
        }
    }

    return { moved, score };
}

// 向下移动
function moveDown(totalScore) {
    let moved = false;
    let score = totalScore;

    for (let col = 0; col < GRID_SIZE; col++) {
        // 从下向上遍历每一列
        for (let row = GRID_SIZE - 2; row >= 0; row--) {
            if (grid[row][col] !== 0) {
                let currentRow = row;
                // 向下移动直到遇到非空格子或到达边界
                while (currentRow < GRID_SIZE - 1 && grid[currentRow + 1][col] === 0) {
                    grid[currentRow + 1][col] = grid[currentRow][col];
                    grid[currentRow][col] = 0;
                    currentRow++;
                    moved = true;
                }
                // 如果下边相邻格子值相同，合并
                if (currentRow < GRID_SIZE - 1 && grid[currentRow + 1][col] === grid[currentRow][col]) {
                    grid[currentRow + 1][col] *= 2;
                    grid[currentRow][col] = 0;
                    score += grid[currentRow + 1][col];
                    moved = true;
                    // 更新最高方块值
                    highestTile = Math.max(highestTile, grid[currentRow + 1][col]);
                    
                    // 添加得分动画
                    const cellIndex = (currentRow + 1) * GRID_SIZE + col;
                    const cell = cells[cellIndex];
                    const rect = cell.getBoundingClientRect();
                    playScoreAnimation(grid[currentRow + 1][col], rect.left + rect.width/2, rect.top + rect.height/2);
                }
            }
        }
    }

    return { moved, score };
}

// 向上移动
function moveUp(totalScore) {
    let moved = false;
    let score = totalScore;

    for (let col = 0; col < GRID_SIZE; col++) {
        // 从上向下遍历每一列
        for (let row = 1; row < GRID_SIZE; row++) {
            if (grid[row][col] !== 0) {
                let currentRow = row;
                // 向上移动直到遇到非空格子或到达边界
                while (currentRow > 0 && grid[currentRow - 1][col] === 0) {
                    grid[currentRow - 1][col] = grid[currentRow][col];
                    grid[currentRow][col] = 0;
                    currentRow--;
                    moved = true;
                }
                // 如果上边相邻格子值相同，合并
                if (currentRow > 0 && grid[currentRow - 1][col] === grid[currentRow][col]) {
                    grid[currentRow - 1][col] *= 2;
                    grid[currentRow][col] = 0;
                    score += grid[currentRow - 1][col];
                    moved = true;
                    // 更新最高方块值
                    highestTile = Math.max(highestTile, grid[currentRow - 1][col]);
                    
                    // 添加得分动画
                    const cellIndex = (currentRow - 1) * GRID_SIZE + col;
                    const cell = cells[cellIndex];
                    const rect = cell.getBoundingClientRect();
                    playScoreAnimation(grid[currentRow - 1][col], rect.left + rect.width/2, rect.top + rect.height/2);
                }
            }
        }
    }

    return { moved, score };
}

// 检查游戏是否结束
function isGameOver() {
    // 检查是否有空格子
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (grid[row][col] === 0) {
                return false;
            }
        }
    }

    // 检查是否有相邻的相同值
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const current = grid[row][col];
            // 检查右边
            if (col < GRID_SIZE - 1 && current === grid[row][col + 1]) {
                return false;
            }
            // 检查下边
            if (row < GRID_SIZE - 1 && current === grid[row + 1][col]) {
                return false;
            }
        }
    }

    return true;
}

// 游戏结束
function gameOver() {
    gameIsOver = true;
    if (gameTimer) {
        clearInterval(gameTimer);
    }

    // 播放游戏结束音效
    playSound(gameOverSound);

    // 创建游戏结束显示
    const gameOverElement = document.createElement('div');
    gameOverElement.className = 'game-over';
    gameOverElement.innerHTML = `
        <h2>Game Over!</h2>
        <p>Final Score: ${score}</p>
        <p>Highest Tile: ${highestTile}</p>
        <button onclick="newGame()">Play Again</button>
    `;

    document.querySelector('.game-container').appendChild(gameOverElement);
}

// 添加键盘事件监听
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowRight':
            event.preventDefault();
            move('right');
            break;
        case 'ArrowLeft':
            event.preventDefault();
            move('left');
            break;
        case 'ArrowDown':
            event.preventDefault();
            move('down');
            break;
        case 'ArrowUp':
            event.preventDefault();
            move('up');
            break;
    }
});

// 在页面加载时初始化音频和预加载图片
document.addEventListener('DOMContentLoaded', () => {
    initializeAudio();
    preloadImages();
});

// 开始新游戏
newGame(); 