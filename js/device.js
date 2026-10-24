// Fullscreen, keeping the screen awake and vibration.

import { state, events, setSetting } from './state.js';

export const wakeLockSupported = 'wakeLock' in navigator;
export const vibrationSupported = 'vibrate' in navigator;
export const fullscreenSupported = Boolean(document.fullscreenEnabled);

let wakeLock = null;

// Browsers only allow fullscreen from a tap. Switching it on (menu or settings) is a tap; after the
// app is opened with the setting on, it is entered on the first tap.
function updateFullscreen() {
  if (!fullscreenSupported) return;
  if (state.settings.fullscreen && !document.fullscreenElement) {
    // The phone lies flat, so keep it from turning to landscape when someone moves it. Browsers only
    // allow locking the orientation in fullscreen (the installed app is locked by its manifest).
    document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('portrait'))
      .catch(() => {});
  } else if (!state.settings.fullscreen && document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

export function toggleFullscreen() {
  setSetting('fullscreen', !state.settings.fullscreen);
}

// Leaving fullscreen some other way (e.g. the back gesture) switches the setting off, so it does not
// come back on the next tap.
function onFullscreenChange() {
  if (!document.fullscreenElement && state.settings.fullscreen) setSetting('fullscreen', false);
}

// The wake lock is released whenever the page is hidden, so it is requested again when it is shown.
async function updateWakeLock() {
  if (!wakeLockSupported) return;
  const wanted = state.settings.keepAwake && document.visibilityState === 'visible';
  if (wanted && !wakeLock) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } catch {
      wakeLock = null;
    }
  } else if (!wanted && wakeLock) {
    wakeLock.release();
  }
}

export function vibrate() {
  if (state.settings.vibrate && vibrationSupported) navigator.vibrate(15);
}

export function initDevice() {
  document.addEventListener('pointerup', updateFullscreen, { once: true });
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('visibilitychange', updateWakeLock);
  events.addEventListener('settings', ({ detail }) => {
    if (detail.key === 'fullscreen') updateFullscreen();
    if (detail.key === 'keepAwake') updateWakeLock();
  });
  updateWakeLock();
}
