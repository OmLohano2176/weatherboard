import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import App from './App';
import './index.css';
import { setupServiceWorker } from './registerSW';

setupServiceWorker();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
