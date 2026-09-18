// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { EstudioProvider } from './EstudioContext';
import { Login, Registro } from './auth';
import { Navbar } from './Navbar';
import { RutaProtegida } from './RutaProtegida';
import { Clases, Admin, MisReservas } from './agenda';
import { SuperAdmin } from './SuperAdmin';
import { RutaSuperAdmin } from './RutaSuperAdmin';
import { AdminAlumnos } from './AdminAlumnos';
import { AceptarInvitacion } from './AceptarInvitacion';
import { Landing } from './Landing';
import { RegistroAdmin } from './RegistroAdmin';
import { LoginAdmin } from './LoginAdmin';
import { CrearEstudio } from './CrearEstudio';
import { ConfiguracionEstudio } from './ConfiguracionEstudio';
import { Recordatorios } from './Recordatorios';

// ============================================================
// Layout de estudio (Navbar + contenido)
// ============================================================
function LayoutEstudio() {
  return (
    <EstudioProvider>
      <Navbar />
      <Outlet />
    </EstudioProvider>
  );
}

// ============================================================
// Página 404
// ============================================================
function NoEncontrado() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-3">404</h1>
        <p className="text-gray-600 mb-6">
          No encontramos esta página.
        </p>
        <Link to="/" className="text-purple-600 hover:underline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// App
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Página de inicio sin estudio */}
        <Route path="/" element={<Landing />} />
        <Route path="/registro-admin" element={<RegistroAdmin />} />
        <Route path="/login-admin" element={<LoginAdmin />} />
        <Route path="/crear-estudio" element={<CrearEstudio />} />

        {/* Panel de súper admin (SIN slug, sin estudio) */}
        <Route path="/super-admin" element={
          <RutaSuperAdmin>
            <SuperAdmin />
          </RutaSuperAdmin>
        } />

        {/* Rutas dentro de un estudio (con slug) */}
        <Route path="/:slug" element={<LayoutEstudio />}>
          {/* Redirigir el índice del estudio a /clases */}
          <Route index element={<Navigate to="clases" replace />} />

          <Route path="login" element={<Login />} />
          <Route path="registro" element={<Registro />} />
          <Route path="invitacion/:token" element={<AceptarInvitacion />} />

          <Route path="clases" element={
            <RutaProtegida>
              <Clases />
            </RutaProtegida>
          } />

          <Route path="mis-reservas" element={
            <RutaProtegida>
              <MisReservas />
            </RutaProtegida>
          } />

          {/* Calendario admin: accesible a admin E instructor */}
          <Route path="admin" element={
            <RutaProtegida soloInstructor>
              <Admin />
            </RutaProtegida>
          } />

          {/* Gestión de alumnos: solo admin */}
          <Route path="admin/alumnos" element={
            <RutaProtegida soloAdmin>
              <AdminAlumnos />
            </RutaProtegida>
          } />

          {/* Recordatorios: solo admin */}
          <Route path="admin/recordatorios" element={
            <RutaProtegida soloAdmin>
              <Recordatorios />
            </RutaProtegida>
          } />

          {/* Configuración: solo admin */}
          <Route path="admin/configuracion" element={
            <RutaProtegida soloAdmin>
              <ConfiguracionEstudio />
            </RutaProtegida>
          } />

          {/* Ruta no encontrada dentro del estudio → al home del estudio */}
          <Route path="*" element={<Navigate to="clases" replace />} />
        </Route>

        {/* Ruta global 404 */}
        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </BrowserRouter>
  );
}