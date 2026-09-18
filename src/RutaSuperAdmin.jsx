// src/RutaSuperAdmin.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { esSuperAdmin } from './config';

export function RutaSuperAdmin({ children }) {
  const [user, setUser] = useState(null);
  const [esSuper, setEsSuper] = useState(null); // null = chequeando
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setEsSuper(false);
        setCargando(false);
        return;
      }

      // forceRefresh: true para traer el claim actualizado
      const ok = await esSuperAdmin(u, { forceRefresh: true });
      setEsSuper(ok);
      setCargando(false);
    });
    return unsub;
  }, []);

  // Mientras chequea
  if (cargando || esSuper === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  // No logueado
  if (!user) return <Navigate to="/" replace />;

  // Logueado pero no es super admin
  if (!esSuper) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold mb-2">Acceso denegado</h2>
          <p className="text-sm text-gray-600 mb-3">
            No tenés permisos para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  // Todo OK
  return children;
}