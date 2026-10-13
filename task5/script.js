let roundSequence = [];
let playerStep = 0;
let currentLevel = 0;
let roundId = 0;
let isPlaying = false;
let isAcceptingInput = false;

const levelEl = document.getElementById('level-display');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('start-btn');
const padButtons = document.querySelectorAll('.pad');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const padTones = [329.63, 261.63, 220.0, 164.81];

function playTone(index, durationMs) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = padTones[index];
  gainNode.gain.value = 0.2;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + durationMs / 1000);
}

function playErrorTone() {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'sawtooth';
  oscillator.frequency.value = 110;
  gainNode.gain.value = 0.2;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.4);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setPadsDisabled(disabled) {
  padButtons.forEach((pad) => {
    pad.disabled = disabled;
  });
}

async function flashPad(index, myRoundId) {
  const pad = padButtons[index];
  pad.classList.add('active');
  playTone(index, 400);
  await sleep(400);
  if (myRoundId !== roundId) return;
  pad.classList.remove('active');
  await sleep(200);
}

async function playSequence() {
  const myRoundId = roundId;
  isPlaying = true;
  isAcceptingInput = false;
  setPadsDisabled(true);
  messageEl.textContent = 'Повторяйте...';

  await sleep(500);

  for (let i = 0; i < roundSequence.length; i++) {
    if (myRoundId !== roundId) return;
    await flashPad(roundSequence[i], myRoundId);
  }

  if (myRoundId !== roundId) return;

  isPlaying = false;
  isAcceptingInput = true;
  playerStep = 0;
  setPadsDisabled(false);
  messageEl.textContent = 'Ваш ход';
}

function startGame() {
  roundId++;
  roundSequence = [];
  currentLevel = 0;
  playerStep = 0;
  isPlaying = false;
  isAcceptingInput = false;
  levelEl.textContent = 'Уровень: 0';
  nextLevel();
}

function nextLevel() {
  currentLevel++;
  roundSequence.push(Math.floor(Math.random() * 4));
  levelEl.textContent = `Уровень: ${currentLevel}`;
  playSequence();
}

function handlePadClick(index) {
  if (!isAcceptingInput || isPlaying) return;

  const pad = padButtons[index];
  pad.classList.add('active');
  playTone(index, 200);
  setTimeout(() => pad.classList.remove('active'), 200);

  if (index === roundSequence[playerStep]) {
    playerStep++;
    if (playerStep === roundSequence.length) {
      isAcceptingInput = false;
      setPadsDisabled(true);
      messageEl.textContent = 'Верно! Следующий уровень...';
      setTimeout(() => {
        if (!isAcceptingInput) {
          nextLevel();
        }
      }, 800);
    }
  } else {
    isAcceptingInput = false;
    setPadsDisabled(true);
    playErrorTone();
    messageEl.textContent = `Вы дошли до уровня ${currentLevel}. Нажмите «Старт», чтобы сыграть снова`;
  }
}

padButtons.forEach((pad, index) => {
  pad.addEventListener('click', () => handlePadClick(index));
});

startBtn.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  startGame();
});

setPadsDisabled(true);
