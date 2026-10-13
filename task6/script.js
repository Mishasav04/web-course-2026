(function () {
  'use strict';

  const GRID_SIZE = 20;
  const CELL_SIZE = 20;
  const MOVE_INTERVAL_MS = 150;

  const KEY_TO_DIRECTION = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  // ---------- MODEL ----------
  // Состояние игры лежит здесь, отдельно от отрисовки.
  const model = {
    segments: [],
    direction: { x: 1, y: 0 },
    pendingDirection: { x: 1, y: 0 },
    apple: { x: 0, y: 0 },
    score: 0,
    gameOver: false,
  };

  function resetModel() {
    model.segments = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ];
    model.direction = { x: 1, y: 0 };
    model.pendingDirection = { x: 1, y: 0 };
    model.score = 0;
    model.gameOver = false;
    model.apple = spawnApple();
  }

  function isOccupiedBySnake(point) {
    return model.segments.some(
      (segment) => segment.x === point.x && segment.y === point.y
    );
  }

  function isOutsideField(point) {
    return (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= GRID_SIZE ||
      point.y >= GRID_SIZE
    );
  }

  function spawnApple() {
    let candidate;
    do {
      candidate = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (isOccupiedBySnake(candidate));
    return candidate;
  }

  function checkCollision(point) {
    return isOutsideField(point) || isOccupiedBySnake(point);
  }

  function moveSnake() {
    model.direction = model.pendingDirection;
    const head = model.segments[0];
    const nextHead = {
      x: head.x + model.direction.x,
      y: head.y + model.direction.y,
    };

    if (checkCollision(nextHead)) {
      model.gameOver = true;
      return;
    }

    model.segments.unshift(nextHead);

    const ateApple = nextHead.x === model.apple.x && nextHead.y === model.apple.y;
    if (ateApple) {
      model.score += 1;
      model.apple = spawnApple();
    } else {
      model.segments.pop();
    }
  }

  function setDirection(dx, dy) {
    const isOpposite = model.direction.x === -dx && model.direction.y === -dy;
    if (isOpposite) return;
    model.pendingDirection = { x: dx, y: dy };
  }

  function update() {
    if (model.gameOver) return;
    moveSnake();
  }

  // ---------- VIEW ----------
  // Только отрисовка текущего состояния модели, без изменения состояния.
  const view = {
    canvas: null,
    ctx: null,
    scoreEl: null,
    gameOverEl: null,
    finalScoreEl: null,
  };

  function initView() {
    view.canvas = document.getElementById('game-canvas');
    view.ctx = view.canvas.getContext('2d');
    view.scoreEl = document.getElementById('score');
    view.gameOverEl = document.getElementById('game-over');
    view.finalScoreEl = document.getElementById('final-score');
  }

  function drawBackground() {
    view.ctx.fillStyle = '#1b1f27';
    view.ctx.fillRect(0, 0, view.canvas.width, view.canvas.height);
  }

  function drawSnake() {
    model.segments.forEach((segment, index) => {
      view.ctx.fillStyle = index === 0 ? '#4ade80' : '#22c55e';
      view.ctx.fillRect(
        segment.x * CELL_SIZE,
        segment.y * CELL_SIZE,
        CELL_SIZE - 1,
        CELL_SIZE - 1
      );
    });
  }

  function drawApple() {
    const centerX = model.apple.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = model.apple.y * CELL_SIZE + CELL_SIZE / 2;

    view.ctx.fillStyle = '#ef4444';
    view.ctx.beginPath();
    view.ctx.arc(centerX, centerY, CELL_SIZE / 2 - 1, 0, Math.PI * 2);
    view.ctx.fill();
  }

  function renderScore() {
    view.scoreEl.textContent = `Счёт: ${model.score}`;
  }

  function renderGameOver() {
    if (model.gameOver) {
      view.finalScoreEl.textContent = String(model.score);
      view.gameOverEl.classList.remove('hidden');
    } else {
      view.gameOverEl.classList.add('hidden');
    }
  }

  function draw() {
    drawBackground();
    drawApple();
    drawSnake();
    renderScore();
    renderGameOver();
  }

  // ---------- CONTROLLER ----------
  // Игровой цикл на requestAnimationFrame, клавиатура, запуск/перезапуск.
  const controller = {
    lastMoveTime: 0,
    animationFrameId: null,
  };

  function handleKeyDown(event) {
    const direction = KEY_TO_DIRECTION[event.key];
    if (!direction) return;

    event.preventDefault();
    setDirection(direction.x, direction.y);
  }

  function gameLoop(currentTime) {
    if (controller.lastMoveTime === 0) {
      controller.lastMoveTime = currentTime;
    }

    const elapsed = currentTime - controller.lastMoveTime;
    if (elapsed >= MOVE_INTERVAL_MS) {
      update();
      controller.lastMoveTime = currentTime;
    }

    draw();

    if (model.gameOver) {
      controller.animationFrameId = null;
      return;
    }

    controller.animationFrameId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    resetModel();
    controller.lastMoveTime = 0;

    if (controller.animationFrameId !== null) {
      cancelAnimationFrame(controller.animationFrameId);
    }
    controller.animationFrameId = requestAnimationFrame(gameLoop);
  }

  function init() {
    initView();
    document.addEventListener('keydown', handleKeyDown);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    startGame();
  }

  init();
})();
