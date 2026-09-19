import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 🚨 FIX AGRESIVO: forzar viewport mobile
(function forceViewport() {
  // 1. Eliminar cualquier meta viewport existente
  document.querySelectorAll('meta[name="viewport"]').forEach(m => m.remove());

  // 2. Crear uno nuevo con los valores correctos
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'viewport');
  meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover');
  document.head.appendChild(meta);

  // 3. Log de debug
  console.log('🔧 Viewport forzado. Ancho actual:', window.innerWidth, 'DPR:', window.devicePixelRatio);
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);