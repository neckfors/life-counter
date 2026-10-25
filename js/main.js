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
// while tapping a life total) would zoom the page in, on any screen. Block both everywhere. The board
// only uses pointer events, so it can turn off the browser's own touch handling (zoom included)
// altogether.
document.getElementById('board').addEventListener('touchstart', event => event.preventDefault(), { passive: false });
document.addEventListener('gesturestart', event => event.preventDefault());
document.addEventListener('touchmove', event => {
  if (event.touches.length > 1) event.preventDefault();
}, { passive: false });

// The second tap of a quick double tap is cancelled, which also cancels its click, so the click is
// sent by hand instead: quick taps on buttons still all count, and text fields still get focus. A
// finger that moved was a scroll, not a tap, so it gets no click.
let lastTouchEnd = 0;
let touchStart = null;
document.addEventListener('touchstart', event => {
  const { clientX, clientY } = event.changedTouches[0];
  touchStart = { x: clientX, y: clientY };
}, { passive: true });
document.addEventListener('touchend', event => {
  const now = event.timeStamp;
  if (now - lastTouchEnd < 350 && event.touches.length === 0) {
    event.preventDefault();
    const { clientX, clientY } = event.changedTouches[0];
    const tapped = touchStart && Math.hypot(clientX - touchStart.x, clientY - touchStart.y) < 10;
    const field = event.target.closest('input:not([type=checkbox]):not([type=radio]), select, textarea');
    if (field) field.focus();
    else if (tapped) event.target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }
  lastTouchEnd = now;
}, { passive: false });
