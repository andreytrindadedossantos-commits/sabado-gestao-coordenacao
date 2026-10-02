// Tema único do sistema: claro
try {
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('dark');
  document.body?.classList.remove('dark');
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.style.colorScheme = 'only light';
} catch {}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);
