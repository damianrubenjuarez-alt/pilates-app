// src/EstudioContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import {
  obtenerEstudioPorSlug,
  obtenerMiembro,
  planVigente,
  upsertUsuarioGlobal
} from './estudios';

const EstudioContext = createContext();

export const useEstudio = () => useContext(EstudioContext);

export function EstudioProvider({ children }) {
  const { slug } = useParams();

  const [estudio, setEstudio] = useState(null);
  const [miembro, setMiembro] = useState(null);
  const [user, setUser] = useState(null);
  const [authListo, setAuthListo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const upsertHechoRef = useRef(null);

  // ============================================================
  // 1. Escuchar cambios de autenticación
  // ============================================================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthListo(true);
    });
    return unsub;
  }, []);

  // ============================================================
  // 2. Cuando cambia el slug, el user o refreshKey → recargar
  // ============================================================
  useEffect(() => {
    if (!authListo) return;

    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      setEstudio(null);
      setMiembro(null);

      try {
        if (!slug) {
          if (!cancelado) setCargando(false);
          return;
        }

        // Cargamos el estudio aunque no haya usuario (para la invitación)
        const est = await obtenerEstudioPorSlug(slug);
        if (cancelado) return;

        if (!est) {
          setError('Estudio no encontrado');
          setCargando(false);
          return;
        }

        if (!est.activo) {
          setError('Este estudio está temporalmente desactivado');
          setCargando(false);
          return;
        }

        setEstudio(est);

        // Si no hay usuario, terminamos acá (sin cargar el miembro)
        if (!user) {
          setCargando(false);
          return;
        }

        // ============================================================
        // 3. Cargar el perfil del usuario DENTRO de este estudio
        // ============================================================
        let m = null;
        try {
          m = await obtenerMiembro(est.id, user.uid);
        } catch (err) {
          console.warn(
            'No se pudo cargar miembro (probablemente no es miembro aún):',
            err.message
          );
          m = null;
        }

        if (cancelado) return;

        if (!m) {
          setMiembro(null);
          setCargando(false);
          return;
        }

        if (m.activo === false) {
          setError('Tu cuenta en este estudio está desactivada');
          setMiembro(null);
          setCargando(false);
          return;
        }

        setMiembro(m);

        if (upsertHechoRef.current !== user.uid) {
          upsertHechoRef.current = user.uid;
          upsertUsuarioGlobal(user.uid, {
            nombre: m.nombre || user.displayName || 'Usuario',
            email: user.email
          }).catch(() => { /* silencioso */ });
        }

        setCargando(false);
      } catch (e) {
        console.error('Error cargando estudio:', e);
        if (!cancelado) {
          setError('Error al cargar el estudio: ' + e.message);
          setCargando(false);
        }
      }
    }

    cargar();
    return () => { cancelado = true; };
  }, [slug, user?.uid, authListo, refreshKey]);

  // ============================================================
  // 4. Helpers de rol
  // ============================================================
  const esAdmin      = miembro?.rol === 'admin';
  const esInstructor = miembro?.rol === 'instructor';
  const esAlumno     = miembro?.rol === 'alumno';

  const value = {
    estudio,
    miembro,
    user,
    cargando,
    error,
    esAdmin,
    esInstructor,
    esAlumno,
    recargar: () => setRefreshKey(k => k + 1)
  };

  return (
    <EstudioContext.Provider value={value}>
      {children}
    </EstudioContext.Provider>
  );
}