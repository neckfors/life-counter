// Text styling (size, typeface, colour) for all players, changed live with a slider as in the old
// app. Tap anywhere outside the bar to close it.

import { state, events, setStyle } from './state.js';
import { el, button } from './dom.js';

const SIZES = [0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2];

// widen: how much larger the text may grow in narrow areas, since narrower digits fit more.
const FONTS = [
  { id: 'normal', name: 'Normal', family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', weight: 400, widen: 1 },
  { id: 'bold', name: 'Bold', family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', weight: 700, widen: 1 },
  { id: 'condensed', name: 'Condensed', family: 'Oswald, "Arial Narrow", sans-serif', weight: 500, widen: 1.35 },
  { id: 'serif', name: 'Serif', family: 'Georgia, "Noto Serif", "Times New Roman", serif', weight: 400, widen: 1 },
];

const COLORS = ['#000000', '#ffffff', '#2980b9', '#89c4f4', '#5d9451', '#c0392b', '#e67e22', '#9b59b6', '#e76eab'];

// For each kind: which elements it applies to, the slider's options and how to label an option.
const KINDS = {
  size: {
    name: 'Size',
    elements: { life: 'Life', name: 'Name', counters: 'Counters' },
    options: SIZES,
    label: size => `${Math.round(size * 100)}%`,
  },
  font: {
    name: 'Typeface',
    elements: { life: 'Life', name: 'Name', counters: 'Counters' },
    options: FONTS.map(font => font.id),
    label: id => FONTS.find(font => font.id === id).name,
  },
  color: {
    name: 'Colour',
    elements: { life: 'Life', name: 'Name', counterOne: 'Counter one', counterTwo: 'Counter two' },
    options: COLORS,
    label: () => '',
  },
};

export function applyStyling() {
  const root = document.documentElement.style;
  const { size, font, color } = state.styling;
  for (const [element, value] of Object.entries(size)) root.setProperty(`--${element}-scale`, value);
  for (const [element, id] of Object.entries(font)) {
    const { family, weight, widen } = FONTS.find(f => f.id === id) ?? FONTS[0];
    root.setProperty(`--${element}-font`, family);
    root.setProperty(`--${element}-weight`, weight);
    root.setProperty(`--${element}-widen`, widen);
  }
  for (const [element, value] of Object.entries(color)) root.setProperty(`--${element}-color`, value);
}

events.addEventListener('styling', applyStyling);

export function openStyling() {
  let kind = 'size';
  let element = 'life';

  const catcher = el('div', 'styling-catcher');
  const bar = el('div', 'styling-bar');
  const close = () => {
    catcher.remove();
    bar.remove();
  };
  catcher.addEventListener('click', close);
  document.body.append(catcher, bar);

  const segmented = (options, current, onPick) => {
    const row = el('div', 'segmented small');
    for (const [id, name] of Object.entries(options)) {
      const option = button(name, () => onPick(id), 'segment');
      option.classList.toggle('selected', id === current);
      row.append(option);
    }
    return row;
  };

  function render() {
    const { elements, options, label } = KINDS[kind];
    if (!(element in elements)) element = Object.keys(elements)[0];

    const slider = el('input', 'slider');
    slider.type = 'range';
    slider.min = 0;
    slider.max = options.length - 1;
    slider.step = 1;
    slider.value = Math.max(0, options.indexOf(state.styling[kind][element]));

    const valueLabel = el('span', 'slider-label');
    const updateLabel = () => {
      const value = options[slider.value];
      valueLabel.textContent = label(value);
      valueLabel.style.background = kind === 'color' ? value : '';
      valueLabel.classList.toggle('swatch-label', kind === 'color');
    };
    slider.addEventListener('input', () => {
      setStyle(kind, element, options[slider.value]);
      updateLabel();
    });
    updateLabel();

    const sliderRow = el('div', 'slider-row');
    sliderRow.append(slider, valueLabel);

    const kinds = Object.fromEntries(Object.entries(KINDS).map(([id, k]) => [id, k.name]));
    bar.replaceChildren(
      segmented(kinds, kind, id => { kind = id; render(); }),
      segmented(elements, element, id => { element = id; render(); }),
      sliderRow,
    );
  }

  render();
}
