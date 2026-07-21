// ---------- Icon set (space theme, hand-built SVG paths) ----------
const ICONS = {
  star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L14.5 9 L22 9.5 L16 14.3 L18 22 L12 17.6 L6 22 L8 14.3 L2 9.5 L9.5 9 Z"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A9 9 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>`,
  planet: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5.5"/><ellipse cx="12" cy="12" rx="10.5" ry="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
  comet: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="17" cy="7" r="3.2"/><path d="M15 9 L3 21 M17 11 L8 20 M12 8 L4 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.55" fill="none"/></svg>`,
  rocket: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c3 2.5 4.5 6.5 4 11l-4 3-4-3c-.5-4.5 1-8.5 4-11Z"/><circle cx="12" cy="9" r="1.6" fill="#150E28"/><path d="M8 13l-3 4h3M16 13l3 4h-3" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M10 17l.7 4h2.6l.7-4" fill="currentColor"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4.5"/><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/></g></svg>`
};

const ICON_KEYS = Object.keys(ICONS);

// ---------- State ----------
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timerInterval = null;
let secondsElapsed = 0;
let isLocked = false;

// ---------- Elements ----------
const board = document.getElementById('board');
const moveCountEl = document.getElementById('moveCount');
const timeCountEl = document.getElementById('timeCount');
const pairsFoundEl = document.getElementById('pairsFound');
const restartBtn = document.getElementById('restartBtn');
const winOverlay = document.getElementById('winOverlay');
const winStats = document.getElementById('winStats');
const playAgainBtn = document.getElementById('playAgainBtn');
const constellationMap = document.getElementById('constellationMap');

// ---------- Starfield background ----------
function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.012 + 0.003
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFF7EA';
    stars.forEach(s => {
      s.alpha += s.speed;
      const a = (Math.sin(s.alpha) + 1) / 2;
      ctx.globalAlpha = 0.15 + a * 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
}

// ---------- Game setup ----------
function initGame() {
  matchedPairs = 0;
  moves = 0;
  secondsElapsed = 0;
  flippedCards = [];
  isLocked = false;
  clearInterval(timerInterval);
  timerInterval = null;

  moveCountEl.textContent = '0';
  timeCountEl.textContent = '00:00';
  pairsFoundEl.textContent = '0';
  constellationMap.innerHTML = '';
  winOverlay.classList.remove('is-visible');

  const deck = shuffle([...ICON_KEYS, ...ICON_KEYS]);
  cards = deck.map((type, i) => ({ id: i, type, isFlipped: false, isMatched: false }));

  renderBoard();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderBoard() {
  board.innerHTML = cards.map(card => `
    <div class="card" data-id="${card.id}" tabindex="0" role="button" aria-label="Card">
      <div class="card__inner">
        <div class="card__face card__face--back"></div>
        <div class="card__face card__face--front">${ICONS[card.type]}</div>
      </div>
    </div>
  `).join('');
}

// ---------- Interaction ----------
board.addEventListener('click', (e) => {
  const cardEl = e.target.closest('.card');
  if (!cardEl) return;
  handleCardClick(cardEl);
});

board.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const cardEl = e.target.closest('.card');
  if (!cardEl) return;
  e.preventDefault();
  handleCardClick(cardEl);
});

function handleCardClick(cardEl) {
  if (isLocked) return;
  const id = Number(cardEl.dataset.id);
  const card = cards.find(c => c.id === id);
  if (!card || card.isFlipped || card.isMatched) return;

  if (!timerInterval) startTimer();

  card.isFlipped = true;
  cardEl.classList.add('is-flipped');
  flippedCards.push({ card, el: cardEl });

  if (flippedCards.length === 2) {
    moves++;
    moveCountEl.textContent = moves;
    checkMatch();
  }
}

function checkMatch() {
  isLocked = true;
  const [first, second] = flippedCards;

  if (first.card.type === second.card.type) {
    first.card.isMatched = true;
    second.card.isMatched = true;
    first.el.classList.add('is-matched');
    second.el.classList.add('is-matched');
    matchedPairs++;
    pairsFoundEl.textContent = matchedPairs;
    drawConstellationPoint(matchedPairs);
    flippedCards = [];
    isLocked = false;

    if (matchedPairs === ICON_KEYS.length) {
      finishGame();
    }
  } else {
    first.el.classList.add('is-shake');
    second.el.classList.add('is-shake');
    setTimeout(() => {
      first.card.isFlipped = false;
      second.card.isFlipped = false;
      first.el.classList.remove('is-flipped', 'is-shake');
      second.el.classList.remove('is-flipped', 'is-shake');
      flippedCards = [];
      isLocked = false;
    }, 650);
  }
}

// ---------- Constellation drawing ----------
let lastPoint = null;

function drawConstellationPoint(index) {
  const ns = 'http://www.w3.org/2000/svg';
  const x = (index / (ICON_KEYS.length + 1)) * 400;
  const y = 20 + Math.sin(index * 1.7) * 14;

  if (lastPoint) {
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', lastPoint.x);
    line.setAttribute('y1', lastPoint.y);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y);
    constellationMap.appendChild(line);
  }

  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('cx', x);
  dot.setAttribute('cy', y);
  dot.setAttribute('r', 3.5);
  constellationMap.appendChild(dot);

  lastPoint = { x, y };
}

// ---------- Timer ----------
function startTimer() {
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const s = String(secondsElapsed % 60).padStart(2, '0');
    timeCountEl.textContent = `${m}:${s}`;
  }, 1000);
}

// ---------- Win ----------
function finishGame() {
  clearInterval(timerInterval);
  const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
  const s = String(secondsElapsed % 60).padStart(2, '0');
  winStats.textContent = `${moves} moves · ${m}:${s}`;
  setTimeout(() => winOverlay.classList.add('is-visible'), 400);
}

// ---------- Restart ----------
restartBtn.addEventListener('click', () => {
  lastPoint = null;
  initGame();
});

playAgainBtn.addEventListener('click', () => {
  lastPoint = null;
  initGame();
});

// ---------- Boot ----------
initStarfield();
initGame();
