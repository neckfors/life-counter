// Small DOM helpers shared by the screens and dialogs.

export function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function button(text, onClick, className = 'button') {
  const element = el('button', className, text);
  element.type = 'button';
  element.addEventListener('click', onClick);
  return element;
}

// A full-screen page with a title, optional extra header buttons and a Done button.
export function openScreen(title, ...headerButtons) {
  const screen = el('div', 'screen');
  const header = el('header', 'screen-header');
  const buttons = el('div', 'header-buttons');
  const body = el('div', 'screen-body');
  buttons.append(...headerButtons, button('Done', () => screen.remove(), 'button primary'));
  header.append(el('h1', '', title), buttons);
  screen.append(header, body);
  document.body.append(screen);
  return { screen, header, buttons, body };
}

// A dimmed overlay with a panel, optionally rotated to face a player. Tapping outside the panel
// calls onDismiss.
export function openOverlay({ rot = 0, className = '', onDismiss }) {
  const overlay = el('div', 'overlay');
  const panel = el('div', `panel ${className}`);
  panel.style.setProperty('--rot', `${rot}deg`);
  if (rot % 180) panel.classList.add('sideways');
  overlay.append(panel);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) onDismiss?.();
  });
  document.body.append(overlay);
  return { overlay, panel, close: () => overlay.remove() };
}
