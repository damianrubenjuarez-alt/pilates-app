// src/CrearEstudio.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import { crearEstudio } from './estudios';
import { Building2, ArrowRight, LogOut } from 'lucide-react';
import { ETIQUETAS_POR_RUBRO, RUBROS_DISPONIBLES } from './etiquetas';

export function CrearEstudio() {
  const [user, setUser] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [nombre, setNombre] = useState('');
  const [rubro, setRubro] = useState('pilates');
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCargandoAuth(false);
      if (!u) {
        navigate('/login-admin', { replace: true });
      }
    });
    return unsub;
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Tenés que estar logueado para crear un estudio');
      return;
    }

    setCreando(true);

    try {
      const { slug } = await crearEstudio({
        nombre,
        rubro,
        etiquetas: ETIQUETAS_POR_RUBRO[rubro] || ETIQUETAS_POR_RUBRO.pilates,
        adminUid: user.uid,
        adminEmail: user.email,
        adminNombre: user.displayName || user.email,
        registroAbierto
      });

      navigate(`/${slug}/admin`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al crear el estudio');
      setCreando(false);
    }
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (cargandoAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            🧘 Pilates App
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline">
              {user.email}
            </span>
            <button
              onClick={cerrarSesion}
              className="text-xs text-red-600 hover:underline flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Salir
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Creá tu estudio</h1>
            <p className="text-sm text-gray-500">
              Es lo último que falta. Después ya podés empezar a usarlo.
            </p>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Nombre del estudio
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: El Nombre del estudio"
                required
                autoFocus
                className="w-full border rounded-lg px-3 py-3 focus:outline-none focus:border-purple-500 text-lg"
              />
              <p className="text-xs text-gray-400 mt-2">
                Se va a generar una URL automáticamente para tus alumnos.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Tipo de negocio
              </label>
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                className="w-full border rounded-lg px-3 py-3 focus:outline-none focus:border-purple-500 text-base"
              >
                {RUBROS_DISPONIBLES.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-2">
                Esto define cómo se llaman las cosas dentro del sistema (ej: clases vs turnos).
              </p>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={registroAbierto}
                  onChange={(e) => setRegistroAbierto(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-purple-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    Permitir registro abierto
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Si lo activás, cualquiera con el link de tu estudio podrá
                    crearse una cuenta. Si lo dejás desactivado, solo podrán
                    unirse con una invitación.
                  </p>
                  <p className="text-xs text-purple-600 mt-2 font-medium">
                    {registroAbierto
                      ? '✅ Registro abierto'
                      : '🔒 Solo por invitación'}
                  </p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={creando || !nombre.trim()}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium"
            >
              {creando ? 'Creando estudio...' : (
                <>
                  Crear estudio
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-center text-xs text-gray-500">
            Tu plan: <strong className="text-purple-600">Trial gratis · 14 días</strong>
          </div>
        </div>
      </div>
    </div>
  );
}