import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// V57 — somente navegador.
// Remove automaticamente qualquer Service Worker/cache deixado pelas versões PWA anteriores.
async function removeOldPwa() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn('Não foi possível limpar completamente recursos antigos do PWA.', error);
  }
}

removeOldPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);
