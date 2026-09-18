// src/Navbar.jsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import { useEstudio } from './EstudioContext';
import { planVigente } from './estudios';
import { Copy, Check } from 'lucide-react';

export function Navbar() {
  const { slug } = useParams();
  const { estudio, miembro, user, esAdmin, esInstructor } = useEstudio();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState(false);

  if (!estudio || !user) return null;

  const logout = async () => {
    await signOut(auth);
    navigate(`/${slug}/login`);
  };

  const copiarLink = async () => {
    const url = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt('Copiá este link:', url);
    }
  };

  const color = estudio.branding?.colorPrimario || '#9333ea';
  const inicial = estudio.nombre?.[0]?.toUpperCase() || '🧘';
  const esAlumno = miembro?.rol === 'alumno';
  const planOk = planVigente(estudio);

  return (
    <>
      {/* Banner de plan vencido */}
      {!planOk && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-xs md:text-sm text-yellow-900 text-center">
          ⚠️ El plan de <strong>{estudio.nombre}</strong> venció.
          {' '}Contactá al soporte para renovarlo.
        </div>
      )}

      {/* Banner de verificación de email */}
      {user && !user.emailVerified && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs md:text-sm text-blue-800 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            📧 <span className="hidden sm:inline">Verificá tu email para asegurar tu cuenta.</span>
            <span className="sm:hidden">Verificá tu email</span>
          </span>
          <button
            onClick={async () => {
              try {
                await user.reload();
                if (user.emailVerified) {
                  window.location.reload();
                } else {
                  const { sendEmailVerification } = await import('firebase/auth');
                  await sendEmailVerification(user);
                  alert('✅ Te reenviamos el email de verificación. Revisá tu bandeja de entrada (y el spam).');
                }
              } catch (e) {
                alert('Error: ' + e.message);
              }
            }}
            className="text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline whitespace-nowrap"
          >
            Reenviar
          </button>
        </div>
      )}

      <nav className="bg-white border-b">

        {/* ============================================================ */}
        {/* FILA 1: LOGO + INFO DEL USUARIO                                */}
        {/* ============================================================ */}
        <div className="px-3 md:px-6 py-2 md:py-3 flex justify-between items-center gap-2">

          {/* Logo + nombre + botón copiar link */}
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <Link to={`/${slug}/clases`} className="flex items-center gap-2 min-w-0">
              {estudio.branding?.logoUrl ? (
                <img
                  src={estudio.branding.logoUrl}
                  alt={estudio.nombre}
                  className="w-7 h-7 md:w-8 md:h-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-7 h-7 md:w-8 md:h-8 rounded flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {inicial}
                </div>
              )}
              <span className="font-bold text-sm md:text-lg truncate">
                {estudio.nombre}
              </span>
            </Link>

            {/* 👇 NUEVO: botón copiar link del estudio */}
            <button
              onClick={copiarLink}
              title="Copiar link del estudio"
              className="text-gray-400 hover:text-gray-700 transition p-1 rounded hover:bg-gray-100 flex-shrink-0"
            >
              {copiado ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Info del usuario */}
          <div className="flex gap-2 items-center flex-shrink-0">
            {esAlumno && (
              <span className="text-xs md:text-sm text-gray-600 hidden sm:inline">
                {miembro.clasesRestantes ?? 0} clases
              </span>
            )}

            {esAdmin && (
              <span className="text-[10px] md:text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded whitespace-nowrap">
                Admin
              </span>
            )}
            {!esAdmin && esInstructor && (
              <span className="text-[10px] md:text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap">
                Instructor
              </span>
            )}
            {esAlumno && (
              <span className="text-[10px] md:text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded whitespace-nowrap">
                Alumno
              </span>
            )}

            <button onClick={logout} className="text-xs md:text-sm text-red-600 hover:underline whitespace-nowrap">
              Salir
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* FILA 2: ENLACES DE NAVEGACIÓN                                  */}
        {/* ============================================================ */}
        <div className="px-3 md:px-6 pb-2 md:pb-3 flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1.5 md:gap-y-2 items-center border-t border-gray-100 pt-2 md:pt-3">

          {/* Clases */}
          <Link to={`/${slug}/clases`} className="text-xs md:text-sm hover:underline">
            Clases
          </Link>

          {/* Mis reservas: solo alumnos */}
          {esAlumno && (
            <Link to={`/${slug}/mis-reservas`} className="text-xs md:text-sm hover:underline">
              Mis reservas
            </Link>
          )}

          {/* Calendario: admin e instructor */}
          {(esAdmin || esInstructor) && (
            <Link
              to={`/${slug}/admin`}
              className="text-xs md:text-sm font-semibold hover:underline"
              style={{ color }}
            >
              Calendario
            </Link>
          )}
                    {/* Alumnos: SOLO admin */}
          {esAdmin && (
            <Link
              to={`/${slug}/admin/alumnos`}
              className="text-xs md:text-sm font-semibold hover:underline"
              style={{ color }}
            >
              Alumnos
            </Link>
          )}

          {/* Estadísticas: SOLO admin */}
          {esAdmin && (
            <Link
              to={`/${slug}/admin/estadisticas`}
              className="text-xs md:text-sm font-semibold hover:underline"
              style={{ color }}
            >
              📊 Estadísticas
            </Link>
          )}

          {/* Recordatorios: SOLO admin */}
          {esAdmin && (
            <Link
              to={`/${slug}/admin/recordatorios`}
              className="text-xs md:text-sm font-semibold hover:underline"
              style={{ color }}
            >
              📧 Recordatorios
            </Link>
          )}

          {/* Configuración: SOLO admin */}
          {esAdmin && (
            <Link
              to={`/${slug}/admin/configuracion`}
              className="text-xs md:text-sm font-semibold hover:underline"
              style={{ color }}
            >
              ⚙️ Configuración
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}