// The game board: builds each player's area from the layout and handles taps, swipes and holds.

import { state, events, setValue, setName, swapPlayers } from './state.js';
import { getLayout, buildTree } from './layouts.js';
import { el } from './dom.js';
import { openValueDialog, openNameDialog } from './dialogs.js';
import { vibrate } from './device.js';

const MOVE_PX = 15;           // Movement that turns a tap into a swipe.
const HOLD_MS = 1000;         // Holding this long without moving opens a dialog.
const CHANGE_MS = 3000;       // The running change fades this long after the last change.
const MINUS = '−';

const board = document.getElementById('board');
let areas = [];               // One entry per area on screen: { player, rot, life, counterOne, ... }
const runningChanges = new Map();

export function buildBoard() {
  const { playerCount, layouts } = state.settings;
  areas = [];
  board.replaceChildren(buildTree(getLayout(playerCount, layouts[playerCount]).tree, makeArea));
  sizeBoxes();
  render();
}

function makeArea({ player, rot }) {
  const area = el('div', 'area');
  const face = el('div', 'face');
  face.style.setProperty('--rot', `${rot}deg`);
  if (rot % 180) face.classList.add('sideways');

  const life = makeValue('life');

  const name = el('div', 'name');
  const nameText = el('span', 'name-text');
  name.append(nameText);

  const counterOne = makeValue('counterOne');
  const counterTwo = makeValue('counterTwo');
  const counters = el('div', 'counters');
  counters.append(counterOne.element, counterTwo.element);

  face.append(life.element, counters, name);
  area.append(face);
  const entry = { player, rot, area, face, life, counterOne, counterTwo, counters, name, nameText };
  areas.push(entry);
  addGestures(entry);
  return area;
}

function makeValue(field) {
  const element = el('div', field === 'life' ? 'life' : `counter ${field}`);
  const wrap = el('span', 'value');
  const number = el('span', 'number');
  const change = el('span', 'change');
  wrap.append(number, change);
  element.append(wrap);
  return { element, wrap, number, change };
}

function add(player, field, amount) {
  vibrate();
  setValue(player, field, state.players[player][field] + amount);
}

async function editValue(player, field, rot) {
  const s = state.settings;
  const fieldName = { life: 'Life', counterOne: s.counterOneName, counterTwo: s.counterTwoName }[field];
  const value = await openValueDialog({
    title: `${fieldName}: ${state.players[player].name}`,
    current: state.players[player][field],
    rot,
  });
  if (value !== null) setValue(player, field, value);
}

// Choosing a name another player in the game has swaps the two players (name, life and counters),
// e.g. when people sit in different seats than last game.
// The name dialog always opens upright, since the phone keyboard can only appear upright.
async function renamePlayer(player) {
  const others = state.players
    .map((p, i) => ({ name: p.name, i }))
    .slice(0, state.settings.playerCount)
    .filter(({ i }) => i !== player);
  const name = await openNameDialog({ current: state.players[player].name, rot: 0, taken: others.map(o => o.name) });
  if (name === null) return;
  const other = others.find(o => o.name === name);
  if (other) swapPlayers(player, other.i);
  else setName(player, name);
}

// Converts a point on screen into the player's own view of their area: x from the left and y from
// the top, as the player sees it.
function toLocal(entry, clientX, clientY) {
  const rect = entry.area.getBoundingClientRect();
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  const rad = (entry.rot * Math.PI) / 180;
  return {
    x: dx * Math.cos(rad) + dy * Math.sin(rad) + entry.face.offsetWidth / 2,
    y: -dx * Math.sin(rad) + dy * Math.cos(rad) + entry.face.offsetHeight / 2,
  };
}

// Positions (y in the player's view) that decide what a gesture changes.
function landmarks(entry) {
  const { life, counters, name, face } = entry;
  const numberTop = life.element.offsetTop + life.wrap.offsetTop;
  return {
    lifeCentre: life.element.offsetTop + life.element.offsetHeight / 2,
    numberMiddle: numberTop + life.wrap.offsetHeight / 2,
    numberBottom: numberTop + life.wrap.offsetHeight,
    countersTop: counters.hidden ? Infinity : counters.offsetTop,
    nameTop: name.offsetTop,
    width: face.offsetWidth,
  };
}

// The counter at horizontal position x: the left one is counter one, unless only one is shown.
function counterAt(x, width) {
  const { showCounterOne, showCounterTwo } = state.settings;
  if (!showCounterTwo) return 'counterOne';
  if (!showCounterOne) return 'counterTwo';
  return x < width / 2 ? 'counterOne' : 'counterTwo';
}

// Which value a swipe changes (y grows towards the player):
// - Up: reaching the middle of the life number or higher changes life. Otherwise a swipe that starts
//   on or below the counters changes the counter there; anything else changes life.
// - Down: starting on the life number or higher changes life. Otherwise a swipe that stops on or
//   below the counters changes the counter there; anything else changes life.
function swipeTarget(start, end, marks) {
  if (end.y < start.y) {
    if (end.y <= marks.numberMiddle) return 'life';
    return start.y >= marks.countersTop ? counterAt(start.x, marks.width) : 'life';
  }
  if (start.y <= marks.numberBottom) return 'life';
  return end.y >= marks.countersTop ? counterAt(end.x, marks.width) : 'life';
}

// The whole area listens, so a gesture that starts between the numbers or on the name still counts.
// Life: tap the top/bottom half for ±1, swipe for ± the swipe amount. Counters: swipe for ±1, taps do
// nothing. Holding opens the dialog for whatever is under the finger.
function addGestures(entry) {
  const { area, player, rot } = entry;
  const pointers = new Map();

  const hold = point => {
    const marks = landmarks(entry);
    if (point.y >= marks.nameTop) renamePlayer(player);
    else if (point.y >= marks.countersTop) editValue(player, counterAt(point.x, marks.width), rot);
    else editValue(player, 'life', rot);
  };

  area.addEventListener('pointerdown', event => {
    area.setPointerCapture(event.pointerId);
    const gesture = { start: toLocal(entry, event.clientX, event.clientY), x: event.clientX, y: event.clientY };
    gesture.timer = setTimeout(() => {
      gesture.held = true;
      hold(gesture.start);
    }, HOLD_MS);
    pointers.set(event.pointerId, gesture);
  });

  area.addEventListener('pointermove', event => {
    const gesture = pointers.get(event.pointerId);
    if (!gesture || gesture.moved || gesture.held) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= MOVE_PX) {
      gesture.moved = true;
      clearTimeout(gesture.timer);
    }
  });

  const end = event => {
    const gesture = pointers.get(event.pointerId);
    if (!gesture) return;
    pointers.delete(event.pointerId);
    clearTimeout(gesture.timer);
    if (gesture.held || event.type === 'pointercancel') return;

    const { start } = gesture;
    const marks = landmarks(entry);
    if (gesture.moved) {
      const stop = toLocal(entry, event.clientX, event.clientY);
      if (Math.abs(stop.y - start.y) < MOVE_PX) return;
      const direction = stop.y < start.y ? 1 : -1;
      const field = swipeTarget(start, stop, marks);
      add(player, field, field === 'life' ? direction * state.settings.swipeAmount : direction);
    } else if (start.y < marks.countersTop && start.y < marks.nameTop) {
      add(player, 'life', start.y < marks.lifeCentre ? 1 : -1);
    }
  };
  area.addEventListener('pointerup', end);
  area.addEventListener('pointercancel', end);
}

function formatChange(delta) {
  if (delta === 0) return '';
  return delta > 0 ? `+${delta}` : `${MINUS}${-delta}`;
}

function showRunningChange(player, field, delta) {
  const key = `${player}:${field}`;
  const running = runningChanges.get(key) ?? { delta: 0 };
  clearTimeout(running.timer);
  running.delta += delta;
  running.timer = setTimeout(() => {
    runningChanges.delete(key);
    renderChange(player, field, null);
  }, CHANGE_MS);
  runningChanges.set(key, running);
  renderChange(player, field, running.delta);
}

function renderChange(player, field, delta) {
  for (const area of areas.filter(area => area.player === player)) {
    const { change } = area[field];
    const visible = delta !== null && delta !== 0;
    if (visible) change.textContent = formatChange(delta);
    change.classList.toggle('visible', visible);
  }
}

function clearRunningChanges() {
  for (const [key, running] of runningChanges) {
    clearTimeout(running.timer);
    const [player, field] = key.split(':');
    renderChange(Number(player), field, null);
  }
  runningChanges.clear();
}

export function render() {
  const s = state.settings;
  const bothHidden = !s.showCounterOne && !s.showCounterTwo;
  for (const area of areas) {
    const player = state.players[area.player];
    area.area.style.setProperty('--bg', player.color);
    area.nameText.textContent = player.name;
    area.life.number.textContent = player.life;
    area.counterOne.number.textContent = player.counterOne;
    area.counterTwo.number.textContent = player.counterTwo;
    area.counterOne.element.hidden = !s.showCounterOne;
    area.counterTwo.element.hidden = !s.showCounterTwo;
    area.counters.hidden = bothHidden;
  }
  fitNumbers();
}

// A number keeps its normal size unless it would run past its space (e.g. 100 life, or a large
// Styling size); then only that number shrinks just enough to fit. It grows back when it fits again.
const FIT_WIDTH = 0.92;       // Share of the space's width a number may use.

function fitNumbers() {
  const values = areas.flatMap(area => [area.life, area.counterOne, area.counterTwo]);
  for (const { wrap } of values) wrap.style.removeProperty('--fit');
  const fits = values.map(({ element, wrap }) => {
    if (!element.clientWidth || !wrap.offsetWidth) return 1;
    return Math.min(1, (element.clientWidth * FIT_WIDTH) / wrap.offsetWidth, element.clientHeight / wrap.offsetHeight);
  });
  values.forEach(({ wrap }, i) => {
    if (fits[i] < 1) wrap.style.setProperty('--fit', fits[i]);
  });
}

// The new size or typeface is applied by styling.js in the same event, so measure once it is done.
events.addEventListener('styling', () => queueMicrotask(fitNumbers));
document.fonts?.addEventListener('loadingdone', fitNumbers);

// Every player's content (life, counters, name) sits in a box of the same size, centred in their
// area, so all text is the same size for everyone. The box is the largest that fits in every area
// as its player sees it; the rest of a bigger area is just the player's colour.
function sizeBoxes() {
  if (!areas.length) return;
  const views = areas.map(({ area, rot }) =>
    rot % 180 ? [area.clientHeight, area.clientWidth] : [area.clientWidth, area.clientHeight]);
  board.style.setProperty('--face-w', `${Math.min(...views.map(([w]) => w))}px`);
  board.style.setProperty('--face-h', `${Math.min(...views.map(([, h]) => h))}px`);
  fitNumbers();
}

new ResizeObserver(sizeBoxes).observe(board);

events.addEventListener('change', ({ detail }) => {
  render();
  showRunningChange(detail.player, detail.field, detail.to - detail.from);
});
events.addEventListener('name', render);
events.addEventListener('colors', render);
events.addEventListener('settings', render);
events.addEventListener('reset', () => {
  clearRunningChanges();
  render();
});
events.addEventListener('swap', () => {
  clearRunningChanges();
  render();
});
events.addEventListener('layout', () => {
  clearRunningChanges();
  buildBoard();
});
