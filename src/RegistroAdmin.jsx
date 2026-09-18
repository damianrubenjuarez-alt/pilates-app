// src/RegistroAdmin.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase/config';
import { upsertUsuarioGlobal } from './estudios';
import { ArrowLeft, Mail, Lock, User, ArrowRight } from 'lucide-react';

export function RegistroAdmin() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      // 1. Crear el usuario en Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(user, { displayName: nombre });

      // 2. Registrar en el índice global
      await upsertUsuarioGlobal(user.uid, { nombre, email });

      // 3. Redirigir a crear estudio
      navigate('/crear-estudio');
    } catch (err) {
      setError(traducirError(err.code));
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Volver */}
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
            <h1 className="text-2xl font-bold mb-1">Creá tu cuenta</h1>
            <p className="text-sm text-gray-500">
              Empezá gratis · Sin tarjeta de crédito
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
                Tu nombre
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  className="w-full border rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

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
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full border rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium"
            >
              {cargando ? 'Creando cuenta...' : (
                <>
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">¿Ya tenés cuenta? </span>
            <Link to="/login-admin" className="text-purple-600 hover:underline font-medium">
              Iniciar sesión
            </Link>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Al crear tu cuenta aceptás los términos y la política de privacidad.
        </p>
      </div>
    </div>
  );
}

function traducirError(code) {
  const mapa = {
    'auth/invalid-email': 'El email no es válido',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email. Probá iniciar sesión.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/network-request-failed': 'Error de conexión. Revisá tu internet'
  };
  return mapa[code] || 'Error al crear la cuenta. Intentá de nuevo.';
}