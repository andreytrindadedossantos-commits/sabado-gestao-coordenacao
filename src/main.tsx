import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);


async function registerPwa() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    registration.update().catch(() => {});
  } catch (error) {
    console.warn('PWA: não foi possível registrar o service worker.', error);
  }
}

if (document.readyState === 'complete') {
  registerPwa();
} else {
  window.addEventListener('load', registerPwa, { once: true });
}
