// Random starting player: a highlight runs around the table through the players' areas, slows down
// and stops on one, which shows "Starts!". Tap anywhere to dismiss.

import { state } from './state.js';
import { getLayout, buildTree } from './layouts.js';
import { el } from './dom.js';
import { vibrate } from './device.js';

const ROUNDS = 3;             // Full laps around the table before slowing down to the result.
const FIRST_STEP_MS = 60;
const LAST_STEP_MS = 420;

let layer = null;
let timer = null;

function close() {
  clearTimeout(timer);
  layer?.remove();
  layer = null;
}

export function pickStartingPlayer() {
  close();
  const { playerCount, layouts } = state.settings;
  const cells = [];
  layer = el('div', 'pick-layer');
  layer.append(buildTree(getLayout(playerCount, layouts[playerCount]).tree, ({ player, rot }) => {
    const area = el('div', 'area pick-area');
    const face = el('div', 'face pick-face');
    face.style.setProperty('--rot', `${rot}deg`);
    if (rot % 180) face.classList.add('sideways');
    face.append(el('div', 'pick-label', 'Starts!'));
    area.append(face);
    cells.push({ player, area });
    return area;
  }));
  layer.addEventListener('click', close);
  document.body.append(layer);

  // Go around the table in seating order (by angle around the middle of the screen), visiting each
  // player once even when they are shown in more than one area.
  const centre = { x: innerWidth / 2, y: innerHeight / 2 };
  const angle = player => {
    const rect = cells.find(cell => cell.player === player).area.getBoundingClientRect();
    return Math.atan2(rect.top + rect.height / 2 - centre.y, rect.left + rect.width / 2 - centre.x);
  };
  const order = [...new Set(cells.map(cell => cell.player))].sort((a, b) => angle(a) - angle(b));

  const chosen = Math.floor(Math.random() * order.length);
  const steps = order.length > 1 ? ROUNDS * order.length + chosen : 0;
  const light = (index, done) => {
    for (const cell of cells) cell.area.classList.toggle('lit', cell.player === order[index]);
    if (done) {
      for (const cell of cells) cell.area.classList.toggle('chosen', cell.player === order[index]);
      vibrate();
    }
  };

  let step = 0;
  const next = () => {
    light(step % order.length, step === steps);
    if (step === steps) return;
    step++;
    const progress = step / steps;
    timer = setTimeout(next, FIRST_STEP_MS + (LAST_STEP_MS - FIRST_STEP_MS) * progress ** 3);
  };
  next();
}
