import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // For vite-plugin-pwa we will rely on its virtual module if needed, 
    // but a simple registration for fallback is fine. 
    // Usually we'd use `import { registerSW } from 'virtual:pwa-register'`
  });
}

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
