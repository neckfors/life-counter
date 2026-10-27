// Registers the service worker (offline use) and shows "New version available" with an Update
// button when a new version has been downloaded. The update is only applied when tapped, so a game
// is never reloaded without asking.

import { el, button } from './dom.js';

const CHECK_INTERVAL = 30 * 60 * 1000;

let updating = false;

function showUpdate(worker) {
  if (document.querySelector('.update-bar')) return;
  const bar = el('div', 'update-bar');
  bar.setAttribute('role', 'status');
  const update = button('Update', () => {
    updating = true;
    worker.postMessage('update');
  }, 'update-button');
  bar.append(el('span', '', 'New version available'), update);
  document.body.append(bar);
}

// The version the phone is running, from the service worker that serves the app. Null when there is
// none (the Wi-Fi test address, or the very first visit before it has taken over).
export function runningVersion() {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return Promise.resolve(null);
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = event => resolve(event.data);
    worker.postMessage('version', [channel.port2]);
    setTimeout(() => resolve(null), 2000);
  });
}

export async function initUpdates() {
  // Service workers only run over https (and on localhost), not on the Wi-Fi test address.
  if (!('serviceWorker' in navigator)) return;
  let registration;
  try {
    registration = await navigator.serviceWorker.register('sw.js');
  } catch {
    return;
  }

  // A controller already exists, so a newly installed worker is an update, not the first install.
  const isUpdate = () => Boolean(navigator.serviceWorker.controller);
  if (registration.waiting && isUpdate()) showUpdate(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed' && isUpdate()) showUpdate(worker);
    });
  });

  // Reload once the new version has taken over, but only after Update was tapped (the
  // very first install also takes over the page, and that must not reload it).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updating) return;
    updating = false;
    location.reload();
  });

  // Check for a new version whenever the app is opened again, and every 30 minutes while it is open.
  const check = () => registration.update().catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') check();
  }, CHECK_INTERVAL);
}
