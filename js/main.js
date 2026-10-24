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
