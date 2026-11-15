import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (import.meta.env.DEV) {
  import('./dev/diagnostics').then(({ initDiagnostics }) => {
    initDiagnostics();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
