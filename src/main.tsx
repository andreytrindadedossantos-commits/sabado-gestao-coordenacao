import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Captura o evento de instalação antes do React montar.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    (window as any).__pwaInstallPrompt = event;
    window.dispatchEvent(new Event('pwa-install-ready'));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
