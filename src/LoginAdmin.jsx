// src/LoginAdmin.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { obtenerUsuarioGlobal, listarEstudiosDeUsuario } from './estudios';
import { ArrowLeft, Mail, Lock, ArrowRight } from 'lucide-react';

export function LoginAdmin() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  // Si ya está logueado, redirigir a donde corresponda
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      await redirigirUsuario(u);
    });
    return unsub;
  }, []);

  const redirigirUsuario = async (user) => {
    try {
      const estudios = await listarEstudiosDeUsuario(user.uid);
      if (estudios.length === 0) {
        navigate('/crear-estudio');
      } else if (estudios.length === 1) {
        navigate(`/${estudios[0].slug}/admin`);
      } else {
        navigate('/mis-estudios');
      }
    } catch (e) {
      console.error(e);
      navigate('/crear-estudio');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, pass);
      await redirigirUsuario(user);
    } catch (err) {
      setError(traducirError(err.code));
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white py-12 px-4">
      <div className="max-w-md mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8 border">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🧘</div>
            <h1 className="text-2xl font-bold mb-1">Bienvenido de vuelta</h1>
            <p className="text-sm text-gray-500">
              Ingresá a tu panel de administración
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
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full border rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Tu contraseña"
                  required
                  className="w-full border rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium"
            >
              {cargando ? 'Ingresando...' : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">¿No tenés cuenta? </span>
            <Link to="/registro-admin" className="text-purple-600 hover:underline font-medium">
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function traducirError(code) {
  const mapa = {
    'auth/invalid-email': 'El email no es válido',
    'auth/invalid-credential': 'Email o contraseña incorrectos',
    'auth/wrong-password': 'Email o contraseña incorrectos',
    'auth/user-not-found': 'No existe una cuenta con ese email',
    'auth/network-request-failed': 'Error de conexión. Revisá tu internet'
  };
  return mapa[code] || 'Error al iniciar sesión. Intentá de nuevo.';
}