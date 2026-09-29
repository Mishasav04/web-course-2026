let secretNumber = '';
let attempts = [];
let attemptCount = 0;
let gameOver = false;

const guessForm = document.getElementById('guess-form');
const guessInput = document.getElementById('guess-input');
const errorEl = document.getElementById('error');
const winMessageEl = document.getElementById('win-message');
const attemptCountEl = document.getElementById('attempt-count');
const historyList = document.getElementById('history-list');
const newGameBtn = document.getElementById('new-game-btn');

function generateSecretNumber() {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }

  return digits.slice(0, 4).join('');
}

function validateGuess(guess) {
  if (!/^\d{4}$/.test(guess)) {
    return 'Введите ровно 4 цифры';
  }

  const uniqueDigits = new Set(guess.split(''));
  if (uniqueDigits.size !== 4) {
    return 'Цифры не должны повторяться';
  }

  return '';
}

function countBullsAndCows(secret, guess) {
  let bulls = 0;
  let cows = 0;

  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      bulls++;
    } else if (secret.includes(guess[i])) {
      cows++;
    }
  }

  return { bulls, cows };
}

function newGame() {
  secretNumber = generateSecretNumber();
  attempts = [];
  attemptCount = 0;
  gameOver = false;
  errorEl.textContent = '';
  winMessageEl.textContent = '';
  guessInput.value = '';
  guessInput.disabled = false;
  render();
}

function handleCheck() {
  const guess = guessInput.value.trim();
  const validationError = validateGuess(guess);

  if (validationError) {
    errorEl.textContent = validationError;
    return;
  }

  errorEl.textContent = '';
  const { bulls, cows } = countBullsAndCows(secretNumber, guess);
  attemptCount++;
  attempts.push({ guess, bulls, cows });
  guessInput.value = '';

  if (bulls === 4) {
    winMessageEl.textContent = `Победа! Угадано за ${attemptCount} попыток`;
    gameOver = true;
    guessInput.disabled = true;
  }

  render();
}

function renderHistory() {
  historyList.innerHTML = '';

  attempts.forEach((attempt) => {
    const li = document.createElement('li');
    li.textContent = `${attempt.guess} → ${attempt.bulls} бык, ${attempt.cows} коровы`;
    historyList.appendChild(li);
  });
}

function render() {
  renderHistory();
  attemptCountEl.textContent = `Попыток: ${attemptCount}`;
}

guessForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!gameOver) {
    handleCheck();
  }
});

newGameBtn.addEventListener('click', () => {
  newGame();
});

newGame();
