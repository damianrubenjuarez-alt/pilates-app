// src/AceptarInvitacion.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { auth } from './firebase/config';
import { useEstudio } from './EstudioContext';
import { obtenerInvitacion, aceptarInvitacion } from './invitaciones';

export function AceptarInvitacion() {
  const { slug, token } = useParams();
  const { estudio, cargando: cargandoEstudio, recargar } = useEstudio();
  const navigate = useNavigate();

  const [inv, setInv] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modo, setModo] = useState('registro');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pass, setPass] = useState('');
  const [procesando, setProcesando] = useState(false);

  const procesandoRef = useRef(false);

  // ============================================================
  // 1. Cargar la invitación
  // ============================================================
  useEffect(() => {
    async function cargar() {
      if (!estudio || !token) return;
      try {
        const i = await obtenerInvitacion(estudio.id, token);
        if (!i) {
          setError('Esta invitación no existe o fue eliminada');
        } else if (i.estado === 'aceptada') {
          setError('Esta invitación ya fue usada');
        } else {
          const exp = i.expiraEn?.toDate?.() || new Date(i.expiraEn);
          if (exp < new Date()) {
            setError('Esta invitación expiró. Pedile al admin que te envíe otra.');
          } else {
            setInv(i);
            setNombre(i.nombre || '');
            setTelefono(i.telefono || '');
          }
        }
      } catch (e) {
        setError('Error al cargar la invitación: ' + e.message);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [estudio?.id, token]);

  // ============================================================
  // 2. Auto-aceptar si YA está logueado con el email de la invitación
  //    ⚠️ IMPORTANTE: este efecto NO depende de `nombre` ni `telefono`.
  //    Solo depende del usuario y de la invitación.
  // ============================================================
  useEffect(() => {
    if (!inv || !estudio) return;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      if (procesandoRef.current) return;

      // Si el email del usuario no coincide con la invitación, no hacemos nada.
      // El usuario podrá cerrar sesión y usar otra cuenta.
      if (u.email?.toLowerCase() !== inv.email.toLowerCase()) {
        setError(
          `Estás logueado con ${u.email}, pero la invitación es para ${inv.email}.`
        );
        return;
      }

      procesandoRef.current = true;
      try {
        // Usamos los datos de la invitación (o el displayName del usuario si existe)
        await aceptarInvitacion(estudio.id, token, u.uid, u.email, {
          nombre: inv.nombre || u.displayName || '',
          telefono: inv.telefono || ''
        });
        recargar();
        navigate(`/${slug}/clases`);
      } catch (e) {
        setError(e.message);
        procesandoRef.current = false;
      }
    });

    return unsub;
  }, [inv?.id, estudio?.id, token, slug, navigate, recargar]);

  // ============================================================
  // 3. Registro (usuario NO logueado)
  // ============================================================
  const registrar = async (e) => {
    e.preventDefault();
    setError('');
    setProcesando(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, inv.email, pass);
      await updateProfile(user, { displayName: nombre });
      await aceptarInvitacion(estudio.id, token, user.uid, user.email, {
        nombre,
        telefono
      });
      recargar();
      navigate(`/${slug}/clases`);
    } catch (err) {
      console.error(err);
      setError(traducirError(err.code) || err.message);
      setProcesando(false);
    }
  };

  // ============================================================
  // 4. Login (usuario NO logueado, pero ya tiene cuenta)
  // ============================================================
  const entrar = async (e) => {
    e.preventDefault();
    setError('');
    setProcesando(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, inv.email, pass);
      await aceptarInvitacion(estudio.id, token, user.uid, user.email, {
        nombre: nombre || user.displayName || inv.nombre || '',
        telefono: telefono || inv.telefono || ''
      });
      recargar();
      navigate(`/${slug}/clases`);
    } catch (err) {
      setError(traducirError(err.code) || err.message);
      setProcesando(false);
    }
  };

  // ============================================================
  // 5. Cerrar sesión (para cambiar de cuenta)
  // ============================================================
  const cerrarSesion = async () => {
    await signOut(auth);
    setError('');
    procesandoRef.current = false;
  };

  // ============================================================
  // Renders
  // ============================================================
  if (cargandoEstudio || cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !inv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-4xl mb-3">❌</div>
          <h2 className="text-lg font-bold mb-2">No se puede usar esta invitación</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Link to="/" className="text-purple-600 hover:underline text-sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{estudio?.nombre}</h1>
          <p className="text-sm text-gray-500 mt-1">Te invitaron a unirte</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-1">
              {modo === 'registro' ? '👋 Hola, ' + (inv?.nombre || '') : '¡Hola de nuevo!'}
            </h2>
            <p className="text-sm text-gray-500">
              {modo === 'registro'
                ? 'Completá tus datos para empezar'
                : 'Ingresá tu contraseña para aceptar la invitación'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Email: <strong>{inv?.email}</strong>
            </p>
            {inv?.clasesIniciales > 0 && (
              <p className="text-xs text-purple-600 mt-1">
                🎁 Se te van a asignar <strong>{inv.clasesIniciales}</strong> clases
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4">
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
                {error}
              </p>
              {(error.includes('logueado con') || error.includes('ya fue usada')) && (
                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="w-full mt-2 text-sm text-purple-600 hover:underline"
                >
                  Cerrar sesión y usar otra cuenta
                </button>
              )}
            </div>
          )}

          <form onSubmit={modo === 'registro' ? registrar : entrar} className="space-y-4">
            {modo === 'registro' && (
              <>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-medium">Tu nombre</label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-medium">
                    Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+54 9 11 1234-5678"
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Lo usamos para contactarte por WhatsApp si hace falta.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-gray-600 mb-1 font-medium">Contraseña</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder={modo === 'registro' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                required
                minLength={6}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <button type="submit" disabled={procesando}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium">
              {procesando
                ? 'Procesando...'
                : modo === 'registro' ? 'Crear cuenta y entrar' : 'Aceptar invitación'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            {modo === 'registro' ? (
              <>¿Ya tenés cuenta?{' '}
                <button type="button" onClick={() => setModo('login')}
                  className="text-purple-600 hover:underline">
                  Iniciar sesión
                </button>
              </>
            ) : (
              <>¿Primera vez acá?{' '}
                <button type="button" onClick={() => setModo('registro')}
                  className="text-purple-600 hover:underline">
                  Crear cuenta
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function traducirError(code) {
  const mapa = {
    'auth/email-already-in-use': 'Ese email ya tiene una cuenta. Probá iniciar sesión.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/invalid-credential': 'Email o contraseña incorrectos',
    'auth/wrong-password': 'Contraseña incorrecta'
  };
  return mapa[code] || null;
}