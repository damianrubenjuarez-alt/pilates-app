// src/auth.jsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth, googleProvider } from './firebase/config';
import { useEstudio } from './EstudioContext';
import { unirUsuarioAEstudio, upsertUsuarioGlobal } from './estudios';

// ============================================================
// LOGIN
// ============================================================
export function Login() {
  const { slug } = useParams();
  const { estudio } = useEstudio();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEmail = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      navigate(`/${slug}/clases`);
    } catch (err) {
      setError(traducirError(err.code));
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate(`/${slug}/clases`);
    } catch (err) {
      setError(traducirError(err.code));
    }
  };

  const color = estudio?.branding?.colorPrimario || '#9333ea';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleEmail} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {estudio?.nombre || 'Iniciar sesión'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Ingresá a tu cuenta</p>
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>
        )}

        <input
  type="email"
  placeholder="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  className="w-full border rounded px-3 py-2"
/>
<input
  type="password"
  placeholder="Contraseña"
  value={pass}
  onChange={(e) => setPass(e.target.value)}
  required
  className="w-full border rounded px-3 py-2"
/>

{/* 👇 NUEVO: enlace de recuperación */}
<div className="text-right">
  <Link
    to={`/${slug}/recuperar-password`}
    className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
  >
    ¿Olvidaste tu contraseña?
  </Link>
</div>

<button
  type="submit"
  className="w-full text-white py-2 rounded hover:opacity-90 transition"
  style={{ backgroundColor: color }}
>
  Entrar
</button>
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full border py-2 rounded hover:bg-gray-50"
        >
          Continuar con Google
        </button>

        {/* 👇 Solo muestra el registro si el estudio lo permite */}
        {estudio?.registroAbierto && (
          <p className="text-sm text-center text-gray-600">
            ¿No tenés cuenta?{' '}
            <Link to={`/${slug}/registro`} className="text-purple-600 hover:underline">
              Registrate
            </Link>
          </p>
        )}
        {estudio && !estudio.registroAbierto && (
          <p className="text-xs text-center text-gray-400">
            Este estudio es solo por invitación.
          </p>
        )}
      </form>
    </div>
  );
}

// ============================================================
// REGISTRO
// ============================================================
export function Registro() {
  const { slug } = useParams();
  const { estudio, cargando: cargandoEstudio } = useEstudio();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  // ⚠️ Si el estudio no permite registro abierto, mostramos un mensaje
  if (cargandoEstudio) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  if (estudio && !estudio.registroAbierto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold mb-2">Registro cerrado</h2>
          <p className="text-sm text-gray-600 mb-4">
            <strong>{estudio.nombre}</strong> solo acepta nuevos alumnos por invitación.
            Pedile al admin que te envíe un link.
          </p>
          <Link to={`/${slug}/login`} className="text-purple-600 hover:underline text-sm">
            Ya tengo cuenta · Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setCargando(true);

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(user, { displayName: nombre });

    // 👇 NUEVO: Enviar email de verificación
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/${slug}/clases`
      });
    } catch (verifyErr) {
      console.warn('No se pudo enviar el email de verificación:', verifyErr.message);
    }

    await upsertUsuarioGlobal(user.uid, { nombre, email });

    await unirUsuarioAEstudio(estudio.id, user.uid, {
      nombre,
      email,
      rol: 'alumno'
    });

    navigate(`/${slug}/clases`);
  } catch (err) {
    setError(traducirError(err.code));
    setCargando(false);
  }
};
  const color = estudio?.branding?.colorPrimario || '#9333ea';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {estudio?.nombre || 'Crear cuenta'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Creá tu cuenta para reservar clases
          </p>
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>
        )}

        <input
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          placeholder="Contraseña (mín 6 caracteres)"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          required
          minLength={6}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={cargando}
          className="w-full text-white py-2 rounded hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: color }}
        >
          {cargando ? 'Creando cuenta...' : 'Registrarme'}
        </button>
        <p className="text-sm text-center text-gray-600">
          ¿Ya tenés cuenta?{' '}
          <Link to={`/${slug}/login`} className="text-purple-600 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

// ============================================================
// Traducción de errores de Firebase
// ============================================================
function traducirError(code) {
  const mapa = {
    'auth/invalid-email': 'Email inválido',
    'auth/user-disabled': 'Usuario deshabilitado',
    'auth/user-not-found': 'No existe una cuenta con ese email',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Email o contraseña incorrectos',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/popup-closed-by-user': 'Cancelaste el inicio de sesión con Google',
    'auth/network-request-failed': 'Error de conexión. Revisá tu internet'
  };
  return mapa[code] || 'Error al procesar la solicitud. Intentá de nuevo.';
}