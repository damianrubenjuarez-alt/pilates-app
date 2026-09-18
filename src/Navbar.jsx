// src/Navbar.jsx
import { Link, useNavigate, useParams } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import { useEstudio } from './EstudioContext';
import { planVigente } from './estudios';

export function Navbar() {
  const { slug } = useParams();
  const { estudio, miembro, user, esAdmin, esInstructor } = useEstudio();
  const navigate = useNavigate();

  if (!estudio || !user) return null;

  const logout = async () => {
    await signOut(auth);
    navigate(`/${slug}/login`);
  };

  const color = estudio.branding?.colorPrimario || '#9333ea';
  const inicial = estudio.nombre?.[0]?.toUpperCase() || '🧘';
  const esAlumno = miembro?.rol === 'alumno';
  const planOk = planVigente(estudio);

  return (
    <>
      {/* Banner de plan vencido */}
      {!planOk && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-6 py-2 text-sm text-yellow-900 text-center">
          ⚠️ El plan de <strong>{estudio.nombre}</strong> venció.
          {' '}Contactá al soporte para renovarlo.
        </div>
      )}

      <nav className="bg-white border-b px-6 py-3 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          {/* Logo / nombre del estudio */}
          <Link to={`/${slug}/clases`} className="flex items-center gap-2">
            {estudio.branding?.logoUrl ? (
              <img
                src={estudio.branding.logoUrl}
                alt={estudio.nombre}
                className="w-8 h-8 rounded object-cover"
              />
            ) : (
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: color }}
              >
                {inicial}
              </div>
            )}
            <span className="font-bold text-lg">{estudio.nombre}</span>
          </Link>

          {/* Clases */}
          <Link to={`/${slug}/clases`} className="hover:underline text-sm">
            Clases
          </Link>

          {/* Mis reservas: solo alumnos */}
          {esAlumno && (
            <Link to={`/${slug}/mis-reservas`} className="hover:underline text-sm">
              Mis reservas
            </Link>
          )}

          {/* Calendario: admin e instructor */}
          {(esAdmin || esInstructor) && (
            <Link
              to={`/${slug}/admin`}
              className="hover:underline text-sm font-semibold"
              style={{ color }}
            >
              Calendario
            </Link>
          )}

          {/* Alumnos: SOLO admin */}
          {esAdmin && (
            <Link
              to={`/${slug}/admin/alumnos`}
              className="hover:underline text-sm font-semibold"
              style={{ color }}
            >
              Alumnos
            </Link>
          )}

          {/* Recordatorios: SOLO admin */}
          {esAdmin && (
            <Link
              to={`/${slug}/admin/recordatorios`}
              className="hover:underline text-sm font-semibold"
              style={{ color }}
            >
              📧 Recordatorios
            </Link>
          )}

          {/* Configuración: SOLO admin */}
          {esAdmin && (
            <Link
              to={`/${slug}/admin/configuracion`}
              className="hover:underline text-sm font-semibold"
              style={{ color }}
            >
              ⚙️ Configuración
            </Link>
          )}
        </div>

        {/* Info del usuario */}
        <div className="flex gap-3 items-center">
          {esAlumno && (
            <span className="text-sm text-gray-600">
              {miembro.nombre} · {miembro.clasesRestantes ?? 0} clases
            </span>
          )}

          {esAdmin && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
              Admin
            </span>
          )}
          {!esAdmin && esInstructor && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              Instructor
            </span>
          )}
          {esAlumno && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              Alumno
            </span>
          )}

          <button onClick={logout} className="text-sm text-red-600 hover:underline">
            Salir
          </button>
        </div>
      </nav>
    </>
  );
}