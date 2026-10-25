// The settings screen.

import {
  state, BACKGROUNDS, setPlayerCount, setLayout, setColor, setSetting, resetEverything,
} from './state.js';
import { LAYOUTS, getLayout, buildTree } from './layouts.js';
import { el, button, openScreen, openOverlay } from './dom.js';
import { wakeLockSupported, vibrationSupported, fullscreenSupported, appIsFullscreen } from './device.js';
export function openSettings() {
  const { body } = openScreen('Settings');

  // Only the player sections change their own content; the rest are plain inputs.
  const players = el('div');
  const renderPlayers = () => players.replaceChildren(playerCountSection(), layoutSection(), colorSection());
  const rerender = action => () => {
    action();
    renderPlayers();
  };

  function playerCountSection() {
    const section = el('section');
    const options = el('div', 'segmented');
    for (let count = 1; count <= 6; count++) {
      const option = button(String(count), rerender(() => setPlayerCount(count)), 'segment');
      option.classList.toggle('selected', count === state.settings.playerCount);
      options.append(option);
    }
    section.append(el('h2', '', 'Number of players'), options);
    return section;
  }

  function layoutSection() {
    const { playerCount, layouts } = state.settings;
    const selected = getLayout(playerCount, layouts[playerCount]);
    const section = el('section');
    const grid = el('div', 'layout-grid');
    for (const layout of LAYOUTS[playerCount]) {
      const option = button('', rerender(() => setLayout(playerCount, layout.id)), 'layout-option');
      option.classList.toggle('selected', layout === selected);
      const preview = el('div', 'preview');
      preview.style.setProperty('--aspect', `${innerWidth} / ${innerHeight}`);
      preview.append(buildTree(layout.tree, previewArea));
      option.append(preview, el('span', 'layout-name', layout.name));
      grid.append(option);
    }
    section.append(el('h2', '', 'Layout'), grid);
    return section;
  }

  function colorSection() {
    const section = el('section');
    section.append(el('h2', '', 'Player colours'));
    state.players.slice(0, state.settings.playerCount).forEach((player, i) => {
      const row = el('div', 'color-row');
      const swatches = el('div', 'swatches');
      for (const color of BACKGROUNDS) {
        const swatch = button('', rerender(() => setColor(i, color)), 'swatch');
        swatch.style.background = color;
        swatch.classList.toggle('selected', color === player.color);
        swatch.setAttribute('aria-label', color);
        swatches.append(swatch);
      }
      row.append(el('div', 'color-name', player.name), swatches);
      section.append(row);
    });
    return section;
  }

  const game = section('Game', card(
    row('Starting life', stepper('startLife', { min: 1, max: 9999 })),
    row('Die size', stepper('dieSize', { min: 2, max: 1000 })),
    row('Swipe amount', stepper('swipeAmount', { min: 1, max: 100 })),
  ));
  const counters = section('Counters', ...[['One', 'Counter one'], ['Two', 'Counter two']].map(([key, title]) => card(
    row(el('span', 'card-title', title), choice(`showCounter${key}`, [[true, 'Shown'], [false, 'Hidden']])),
    row('Name', textInput(`counter${key}Name`, `Counter#${key === 'One' ? 1 : 2}`),
      'Not shown on the board; only used in History (and as the title when typing a value).',
      { info: true }),
    row('Starting value', stepper(`startCounter${key}`, { min: -999, max: 9999 })),
  )));
  // The installed app always runs fullscreen, so it has no Fullscreen row.
  const device = section('Device', card(
    ...(appIsFullscreen ? [] : [row('Fullscreen', toggle('fullscreen', !fullscreenSupported),
      fullscreenSupported ? 'The browser may still show the status bar at times.' : 'Not available on this device.')]),
    row('Keep screen awake', toggle('keepAwake'),
      wakeLockSupported ? '' : 'Not available here. It works when the app is opened over https.'),
    row('Vibrate on tap', toggle('vibrate'), vibrationSupported ? 'Android only.' : 'Not available on this device.'),
  ));
  const reset = section('Reset',
    button('Reset everything', confirmResetEverything, 'button danger wide'),
    el('p', 'field-hint', 'Resets all settings, life, counters, player names, favourites, styling and history.'),
  );

  renderPlayers();
  body.replaceChildren(game, counters, players, device, reset);
}

function section(title, ...content) {
  const element = el('section');
  element.append(el('h2', '', title), ...content);
  return element;
}

function card(...rows) {
  const element = el('div', 'card');
  element.append(...rows);
  return element;
}

// A label and its control, with an optional hint below. With info, the hint is hidden behind an (i)
// button next to the label.
function row(label, control, hint, { info = false } = {}) {
  const element = el('div', 'card-row');
  const line = el('div', 'card-line');
  const labelElement = typeof label === 'string' ? el('span', 'field-label', label) : label;
  line.append(labelElement, control);
  element.append(line);
  if (!hint) return element;
  const hintElement = el('p', 'field-hint', hint);
  if (info) {
    hintElement.hidden = true;
    const toggle = button('i', () => (hintElement.hidden = !hintElement.hidden), 'info-button');
    toggle.setAttribute('aria-label', 'More information');
    labelElement.append(toggle);
  }
  element.append(hintElement);
  return element;
}

// A number with − and + buttons; the number can also be typed.
function stepper(key, { min, max }) {
  const element = el('div', 'stepper');
  const input = el('input', 'stepper-value');
  input.inputMode = 'numeric';
  input.value = state.settings[key];
  const set = value => {
    const clamped = Math.min(max, Math.max(min, value));
    input.value = clamped;
    setSetting(key, clamped);
  };
  input.addEventListener('change', () => {
    const value = Number.parseInt(input.value, 10);
    if (Number.isNaN(value)) input.value = state.settings[key];
    else set(value);
  });
  element.append(
    button('−', () => set(state.settings[key] - 1), 'step'),
    input,
    button('+', () => set(state.settings[key] + 1), 'step'),
  );
  return element;
}

function textInput(key, fallback) {
  const input = el('input', 'text-field');
  input.maxLength = 24;
  input.autocomplete = 'off';
  input.value = state.settings[key];
  input.addEventListener('change', () => {
    const value = input.value.trim() || fallback;
    input.value = value;
    setSetting(key, value);
  });
  return input;
}

// Segmented buttons choosing between a few values.
function choice(key, options) {
  const element = el('div', 'segmented small');
  const render = () => element.replaceChildren(...options.map(([value, label]) => {
    const option = button(label, () => {
      setSetting(key, value);
      render();
    }, 'segment');
    option.classList.toggle('selected', state.settings[key] === value);
    return option;
  }));
  render();
  return element;
}

function toggle(key, disabled = false) {
  const input = el('input', 'switch');
  input.type = 'checkbox';
  input.checked = state.settings[key];
  input.disabled = disabled;
  input.addEventListener('change', () => setSetting(key, input.checked));
  return input;
}

function confirmResetEverything() {
  const { panel, close } = openOverlay({ className: 'dialog', onDismiss: () => close() });
  const reset = button('Reset', resetEverything, 'button danger');
  const actions = el('div', 'actions');
  actions.append(button('Cancel', () => close()), reset);
  panel.append(
    el('h2', '', 'Reset everything?'),
    el('p', 'hint-text', 'All settings, life, counters, player names, favourites, styling and history go back to their defaults. This cannot be undone.'),
    actions,
  );
}

function previewArea({ player, rot }) {
  const area = el('div', 'preview-area');
  area.style.background = state.players[player].color;
  const label = el('span', '', String(player + 1));
  label.style.setProperty('--rot', `${rot}deg`);
  area.append(label);
  return area;
}
