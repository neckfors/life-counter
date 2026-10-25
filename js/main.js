import './history.js';
import { buildBoard } from './board.js';
import { openMenu } from './menu.js';
import { applyStyling } from './styling.js';
import { initDevice } from './device.js';
import { initUpdates } from './update.js';

applyStyling();
buildBoard();
initDevice();
initUpdates();
document.getElementById('menu-button').addEventListener('click', openMenu);

// A long press would otherwise open the browser's context menu.
document.addEventListener('contextmenu', event => event.preventDefault());

// iPhones ignore user-scalable=no in the viewport tag, so a pinch or a quick double tap (easy to do
// while tapping a life total) would zoom the page in. Block both; buttons and text fields keep
// their normal taps.
document.addEventListener('gesturestart', event => event.preventDefault());
let lastTouchEnd = 0;
document.addEventListener('touchend', event => {
  const now = event.timeStamp;
  if (now - lastTouchEnd < 350 && !event.target.closest('button, a, input, select, textarea, label')) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });
