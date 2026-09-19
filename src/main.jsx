import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 🔧 FIX: garantizar el meta viewport correcto en el DOM
(function ensureViewport() {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    document.head.appendChild(meta);
  }
  meta.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover'
  );
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);