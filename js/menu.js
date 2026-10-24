// The centre menu.

import { state } from './state.js';
import { el, button, openOverlay } from './dom.js';
import { reset } from './reset.js';
import { rollForAll, rollOne } from './dice.js';
import { pickStartingPlayer } from './first-player.js';
import { openHelp } from './help.js';
import { openSettings } from './settings.js';
import { openHistory } from './history-screen.js';
import { openStyling } from './styling.js';
import { fullscreenSupported, toggleFullscreen } from './device.js';

export function openMenu() {
  const { panel, close } = openOverlay({ className: 'menu', onDismiss: () => close() });

  const item = (text, action) => button(text, () => {
    close();
    action();
  }, 'menu-item');
  const pair = (...items) => {
    const row = el('div', 'menu-pair');
    row.append(...items);
    return row;
  };

  panel.append(
    pair(item('Reset life', () => reset(false)), item('Reset life and counters', () => reset(true))),
    pair(item('Roll for all players', rollForAll), item('Roll one die', rollOne)),
    item('Random starting player', pickStartingPlayer),
    pair(item('History', openHistory), item('Styling', openStyling)),
    pair(item('Settings', openSettings), item('Help', openHelp)),
  );

  if (fullscreenSupported) {
    const fullscreen = item('Fullscreen', toggleFullscreen);
    const indicator = el('span', 'switch-indicator');
    indicator.classList.toggle('on', state.settings.fullscreen);
    fullscreen.append(indicator);
    panel.append(fullscreen);
  }
}
