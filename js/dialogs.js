// The dialogs opened by holding a value or a name. Both are rotated to face the player.

import { state, toggleFavorite } from './state.js';
import { el, button, openOverlay } from './dom.js';

const MAX_DIGITS = 4;
const MINUS = '−';

// Resolves with the new value, or null if cancelled. "14" sets the value, "+3" / "-7" changes it.
export function openValueDialog({ title, current, rot }) {
  return new Promise(resolve => {
    let sign = '';
    let digits = '';

    const finish = value => {
      document.removeEventListener('keydown', onKey);
      close();
      resolve(value);
    };
    const { panel, close } = openOverlay({ rot, className: 'dialog', onDismiss: () => finish(null) });

    const display = el('div', 'entry');
    const ok = button('OK', () => {
      if (!digits) return;
      const number = Number(digits);
      finish(sign === '+' ? current + number : sign === '-' ? current - number : number);
    });
    ok.classList.add('primary');

    const update = () => {
      const text = (sign === '-' ? MINUS : sign) + digits;
      display.textContent = text || ' ';
      display.classList.toggle('empty', !text);
      ok.disabled = !digits;
    };
    const press = key => {
      if (key === '+' || key === '-') sign = sign === key ? '' : key;
      else if (key === 'back') digits ? (digits = digits.slice(0, -1)) : (sign = '');
      else if (digits.length < MAX_DIGITS) digits = (digits + key).replace(/^0+(?=\d)/, '');
      update();
    };
    const onKey = event => {
      if (/^[0-9+-]$/.test(event.key)) press(event.key);
      else if (event.key === 'Backspace') press('back');
      else if (event.key === 'Enter') ok.click();
      else if (event.key === 'Escape') finish(null);
    };
    document.addEventListener('keydown', onKey);

    const keypad = el('div', 'keypad');
    for (const key of ['7', '8', '9', '4', '5', '6', '1', '2', '3', '+', '0', '-']) {
      keypad.append(button(key === '-' ? MINUS : key, () => press(key), 'key'));
    }

    const entryRow = el('div', 'entry-row');
    entryRow.append(display, button('⌫', () => press('back'), 'key back'));

    const actions = el('div', 'actions');
    actions.append(button('Cancel', () => finish(null)), ok);

    panel.append(
      el('h2', '', title),
      el('p', 'hint-text', `Now ${current}. Type 14 to set, +3 or ${MINUS}7 to change.`),
      entryRow, keypad, actions,
    );
    update();
  });
}

// Resolves with the new name, or null if cancelled. Tapping a favourite picks it straight away;
// favourites in taken (names other players already use) are greyed out.
export function openNameDialog({ current, rot, taken }) {
  return new Promise(resolve => {
    const finish = value => {
      close();
      resolve(value);
    };
    const { panel, close } = openOverlay({ rot, className: 'dialog', onDismiss: () => finish(null) });

    const form = el('form');
    const input = el('input', 'text-input');
    input.value = current;
    input.maxLength = 24;
    input.autocomplete = 'off';
    input.enterKeyHint = 'done';

    const star = button('', () => {
      toggleFavorite(input.value.trim());
      update();
    }, 'star');
    const inputRow = el('div', 'input-row');
    inputRow.append(input, star);

    const favorites = el('div', 'favorites');
    const ok = el('button', 'button primary', 'OK');

    const update = () => {
      const name = input.value.trim();
      ok.disabled = !name;
      star.disabled = !name;
      const isFavorite = state.favorites.includes(name);
      star.textContent = isFavorite ? '★' : '☆';
      star.classList.toggle('on', isFavorite);
      star.setAttribute('aria-label', isFavorite ? 'Remove from favourites' : 'Save as favourite');

      favorites.replaceChildren();
      if (!state.favorites.length) return;
      const chips = el('div', 'chips');
      for (const favorite of state.favorites) {
        const chip = el('div', 'chip');
        const pick = button(favorite, () => finish(favorite), 'chip-name');
        pick.disabled = taken.includes(favorite);
        const remove = button('×', () => {
          toggleFavorite(favorite);
          update();
        }, 'chip-remove');
        remove.setAttribute('aria-label', `Remove ${favorite} from favourites`);
        chip.append(pick, remove);
        chips.append(chip);
      }
      favorites.append(el('div', 'favorites-title', 'Favourites'), chips);
    };
    input.addEventListener('input', update);

    const actions = el('div', 'actions');
    actions.append(button('Cancel', () => finish(null)), ok);

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (input.value.trim()) finish(input.value.trim());
    });
    form.append(inputRow, favorites, actions);
    panel.append(el('h2', '', 'Player name'), form);
    update();

    // The keyboard only comes up when the text box is tapped, since a favourite is usually picked
    // instead. Tapping it selects the name, so typing replaces it.
    input.addEventListener('focus', () => input.select());
  });
}
