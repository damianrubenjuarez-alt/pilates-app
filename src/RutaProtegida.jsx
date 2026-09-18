// src/RutaProtegida.jsx
import { Navigate, useParams, Link } from 'react-router-dom';
import { useEstudio } from './EstudioContext';

/**
 * Protege rutas dentro de un estudio.
 *
 * Props:
 *   - children:        el componente a proteger
 *   - soloAdmin:       true si solo admins pueden ver
 *   - soloInstructor:  true si admins e instructores pueden ver
 *   - requiereMiembro: true si necesita estar logueado en el estudio (default: true)
 */
export function RutaProtegida({
  children,
  soloAdmin = false,
  soloInstructor = false,
  requiereMiembro = true
}) {
  const { slug } = useParams();
  const { estudio, miembro, user, cargando, error, esAdmin, esInstructor } = useEstudio();

  // 1. Mientras carga, mostrar spinner
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-3 text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // 2. Si hay error cargando el estudio, mostrarlo
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold mb-2">No se puede acceder</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Link to="/" className="text-purple-600 hover:underline text-sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // 3. Si no hay slug en la URL, es un error de configuración
  if (!slug) {
    return <Navigate to="/" replace />;
  }

  // 4. Si el estudio no existe
  if (!estudio) {
    return <Navigate to="/" replace />;
  }

  // 5. Si no hay usuario logueado → mandar a login del estudio
  if (!user) {
    return <Navigate to={`/${slug}/login`} replace />;
  }

  // 6. Si requiere ser miembro y no lo es
  if (requiereMiembro && !miembro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold mb-2">Sin acceso</h2>
          <p className="text-sm text-gray-600 mb-4">
            No tenés acceso a <strong>{estudio.nombre}</strong>.
            Contactá al administrador si creés que es un error.
          </p>
          <Link to="/" className="text-purple-600 hover:underline text-sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // 7. Si requiere admin y no lo es
  if (soloAdmin && !esAdmin) {
    return <Navigate to={`/${slug}/clases`} replace />;
  }

  // 8. Si requiere instructor (admin o instructor) y no lo es
  if (soloInstructor && !esAdmin && !esInstructor) {
    return <Navigate to={`/${slug}/clases`} replace />;
  }

  // 9. Todo OK → renderizar el componente
  return children;
}