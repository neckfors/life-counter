// The centre menu: a grid of equal tiles, two per row, each with an icon and a label.

import { state, events } from './state.js';
import { el, button, openOverlay } from './dom.js';
import { reset } from './reset.js';
import { rollForAll, rollOne } from './dice.js';
import { pickStartingPlayer } from './first-player.js';
import { openHelp, PAYPAL_URL } from './help.js';
import { openSettings } from './settings.js';
import { openHistory } from './history-screen.js';
import { openStyling } from './styling.js';
import { fullscreenSupported, toggleFullscreen } from './device.js';

// A gear: 8 teeth around a hole, drawn as one outline.
function gearPath(teeth = 8, outer = 10, inner = 7.6) {
  const points = [];
  for (let i = 0; i < teeth; i++) {
    const step = (2 * Math.PI) / teeth;
    const start = i * step - Math.PI / 2;
    // Each tooth: up the left flank, across the top, down the right flank, then along the base.
    for (const [angle, radius] of [[0, inner], [0.18, outer], [0.5, outer], [0.68, inner]]) {
      const a = start + angle * step;
      points.push(`${(12 + radius * Math.cos(a)).toFixed(2)} ${(12 + radius * Math.sin(a)).toFixed(2)}`);
    }
  }
  return `<path d="M${points.join('L')}Z"/><circle cx="12" cy="12" r="3"/>`;
}

// Simple line icons (24×24, drawn with the current text colour).
const ICONS = {
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
  resetAll: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/><circle cx="12" cy="12" r="2.2"/>',
  dice: '<rect x="2.5" y="8" width="11" height="11" rx="2.5"/><path d="M10.5 5.5l1-2.4a2 2 0 0 1 2.6-1l5.6 2.4a2 2 0 0 1 1 2.6l-2.3 5.5"/><circle cx="6" cy="11.5" r=".9"/><circle cx="10" cy="15.5" r=".9"/>',
  die: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="15.5" cy="15.5" r="1"/>',
  start: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  fullscreen: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  styling: '<path d="M4 19l5-14 5 14M5.8 14h6.4"/><path d="M15.5 12.5a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6zM18.3 12.5V19"/>',
  settings: gearPath(),
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4"/><circle cx="12" cy="17" r=".6"/>',
  support: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
};

function icon(name) {
  const wrap = el('span', 'menu-icon');
  wrap.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  return wrap;
}

export function openMenu() {
  const { panel, close } = openOverlay({ className: 'menu', onDismiss: () => close() });

  const tile = (iconName, text, action) => {
    const element = button('', () => {
      close();
      action();
    }, 'menu-item');
    element.append(icon(iconName), el('span', 'menu-label', text));
    return element;
  };

  const starting = tile('start', 'Random starting player', pickStartingPlayer);
  const tiles = [
    tile('reset', 'Reset life', () => reset(false)),
    tile('resetAll', 'Reset life and counters', () => reset(true)),
    tile('dice', 'Roll for all players', rollForAll),
    tile('die', 'Roll one die', rollOne),
    starting,
  ];
  if (fullscreenSupported) {
    // Switches in place and keeps the menu open, so the change is visible and more can be done.
    const label = el('span', 'menu-label');
    const fullscreen = button('', () => {
      toggleFullscreen();
      show();
    }, 'menu-item');
    const show = () => {
      const on = state.settings.fullscreen;
      label.textContent = `Fullscreen: ${on ? 'on' : 'off'}`;
      fullscreen.classList.toggle('on', on);
    };
    fullscreen.append(icon('fullscreen'), label);
    show();
    // The setting also changes on its own (the browser refuses, or fullscreen is left with the back
    // gesture), so the tile follows it while the menu is open.
    const follow = ({ detail }) => {
      if (!fullscreen.isConnected) events.removeEventListener('settings', follow);
      else if (detail.key === 'fullscreen') show();
    };
    events.addEventListener('settings', follow);
    tiles.push(fullscreen);
  } else {
    starting.classList.add('wide');
  }
  tiles.push(
    tile('history', 'History', openHistory),
    tile('styling', 'Styling', openStyling),
    tile('settings', 'Settings', openSettings),
    tile('help', 'Help', openHelp),
  );
  if (PAYPAL_URL) {
    const support = tile('support', 'Support the app', () => open(PAYPAL_URL, '_blank', 'noopener'));
    support.classList.add('wide', 'slim');
    tiles.push(support);
  }
  panel.append(...tiles);
}
