// Records changes, following the old app's HistoryHandler:
// - A change by the same player to the same value within MERGE_MS updates the last entry instead of
//   adding a new one; if the value returns to where it started, the entry is removed.
// - No-op changes are never recorded.
// - The simple history (score sheet) also inserts a player's starting value before their first
//   change, and skips a row identical to that player's previous row.
// - A reset starts a new score sheet; the detailed history is only emptied by its Clear button.

import { state, events } from './state.js';

const STORAGE_KEY = 'neckfors-life-counter-history';
const MERGE_MS = 3000;
const MAX_ENTRIES = 200;

export const history = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return { simple: saved.simple ?? [], detailed: saved.detailed ?? [] };
  } catch {
    // Unreadable or blocked storage: start with an empty history.
  }
  return { simple: [], detailed: [] };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Nothing more we can do.
  }
}

function makeEntry(player, field, from, time, reset = false) {
  const s = state.settings;
  const p = state.players[player];
  return {
    time, player, field, from, reset,
    name: p.name,
    life: p.life,
    counterOne: p.counterOne,
    counterTwo: p.counterTwo,
    counterOneName: s.counterOneName,
    counterTwoName: s.counterTwoName,
    showCounterOne: s.showCounterOne,
    showCounterTwo: s.showCounterTwo,
  };
}

function push(list, entry) {
  list.push(entry);
  while (list.length > MAX_ENTRIES) list.shift();
}

// Merges entry into the last one in list if it continues the same change. Returns true if merged.
function merge(list, entry) {
  const last = list.at(-1);
  if (!last || last.reset || entry.reset || last.player !== entry.player || last.field !== entry.field
      || entry.time - last.time >= MERGE_MS) {
    return false;
  }
  if (entry[entry.field] === last.from) {
    list.pop();
  } else {
    last.time = entry.time;
    last[entry.field] = entry[entry.field];
  }
  return true;
}

function sameRow(a, b) {
  return a.life === b.life && a.counterOne === b.counterOne && a.counterTwo === b.counterTwo && a.name === b.name;
}

function addDetailed(entry) {
  if (entry[entry.field] === entry.from) return;
  if (!merge(history.detailed, entry)) push(history.detailed, entry);
}

function addSimple(entry) {
  const simple = history.simple;
  const previous = simple.findLast(e => e.player === entry.player);
  if (!previous) {
    push(simple, { ...entry, [entry.field]: entry.from });
    push(simple, entry);
  } else if (!merge(simple, entry) && !sameRow(previous, entry)) {
    push(simple, entry);
  }
}

events.addEventListener('change', ({ detail }) => {
  const entry = makeEntry(detail.player, detail.field, detail.from, Date.now());
  addDetailed(entry);
  addSimple({ ...entry });
  save();
});

// Called after a reset. before[player] holds each player's values from before the reset.
export function recordReset(before, fields, time) {
  history.simple = [];
  before.forEach((values, player) => {
    for (const field of fields) addDetailed(makeEntry(player, field, values[field], time, true));
    push(history.simple, makeEntry(player, 'life', values.life, time, true));
  });
  save();
}

export function clearDetailed() {
  history.detailed = [];
  save();
}

export function snapshot() {
  return structuredClone(history);
}

export function restore(saved) {
  history.simple = saved.simple;
  history.detailed = saved.detailed;
  save();
}
