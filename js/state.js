// Game state, defaults and persistence. Everything is saved after every change, since the browser
// may kill a background tab without warning.

const STORAGE_KEY = 'neckfors-life-counter';

export const PLAYER_NAMES = ['Player one', 'Player two', 'Player three', 'Player four', 'Player five', 'Player six'];

// The first six are the default background colours of players one to six.
export const BACKGROUNDS = [
  '#2980b9', '#5d9451', '#9b59b6', '#d35400', '#16a085', '#c2588f',
  '#c0392b', '#2c3e50', '#7f8c8d', '#8e5a3c', '#b7950b', '#000000',
];

export const FIELDS = ['life', 'counterOne', 'counterTwo'];

function defaults() {
  return {
    settings: {
      playerCount: 2,
      layouts: {},
      startLife: 20,
      startCounterOne: 0,
      startCounterTwo: 0,
      showCounterOne: true,
      showCounterTwo: true,
      counterOneName: 'Counter#1',
      counterTwoName: 'Counter#2',
      dieSize: 6,
      swipeAmount: 5,
      fullscreen: false,
      keepAwake: true,
      vibrate: false,
    },
    players: PLAYER_NAMES.map((name, i) => ({
      name,
      life: 20,
      counterOne: 0,
      counterTwo: 0,
      color: BACKGROUNDS[i],
    })),
    favorites: [],
    styling: {
      size: { life: 1, name: 1, counters: 1 },
      font: { life: 'normal', name: 'normal', counters: 'normal' },
      color: { life: '#ffffff', name: '#ffffff', counterOne: '#ffffff', counterTwo: '#89c4f4' },
    },
  };
}

function load() {
  const state = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      Object.assign(state.settings, saved.settings);
      state.players.forEach((player, i) => Object.assign(player, saved.players?.[i]));
      if (saved.favorites) state.favorites = saved.favorites;
      for (const kind in state.styling) Object.assign(state.styling[kind], saved.styling?.[kind]);
    }
  } catch {
    // Unreadable or blocked storage: start with the defaults.
  }
  return state;
}

export const state = load();

// Fired events: 'change' (detail: { player, field, from, to }), 'name', 'reset', 'layout', 'colors',
// 'favorites', 'settings' (detail: { key }), 'styling'.
export const events = new EventTarget();

function emit(type, detail) {
  events.dispatchEvent(new CustomEvent(type, { detail }));
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Nothing more we can do; the game still works for this session.
  }
}

export function startValue(field) {
  const s = state.settings;
  return { life: s.startLife, counterOne: s.startCounterOne, counterTwo: s.startCounterTwo }[field];
}

export function setValue(player, field, to) {
  const from = state.players[player][field];
  if (to === from) return;
  state.players[player][field] = to;
  save();
  emit('change', { player, field, from, to });
}

export function setName(player, name) {
  if (name === state.players[player].name) return;
  state.players[player].name = name;
  save();
  emit('name', { player });
}

// Returns each player's values from before the reset, for history and undo.
export function resetValues(fields) {
  const players = state.players.slice(0, state.settings.playerCount);
  const before = players.map(({ life, counterOne, counterTwo }) => ({ life, counterOne, counterTwo }));
  for (const player of players) {
    for (const field of fields) player[field] = startValue(field);
  }
  save();
  emit('reset');
  return before;
}

export function restoreValues(before) {
  before.forEach((values, i) => Object.assign(state.players[i], values));
  save();
  emit('reset');
}

export function setPlayerCount(count) {
  const old = state.settings.playerCount;
  if (count === old) return;
  // Players that are added get starting values; existing players keep theirs.
  for (const player of state.players.slice(old, count)) {
    for (const field of FIELDS) player[field] = startValue(field);
  }
  state.settings.playerCount = count;
  save();
  emit('layout');
}

export function setLayout(count, id) {
  state.settings.layouts[count] = id;
  save();
  emit('layout');
}

export function setColor(player, color) {
  state.players[player].color = color;
  save();
  emit('colors');
}

export function setSetting(key, value) {
  if (state.settings[key] === value) return;
  state.settings[key] = value;
  save();
  emit('settings', { key });
}

export function setStyle(kind, element, value) {
  state.styling[kind][element] = value;
  save();
  emit('styling');
}

// Settings, names, favourites, styling and history all go back to their defaults.
export function resetEverything() {
  try {
    localStorage.clear();
  } catch {
    // Nothing more we can do.
  }
  location.reload();
}

export function toggleFavorite(name) {
  const favorites = state.favorites;
  const index = favorites.indexOf(name);
  if (index >= 0) favorites.splice(index, 1);
  else favorites.push(name);
  favorites.sort((a, b) => a.localeCompare(b));
  save();
  emit('favorites');
}
