// src/RecuperarPassword.jsx
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase/config';
import { useEstudio } from './EstudioContext';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export function RecuperarPassword() {
  const { slug } = useParams();
  const { estudio } = useEstudio();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  const color = estudio?.branding?.colorPrimario || '#9333ea';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);

    try {
      await sendPasswordResetEmail(auth, email, {
        // URL a la que vuelve el usuario después de resetear
        url: `${window.location.origin}/${slug}/login`
      });
      setExito(true);
    } catch (err) {
      console.error(err);
      setError(traducirError(err.code));
    } finally {
      setEnviando(false);
    }
  };

  // ─── Vista de éxito ───────────────────────────────────────────
  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Revisá tu email</h1>
          <p className="text-sm text-gray-600 mb-6">
            Te enviamos un link a <strong>{email}</strong> para que puedas
            crear una nueva contraseña.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Si no lo ves en unos minutos, revisá la carpeta de spam.
          </p>
          <Link
            to={`/${slug}/login`}
            className="inline-block w-full text-white py-2 rounded hover:opacity-90 transition font-medium"
            style={{ backgroundColor: color }}
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  // ─── Vista de formulario ──────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md space-y-4"
      >
        <Link
          to={`/${slug}/login`}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-3 h-3" />
          Volver al login
        </Link>

        <div className="text-center">
          <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">
            {estudio?.nombre || 'Ingresá tu email'}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-sm text-gray-600">
          Ingresá tu email y te enviaremos un link para crear una nueva contraseña.
        </p>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full border rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full text-white py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 font-medium"
          style={{ backgroundColor: color }}
        >
          {enviando ? 'Enviando...' : 'Enviar link de recuperación'}
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          ¿Ya recordaste tu contraseña?{' '}
          <Link
            to={`/${slug}/login`}
            className="text-purple-600 hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

// ─── Traducción de errores ──────────────────────────────────────
function traducirError(code) {
  const mapa = {
    'auth/invalid-email': 'El email no es válido',
    'auth/user-not-found': 'No existe una cuenta con ese email',
    'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
    'auth/network-request-failed': 'Error de conexión. Revisá tu internet'
  };
  return mapa[code] || 'Error al enviar el email. Intentá de nuevo.';
}