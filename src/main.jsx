import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 🚨 FORZAR VIEWPORT MOBILE
(function forceViewport() {
  // Eliminar cualquier meta viewport existente
  document.querySelectorAll('meta[name="viewport"]').forEach(m => m.remove());

  // Crear uno nuevo con los valores correctos
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'viewport');
  meta.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
  );
  document.head.appendChild(meta);

  console.log('🔧 Viewport forzado. Ancho:', window.innerWidth);
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);