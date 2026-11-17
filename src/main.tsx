import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { reloadForNewVersion } from './lib/chunkReload';

// O Vite dispara este evento quando um arquivo da tela não carrega (versão antiga aberta após deploy)
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});

const rootElement =document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
