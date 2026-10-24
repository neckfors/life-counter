// The help screen: General, Settings and About tabs.

import { el, button, openScreen } from './dom.js';

// The PayPal.me link in About; the line is left out while this is empty.
const PAYPAL_URL = '';
const EMAIL = 'neckfors@gmail.com';

// Each topic: [heading, text]. Text may hold several paragraphs.
const TABS = {
  General: [
    ['Changing life', [
      'Tap the top half of the life number for +1 and the bottom half for −1.',
      'Swipe up or down for + or − the swipe amount (5 unless changed in Settings).',
    ]],
    ['Changing counters', [
      'Swipe up on a counter for +1 and down for −1. You can start the swipe below the counter, on the name.',
      'A swipe up that reaches the middle of the life number changes life instead. A swipe down that starts on the life number changes life.',
    ]],
    ['Typing a value', [
      'Hold life or a counter for about a second. Type 14 to set the value, or +3 / −7 to change it.',
    ]],
    ['Player names and favourites', [
      'Hold a name for about a second to rename the player.',
      'Tap ☆ to save the name as a favourite. Favourites are listed in the same dialog: tap one to use it, or × to remove it.',
    ]],
    ['The running change', [
      'While a value is being changed, the total change (e.g. −3) is shown above the number. It fades about 3 seconds after the last change.',
    ]],
    ['Menu', [
      'Tap the round button in the middle of the screen.',
      'Reset life / Reset life and counters: back to the starting values. An Undo button shows for a few seconds afterwards.',
      'Roll for all players: every player gets a die; the highest wins. On a tie, the tied players can re-roll.',
      'Roll one die: one die for everyone.',
      'Random starting player: picks who goes first.',
      'History: a score sheet for each player, and Details with every change and its time. Quick changes within 3 seconds count as one.',
      'Styling: text size, typeface and colour for life, names and counters.',
      'Fullscreen: hides the browser and status bar.',
    ]],
    ['Saving and installing', [
      'Everything is saved automatically after every change.',
      'Install the app to use it offline and without the browser bar. Android (Chrome): menu ⋮ → Install app (or Add to Home screen). iPhone (Safari): Share → Add to Home Screen.',
    ]],
  ],
  Settings: [
    ['Game', [
      'Starting life: what life is reset to.',
      'Die size: the number of sides on the dice.',
      'Swipe amount: how much a swipe changes life.',
    ]],
    ['Counters', [
      'Each counter can be shown or hidden on the board. Its name is only used in History (and as the title when typing a value). Starting value: what the counter is reset to.',
      'The counters can track anything: poison, energy, wins, or whatever else you need.',
    ]],
    ['Players', [
      'Number of players (1–6), the layout (which way each player faces), and each player’s background colour. Changing the number of players keeps the values and names of the players already in the game.',
    ]],
    ['Device', [
      'Fullscreen: hides the browser and status bar. Not available on iPhone; install the app instead.',
      'Keep screen awake: stops the screen from turning off during a game.',
      'Vibrate on tap: a short buzz when a value changes (Android only).',
    ]],
    ['Reset everything', [
      'Puts all settings, life, counters, player names, favourites, styling and history back to their defaults.',
    ]],
  ],
};

function topics(list) {
  const content = el('div', 'help-content');
  for (const [heading, paragraphs] of list) {
    content.append(el('h2', '', heading), ...paragraphs.map(text => el('p', '', text)));
  }
  return content;
}

function about() {
  const content = el('div', 'help-content about');
  content.append(
    el('img', 'about-icon'),
    el('h2', 'about-name', 'Neckfors Life Counter'),
    el('p', '', 'Thank you so much for using the app, I really appreciate it!'),
  );
  content.querySelector('.about-icon').src = 'icons/icon-192.png';
  content.querySelector('.about-icon').alt = '';
  if (PAYPAL_URL) {
    const paypal = el('a', 'button primary about-link', 'Support the app on PayPal');
    paypal.href = PAYPAL_URL;
    paypal.target = '_blank';
    paypal.rel = 'noopener';
    content.append(paypal);
  }
  const email = el('a', 'about-email', EMAIL);
  email.href = `mailto:${EMAIL}`;
  content.append(
    el('p', '', ''), email,
    el('p', 'about-credits', 'The Condensed typeface is Oswald, © The Oswald Project Authors, under the SIL Open Font License.'),
  );
  return content;
}

export function openHelp() {
  const { body } = openScreen('Help');
  let selected = 'General';
  const render = () => {
    const tabs = el('div', 'tabs');
    for (const name of [...Object.keys(TABS), 'About']) {
      const tab = button(name, () => {
        selected = name;
        render();
        body.scrollTop = 0;
      }, 'tab');
      tab.style.setProperty('--player-color', 'var(--accent)');
      tab.classList.toggle('selected', name === selected);
      tabs.append(tab);
    }
    body.replaceChildren(tabs, selected === 'About' ? about() : topics(TABS[selected]));
  };
  render();
}
