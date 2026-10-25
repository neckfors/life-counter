// The history screen: a score sheet per player (simple) and a log of every change (detailed).

import { state } from './state.js';
import { history, clearDetailed } from './history.js';
import { el, button, openScreen } from './dom.js';

const CONFIRM_MS = 3000;
const MINUS = '−';

export function openHistory() {
  let mode = 'simple';
  let selected = 0;

  const toggle = button('', () => {
    mode = mode === 'simple' ? 'detailed' : 'simple';
    render();
  });
  const clear = button('Clear', () => {
    // A first tap asks for confirmation; a second tap within CONFIRM_MS clears.
    if (!clear.classList.contains('confirm')) {
      clear.classList.add('confirm');
      clear.textContent = 'Tap to clear';
      setTimeout(resetClear, CONFIRM_MS);
      return;
    }
    clearDetailed();
    resetClear();
    render();
  });
  const resetClear = () => {
    clear.classList.remove('confirm');
    clear.textContent = 'Clear';
  };
  const { body } = openScreen('History', clear, toggle);

  function render() {
    toggle.textContent = mode === 'simple' ? 'Details' : 'Score sheet';
    clear.hidden = mode === 'simple';
    body.replaceChildren(...(mode === 'simple' ? simpleView() : [detailedView()]));
    body.scrollTop = body.scrollHeight;
  }

  function simpleView() {
    const inHistory = history.simple.map(entry => entry.player);
    const players = [...new Set([...Array(state.settings.playerCount).keys(), ...inHistory])].sort((a, b) => a - b);
    if (!players.includes(selected)) selected = players[0];

    const tabs = el('div', 'tabs');
    for (const player of players) {
      const tab = button(state.players[player].name, () => {
        selected = player;
        render();
      }, 'tab');
      tab.style.setProperty('--player-color', state.players[player].color);
      tab.classList.toggle('selected', player === selected);
      tabs.append(tab);
    }
    // The tabs, the player's name and the column headings stay at the top while the rows scroll.
    const { top, sheet } = scoreSheet(selected);
    const pinned = el('div', 'sheet-top');
    pinned.append(tabs, ...top);
    return [pinned, sheet];
  }

  render();
}

function counterHeader(source) {
  return [source.showCounterOne ? source.counterOneName : '', source.showCounterTwo ? source.counterTwoName : ''];
}

function row(className, ...cells) {
  const tr = el('tr', className);
  for (const cell of cells) tr.append(el('td', '', cell));
  return tr;
}

function scoreSheet(player) {
  const rows = history.simple.filter(entry => entry.player === player);
  const sheet = el('div', 'sheet');
  const names = [...new Set(rows.map(entry => entry.name))];
  const title = el('h2', 'sheet-title', (names.length ? names : [state.players[player].name]).join(' / '));

  // The headings are a table of their own, with the same fixed columns as the rows below.
  const header = el('table', 'sheet-columns');
  header.append(row('sheet-header', 'Life', ...counterHeader(rows[0] ?? state.settings)));

  const table = el('table');
  rows.forEach((entry, i) => {
    const previous = rows[i - 1];
    if (previous && entry.name !== previous.name) {
      const heading = el('tr', 'sheet-name');
      const cell = el('td', '', entry.name);
      cell.colSpan = 3;
      heading.append(cell);
      table.append(heading);
    }
    if (previous && counterHeader(entry).join('\n') !== counterHeader(previous).join('\n')) {
      table.append(row('sheet-header', '', ...counterHeader(entry)));
    }
    table.append(row('', String(entry.life),
      entry.showCounterOne ? String(entry.counterOne) : '',
      entry.showCounterTwo ? String(entry.counterTwo) : ''));
  });
  sheet.append(table);
  if (!rows.length) sheet.append(el('p', 'empty', 'No changes yet.'));
  return { top: [title, header], sheet };
}

function formatTime(time) {
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function detailedView() {
  const log = el('div', 'log');
  for (const entry of history.detailed) {
    const to = entry[entry.field];
    const fieldName = { life: 'Life', counterOne: entry.counterOneName, counterTwo: entry.counterTwoName }[entry.field];
    const diff = to - entry.from;
    const change = diff > 0 ? `+${diff}` : `${MINUS}${-diff}`;
    const line = el('div', entry.reset ? 'log-line reset' : 'log-line',
      `${formatTime(entry.time)}: '${entry.name}' ${entry.reset ? 'reset' : 'changed'} '${fieldName}' from ${entry.from} to ${to} (${change})`);
    log.append(line);
  }
  if (!history.detailed.length) log.append(el('p', 'empty', 'No changes yet.'));
  return log;
}
