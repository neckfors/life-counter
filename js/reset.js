// Reset life (and counters), with an Undo button for a few seconds afterwards. Undo restores the
// values and the history from before the reset.

import { FIELDS, events, resetValues, restoreValues } from './state.js';
import { recordReset, snapshot, restore } from './history.js';
import { button } from './dom.js';

const UNDO_MS = 5000;

let undo = null;   // { button, timer }

export function reset(includeCounters) {
  hideUndo();
  const savedHistory = snapshot();
  const before = resetValues(includeCounters ? FIELDS : ['life']);
  recordReset(before, includeCounters ? FIELDS : ['life'], Date.now());

  const undoButton = button('Undo reset', () => {
    hideUndo();
    restoreValues(before);
    restore(savedHistory);
  }, 'undo-button');
  document.body.append(undoButton);
  undo = { button: undoButton, timer: setTimeout(hideUndo, UNDO_MS) };
}

function hideUndo() {
  if (!undo) return;
  clearTimeout(undo.timer);
  undo.button.remove();
  undo = null;
}

// Once the game continues, undoing the reset would throw those changes away.
events.addEventListener('change', hideUndo);
events.addEventListener('layout', hideUndo);
