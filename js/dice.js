// Dice. Results are shown in a layer with the same layout as the board, so each player sees their
// die facing them. Each die is thrown in from the player's own edge: it tumbles through the air,
// bounces a few times (with a shadow and a puff of dust) and comes to rest showing the result. Every
// die is a 3D cube: a d6 has pips; other sizes have numbers on all sides that keep changing while
// it rolls and stop on the result when it lands. For "roll for all players" the dice
// are thrown one after another. "Roll one die" with a d6 throws a single die into the middle of
// the screen from a random side, since a cube can be read from anywhere around the table. Tap
// anywhere (except a button) to dismiss.

import { state } from './state.js';
import { getLayout, buildTree } from './layouts.js';
import { el, button } from './dom.js';
import { vibrate } from './device.js';

const THROW_MS = 1300;        // From leaving the edge to coming to rest.
const STAGGER_MS = 180;       // Delay between dice when rolling for all players.
// Bounces as [start, end, peak height relative to the die size], in parts of THROW_MS. The die has
// stopped travelling by the end of the last one.
const BOUNCES = [[0, 0.34, 0.9], [0.34, 0.66, 0.42], [0.66, 0.84, 0.14]];
const REST = 0.84;
const FLICKER_MS = 60;        // How often the numbers change while a non-d6 die rolls.
const CONFETTI = 28;
const CONFETTI_COLORS = ['#f1c40f', '#f7d64a', '#ffe9a0', '#ffffff', '#e67e22'];

let layer = null;
let cells = [];               // { key, face, die, label, action }
let timers = [];

function roll() {
  return 1 + Math.floor(Math.random() * state.settings.dieSize);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function later(fn, ms) {
  timers.push(setTimeout(fn, ms));
}

// --- Drawing ---------------------------------------------------------------------------------

const PIPS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
};

// Where each value sits on the cube (opposite sides add up to 7), and the cube rotation that brings
// it to the front.
const CUBE_FACES = {
  1: { place: 'rotateY(0deg)', show: [0, 0] },
  6: { place: 'rotateY(180deg)', show: [0, 180] },
  3: { place: 'rotateY(90deg)', show: [0, -90] },
  4: { place: 'rotateY(-90deg)', show: [0, 90] },
  2: { place: 'rotateX(90deg)', show: [-90, 0] },
  5: { place: 'rotateX(-90deg)', show: [90, 0] },
};

function pipsSvg(value) {
  const pips = PIPS[value].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('');
  return `<svg viewBox="0 0 100 100">${pips}</svg>`;
}

function setNumber(number, value) {
  number.textContent = value;
  number.style.setProperty('--fs', [0, 0.5, 0.42, 0.32, 0.25][Math.min(String(value).length, 4)]);
}

// Builds the die: its shadow, a wrapper for the throw, and the cube. A d6 has pips; other sizes have
// a number on each side. Returns the parts to animate, and the number on each side (by slot 1–6).
function buildDie(cell) {
  const shadow = el('div', 'die-shadow');
  const thrown = el('div', 'die-throw');
  const body = el('div', 'cube');
  const numbers = {};
  for (const [slot, { place }] of Object.entries(CUBE_FACES)) {
    const side = el('div', 'cube-face');
    side.style.transform = `${place} translateZ(calc(var(--s) / 2))`;
    if (state.settings.dieSize === 6) {
      side.innerHTML = pipsSvg(Number(slot));
    } else {
      numbers[slot] = el('div', 'cube-number');
      setNumber(numbers[slot], roll());
      side.append(numbers[slot]);
    }
    body.append(side);
  }
  thrown.append(body);
  cell.die.replaceChildren(shadow, thrown);
  return { shadow, thrown, body, numbers };
}

// --- Animation -------------------------------------------------------------------------------

// The path of a throw: along the table from the player's edge to the middle, with bounces. Returns
// keyframes for the die and for its shadow on the table.
function throwPath(startY, startX, size) {
  const die = [];
  const shadow = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const travel = 1 - (1 - Math.min(t / REST, 1)) ** 2;
    const x = startX * (1 - travel);
    const ground = startY * (1 - travel);
    let height = 0;
    for (const [from, to, peak] of BOUNCES) {
      if (t >= from && t <= to) {
        const u = (t - from) / (to - from);
        height = 4 * peak * size * u * (1 - u);
      }
    }
    die.push({ offset: t, transform: `translate(${x}px, ${ground - height}px) scale(${1 + height / (3 * size)})` });
    shadow.push({
      offset: t,
      transform: `translate(${x}px, ${ground}px) scale(${1 - height / (2.5 * size)})`,
      opacity: 0.55 - height / (2.5 * size),
    });
  }
  return { die, shadow };
}

// The spin: several turns that end with the side in slot facing up, slightly askew like a real die.
function spinFrames(slot) {
  const tilt = random(-14, 14);
  const [x, y] = CUBE_FACES[slot].show;
  const turnsX = 360 * Math.round(random(2, 3));
  const turnsY = 360 * Math.round(random(1, 2));
  return [
    { transform: `rotateZ(${tilt - 160}deg) rotateX(${x - turnsX}deg) rotateY(${y - turnsY}deg)` },
    { transform: `rotateZ(${tilt}deg) rotateX(${x}deg) rotateY(${y}deg)` },
  ];
}

function dust(cell, x, y) {
  const puff = el('span', 'dust');
  puff.style.translate = `${x}px ${y}px`;
  cell.die.append(puff);
  puff.animate(
    [{ transform: 'scale(0.3)', opacity: 0.5 }, { transform: 'scale(1.7)', opacity: 0 }],
    { duration: 450, easing: 'ease-out' },
  ).onfinish = () => puff.remove();
}

// Throws the die of every cell with the given key, after delay ms, landing on value. Calls onLanded
// once it has come to rest.
function throwDie(key, value, delay, onLanded) {
  const group = cells.filter(cell => cell.key === key);
  for (const cell of group) {
    cell.face.classList.remove('winner', 'tie', 'out');
    cell.label.textContent = '';
    cell.action.replaceChildren();
    const { shadow, thrown, body, numbers } = buildDie(cell);
    // A d6 lands with the side showing value up; other sizes land on any side, which then shows value.
    const isD6 = state.settings.dieSize === 6;
    const slot = isD6 ? value : 1 + Math.floor(random(0, 6));

    // Start just beyond the edge nearest the player (the bottom of their area as they see it).
    const size = cell.die.offsetWidth;
    const startY = cell.face.offsetHeight - cell.die.offsetTop + size * 0.2;
    const startX = random(-0.35, 0.35) * size;
    const path = throwPath(startY, startX, size);
    const timing = { duration: THROW_MS, delay, fill: 'both' };
    thrown.animate(path.die, timing);
    shadow.animate(path.shadow, timing);
    body.animate(spinFrames(slot), { ...timing, duration: THROW_MS * REST, easing: 'cubic-bezier(0.2, 0.6, 0.35, 1)' });

    for (const [, end] of BOUNCES) {
      const t = end * THROW_MS;
      const travel = 1 - (1 - Math.min(end / REST, 1)) ** 2;
      later(() => dust(cell, startX * (1 - travel), startY * (1 - travel) + size * 0.42), delay + t);
    }

    // Other sizes: the numbers on all sides keep changing while the die rolls, and stop when it
    // lands, with the result on the side facing up.
    if (!isD6) {
      let flicker;
      later(() => {
        flicker = setInterval(() => Object.values(numbers).forEach(number => setNumber(number, roll())), FLICKER_MS);
        timers.push(flicker);
      }, delay);
      later(() => {
        clearInterval(flicker);
        setNumber(numbers[slot], value);
        numbers[slot].classList.add('reveal');
      }, delay + THROW_MS * REST);
    }
  }
  later(() => {
    vibrate();
    onLanded();
  }, delay + THROW_MS * REST);
}

function confetti(cell) {
  const size = cell.die.offsetWidth;
  for (let i = 0; i < CONFETTI; i++) {
    const piece = el('span', 'confetti');
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    cell.die.append(piece);
    const dx = random(-1.3, 1.3) * size;
    const up = random(0.7, 1.5) * size;
    const spin = random(-720, 720);
    piece.animate([
      { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.7}px, ${-up}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.4 },
      { transform: `translate(${dx}px, ${-up + size * 0.9}px) rotate(${spin}deg)`, opacity: 0 },
    ], { duration: random(1000, 1500), easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' }).onfinish = () => piece.remove();
  }
}

// --- Layer -----------------------------------------------------------------------------------

// Merges neighbouring areas that face the same way into one, so one die can be shown once per
// direction instead of once per player.
function byDirection(node) {
  if (!node.items) return node;
  const items = node.items.map(byDirection);
  if (items.every(item => !item.items && item.rot === items[0].rot)) return { ...items[0], w: node.w };
  return { ...node, items };
}

// mode: 'players' (one area per player, as on the board), 'directions' (one per direction players
// face) or 'single' (one die over the whole screen, thrown in from a random side).
function openLayer(mode) {
  closeLayer();
  const { playerCount, layouts } = state.settings;
  const board = getLayout(playerCount, layouts[playerCount]).tree;
  const tree = mode === 'players' ? board
    : mode === 'directions' ? byDirection(board)
    : { player: 0, rot: 90 * Math.floor(random(0, 4)), w: 1 };
  cells = [];
  layer = el('div', `dice-layer ${mode}`);
  layer.append(buildTree(tree, ({ player, rot }) => {
    const area = el('div', 'area dice-area');
    const face = el('div', 'face dice-face');
    face.style.setProperty('--rot', `${rot}deg`);
    if (rot % 180) face.classList.add('sideways');
    const cell = {
      key: mode === 'players' ? player : 'one',
      face,
      die: el('div', 'die'),
      label: el('div', 'die-label'),
      action: el('div', 'die-action'),
    };
    face.append(cell.die, cell.label, cell.action);
    area.append(face);
    cells.push(cell);
    return area;
  }));
  layer.addEventListener('click', event => {
    if (!event.target.closest('button')) closeLayer();
  });
  document.body.append(layer);
}

function closeLayer() {
  // Timeouts and intervals share ids, so clearTimeout stops both.
  timers.forEach(clearTimeout);
  timers = [];
  layer?.remove();
  layer = null;
}

// --- Rolling ---------------------------------------------------------------------------------

// Rolls for every player; the highest is highlighted. On a tie, the tied players can re-roll, and
// only they stay in the running.
export function rollForAll() {
  openLayer('players');
  const results = new Map();
  const dieName = `d${state.settings.dieSize}`;

  const finish = contenders => {
    const best = Math.max(...contenders.map(player => results.get(player)));
    const tied = contenders.filter(player => results.get(player) === best);
    for (const cell of cells) {
      const inRunning = contenders.includes(cell.key);
      const isBest = inRunning && results.get(cell.key) === best && contenders.length > 1;
      const isTied = isBest && tied.length > 1;
      cell.face.classList.toggle('out', !inRunning);
      cell.face.classList.toggle('winner', isBest && !isTied);
      cell.face.classList.toggle('tie', isTied);
      cell.label.textContent = isTied ? 'Tie!' : isBest ? 'Highest!' : dieName;
      if (isBest && !isTied) confetti(cell);
      if (isTied) cell.action.replaceChildren(button('Re-roll tied', () => rollPlayers(tied), 'button die-button'));
    }
  };

  const rollPlayers = players => {
    let landed = 0;
    players.forEach((player, i) => {
      results.set(player, roll());
      throwDie(player, results.get(player), i * STAGGER_MS, () => {
        if (++landed === players.length) finish(players);
      });
    });
  };

  rollPlayers([...Array(state.settings.playerCount).keys()]);
}

// Rolls one die. A d6 is a single die in the middle of the screen, thrown from a random side; other
// sizes are shown once for each direction players are facing.
export function rollOne() {
  if (state.settings.dieSize === 6) {
    openLayer('single');
    const again = button('Roll again', () => {
      again.hidden = true;
      rollOne();
    }, 'button die-button die-again');
    again.hidden = true;
    layer.append(again);
    throwDie('one', roll(), 0, () => (again.hidden = false));
    return;
  }
  openLayer('directions');
  const rollAgain = () => throwDie('one', roll(), 0, () => {
    for (const cell of cells) {
      cell.label.textContent = `d${state.settings.dieSize}`;
      cell.action.replaceChildren(button('Roll again', rollAgain, 'button die-button'));
    }
  });
  rollAgain();
}
