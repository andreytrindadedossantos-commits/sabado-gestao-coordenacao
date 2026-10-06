import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

declare global {
  interface Window {
    __eijInstallPrompt?: any;
  }
}

// Captura o instalador do Android o mais cedo possível.
// Isso evita perder o beforeinstallprompt antes do React terminar de carregar.
window.addEventListener('beforeinstallprompt', (event:any) => {
  event.preventDefault();
  window.__eijInstallPrompt = event;
  window.dispatchEvent(new CustomEvent('eij-install-ready'));
});

window.addEventListener('appinstalled', () => {
  window.__eijInstallPrompt = undefined;
  window.dispatchEvent(new CustomEvent('eij-app-installed'));
});

async function registerPwa() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js?v=55', {
      scope: '/',
      updateViaCache: 'none'
    });
    registration.update().catch(() => {});

    // No primeiro acesso pelo Android, garante uma navegação já controlada
    // pelo service worker. É uma única atualização e não cria modo offline.
    const ua = navigator.userAgent || '';
    const isAndroidChrome = /Android/i.test(ua) && /Chrome\//i.test(ua) && !/EdgA|OPR|SamsungBrowser|Firefox/i.test(ua);
    if (isAndroidChrome && !navigator.serviceWorker.controller && !sessionStorage.getItem('eij-pwa-controlled-v55')) {
      const reloadOnce = () => {
        sessionStorage.setItem('eij-pwa-controlled-v55', '1');
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true });
    }
  } catch (error) {
    console.warn('PWA: não foi possível registrar o service worker.', error);
  }
}

// Registra antes de renderizar para aumentar a confiabilidade no Android.
registerPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);
