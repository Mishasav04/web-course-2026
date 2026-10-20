(() => {
  'use strict';

  class SnakeModel {
    #gridSize;
    #segments = [];
    #direction = { x: 1, y: 0 };
    #pendingDirection = { x: 1, y: 0 };
    #apple = null;
    #score = 0;
    #gameOver = false;

    constructor(gridSize) {
      this.#gridSize = gridSize;
    }

    getState() {
      return {
        segments: this.#segments.map((s) => ({ ...s })),
        apple: this.#apple ? { ...this.#apple } : null,
        score: this.#score,
        gameOver: this.#gameOver,
      };
    }

    reset() {
      const mid = Math.floor(this.#gridSize / 2);
      this.#segments = [
        { x: mid - 2, y: mid },
        { x: mid - 3, y: mid },
        { x: mid - 4, y: mid },
      ];
      this.#direction = { x: 1, y: 0 };
      this.#pendingDirection = { x: 1, y: 0 };
      this.#score = 0;
      this.#gameOver = false;
      this.#apple = this.#spawnApple();
    }

    setDirection(dx, dy) {
      const isOpposite = this.#direction.x === -dx && this.#direction.y === -dy;
      if (!isOpposite) this.#pendingDirection = { x: dx, y: dy };
    }

    update() {
      if (this.#gameOver) return;
      this.#moveSnake();
    }

    #moveSnake() {
      this.#direction = this.#pendingDirection;
      const head = this.#segments[0];
      const nextHead = {
        x: head.x + this.#direction.x,
        y: head.y + this.#direction.y,
      };

      const ateApple = this.#apple !== null && this.#isSamePoint(nextHead, this.#apple);

      if (this.#checkCollision(nextHead, ateApple)) {
        this.#gameOver = true;
        return;
      }

      this.#segments.unshift(nextHead);

      if (ateApple) {
        this.#score += 1;
        this.#apple = this.#spawnApple();
        if (this.#apple === null) this.#gameOver = true; 
      } else {
        this.#segments.pop();
      }
    }

    #checkCollision(point, ateApple) {
      const body = ateApple ? this.#segments : this.#segments.slice(0, -1);
      return this.#isOutsideField(point) || body.some((s) => this.#isSamePoint(s, point));
    }

    #spawnApple() {
      const freeCells = [];
      for (let y = 0; y < this.#gridSize; y++) {
        for (let x = 0; x < this.#gridSize; x++) {
          const cell = { x, y };
          if (!this.#segments.some((s) => this.#isSamePoint(s, cell))) freeCells.push(cell);
        }
      }
      if (freeCells.length === 0) return null;
      return freeCells[Math.floor(Math.random() * freeCells.length)];
    }

    #isOutsideField({ x, y }) {
      return x < 0 || y < 0 || x >= this.#gridSize || y >= this.#gridSize;
    }

    #isSamePoint(a, b) {
      return a.x === b.x && a.y === b.y;
    }
  }

  class SnakeView {
    #canvas;
    #ctx;
    #scoreEl;
    #gameOverEl;
    #finalScoreEl;
    #restartBtn;
    #cellSize;
    #colors;

    constructor(elements, { cellSize, colors }) {
      this.#canvas = elements.canvas;
      this.#ctx = elements.canvas.getContext('2d');
      this.#scoreEl = elements.scoreEl;
      this.#gameOverEl = elements.gameOverEl;
      this.#finalScoreEl = elements.finalScoreEl;
      this.#restartBtn = elements.restartBtn;
      this.#cellSize = cellSize;
      this.#colors = colors;
    }

    bindKeyDown(handler) {
      document.addEventListener('keydown', (event) => {
        if (handler(event.key)) event.preventDefault();
      });
    }

    bindRestart(handler) {
      this.#restartBtn.addEventListener('click', handler);
    }

    draw(state) {
      this.#drawBackground();
      if (state.apple) this.#drawApple(state.apple);
      this.#drawSnake(state.segments);
      this.#renderScore(state.score);
      this.#renderGameOver(state.gameOver, state.score);
    }

    #drawBackground() {
      this.#ctx.fillStyle = this.#colors.background;
      this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
    }

    #drawSnake(segments) {
      const size = this.#cellSize;
      segments.forEach((segment, index) => {
        this.#ctx.fillStyle = index === 0 ? this.#colors.head : this.#colors.body;
        this.#ctx.fillRect(segment.x * size, segment.y * size, size - 1, size - 1);
      });
    }

    #drawApple({ x, y }) {
      const size = this.#cellSize;
      this.#ctx.fillStyle = this.#colors.apple;
      this.#ctx.beginPath();
      this.#ctx.arc(x * size + size / 2, y * size + size / 2, size / 2 - 1, 0, Math.PI * 2);
      this.#ctx.fill();
    }

    #renderScore(score) {
      this.#scoreEl.textContent = `Счёт: ${score}`;
    }

    #renderGameOver(isGameOver, score) {
      this.#finalScoreEl.textContent = String(score);
      this.#gameOverEl.classList.toggle('hidden', !isGameOver);
    }
  }

 
  class SnakeController {
    static #KEY_TO_DIRECTION = Object.freeze({
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    });

    #model;
    #view;
    #moveIntervalMs;
    #lastMoveTime = null;
    #frameId = null;

    constructor(model, view, { moveIntervalMs }) {
      this.#model = model;
      this.#view = view;
      this.#moveIntervalMs = moveIntervalMs;

      this.#view.bindKeyDown((key) => this.#handleKeyDown(key));
      this.#view.bindRestart(() => this.start());
    }

    start() {
      this.#stopLoop();
      this.#model.reset();
      this.#lastMoveTime = null;
      this.#view.draw(this.#model.getState());
      this.#frameId = requestAnimationFrame(this.#gameLoop);
    }

    #handleKeyDown(key) {
      const direction = SnakeController.#KEY_TO_DIRECTION[key];
      if (!direction) return false;
      this.#model.setDirection(direction.x, direction.y);
      return true;
    }

    #gameLoop = (currentTime) => {
      if (this.#lastMoveTime === null) this.#lastMoveTime = currentTime;

      const deltaTime = currentTime - this.#lastMoveTime;
      if (deltaTime >= this.#moveIntervalMs) {
        this.#model.update();
        this.#lastMoveTime += this.#moveIntervalMs;
        if (currentTime - this.#lastMoveTime >= this.#moveIntervalMs) {
          this.#lastMoveTime = currentTime;
        }
      }

      const state = this.#model.getState();
      this.#view.draw(state);

      this.#frameId = state.gameOver ? null : requestAnimationFrame(this.#gameLoop);
    };

    #stopLoop() {
      if (this.#frameId !== null) cancelAnimationFrame(this.#frameId);
      this.#frameId = null;
    }
  }

  const config = Object.freeze({
    gridSize: 20,
    cellSize: 20,
    moveIntervalMs: 150,
    colors: Object.freeze({
      background: '#1b1f27',
      head: '#4ade80',
      body: '#22c55e',
      apple: '#ef4444',
    }),
  });

  const model = new SnakeModel(config.gridSize);
  const view = new SnakeView(
    {
      canvas: document.getElementById('game-canvas'),
      scoreEl: document.getElementById('score'),
      gameOverEl: document.getElementById('game-over'),
      finalScoreEl: document.getElementById('final-score'),
      restartBtn: document.getElementById('restart-btn'),
    },
    config
  );
  const controller = new SnakeController(model, view, config);
  controller.start();
})();
