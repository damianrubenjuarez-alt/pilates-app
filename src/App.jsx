// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { EstudioProvider } from './EstudioContext';
import { Login, Registro } from './auth';
import { Navbar } from './Navbar';
import { RutaProtegida } from './RutaProtegida';
import { Landing } from './Landing';
import { RutaSuperAdmin } from './RutaSuperAdmin';

// ============================================================
// LAZY LOADING: componentes que se cargan on-demand
// ============================================================
const ClasesLazy = lazy(() => import('./Clases').then(m => ({ default: m.Clases })));
const AdminLazy = lazy(() => import('./Admin').then(m => ({ default: m.Admin })));
const MisReservasLazy = lazy(() => import('./MisReservas').then(m => ({ default: m.MisReservas })));

const SuperAdminLazy = lazy(() => import('./SuperAdmin').then(m => ({ default: m.SuperAdmin })));
const AdminAlumnosLazy = lazy(() => import('./AdminAlumnos').then(m => ({ default: m.AdminAlumnos })));
const AdminCajaLazy = lazy(() => import('./AdminCaja').then(m => ({ default: m.AdminCaja })));
const AdminAgenteLazy = lazy(() => import('./AdminAgente').then(m => ({ default: m.AdminAgente })));
const AceptarInvitacionLazy = lazy(() => import('./AceptarInvitacion').then(m => ({ default: m.AceptarInvitacion })));
const RegistroAdminLazy = lazy(() => import('./RegistroAdmin').then(m => ({ default: m.RegistroAdmin })));
const LoginAdminLazy = lazy(() => import('./LoginAdmin').then(m => ({ default: m.LoginAdmin })));
const CrearEstudioLazy = lazy(() => import('./CrearEstudio').then(m => ({ default: m.CrearEstudio })));
const ConfiguracionEstudioLazy = lazy(() => import('./ConfiguracionEstudio').then(m => ({ default: m.ConfiguracionEstudio })));
const RecordatoriosLazy = lazy(() => import('./Recordatorios').then(m => ({ default: m.Recordatorios })));
const RecuperarPasswordLazy = lazy(() => import('./RecuperarPassword').then(m => ({ default: m.RecuperarPassword })));
const EstadisticasLazy = lazy(() => import('./Estadisticas').then(m => ({ default: m.Estadisticas })));

// ============================================================
// Fallback de carga
// ============================================================
function CargandoPagina() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    </div>
  );
}

// ============================================================
// Layout de estudio (Navbar + contenido)
// ============================================================
function LayoutEstudio() {
  return (
    <EstudioProvider>
      <Navbar />
      <Suspense fallback={<CargandoPagina />}>
        <Outlet />
      </Suspense>
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
        {/* Landing (sin lazy — primera carga) */}
        <Route path="/" element={<Landing />} />

        {/* Rutas lazy */}
        <Route path="/registro-admin" element={
          <Suspense fallback={<CargandoPagina />}>
            <RegistroAdminLazy />
          </Suspense>
        } />
        <Route path="/login-admin" element={
          <Suspense fallback={<CargandoPagina />}>
            <LoginAdminLazy />
          </Suspense>
        } />
        <Route path="/crear-estudio" element={
          <Suspense fallback={<CargandoPagina />}>
            <CrearEstudioLazy />
          </Suspense>
        } />

        {/* Super admin (lazy) */}
        <Route path="/super-admin" element={
          <RutaSuperAdmin>
            <Suspense fallback={<CargandoPagina />}>
              <SuperAdminLazy />
            </Suspense>
          </RutaSuperAdmin>
        } />

        {/* Rutas dentro de un estudio (con slug) */}
        <Route path="/:slug" element={<LayoutEstudio />}>
          <Route index element={<Navigate to="clases" replace />} />

          <Route path="login" element={<Login />} />
          <Route path="registro" element={<Registro />} />
          <Route path="recuperar-password" element={
            <Suspense fallback={<CargandoPagina />}>
              <RecuperarPasswordLazy />
            </Suspense>
          } />
          <Route path="invitacion/:token" element={
            <Suspense fallback={<CargandoPagina />}>
              <AceptarInvitacionLazy />
            </Suspense>
          } />

          <Route path="clases" element={
            <RutaProtegida>
              <Suspense fallback={<CargandoPagina />}>
                <ClasesLazy />
              </Suspense>
            </RutaProtegida>
          } />

          <Route path="mis-reservas" element={
            <RutaProtegida>
              <Suspense fallback={<CargandoPagina />}>
                <MisReservasLazy />
              </Suspense>
            </RutaProtegida>
          } />

          <Route path="admin" element={
            <RutaProtegida soloInstructor>
              <Suspense fallback={<CargandoPagina />}>
                <AdminLazy />
              </Suspense>
            </RutaProtegida>
          } />

          <Route path="admin/alumnos" element={
            <RutaProtegida soloAdmin>
              <Suspense fallback={<CargandoPagina />}>
                <AdminAlumnosLazy />
              </Suspense>
            </RutaProtegida>
          } />

          <Route path="admin/caja" element={
            <RutaProtegida soloAdmin>
              <Suspense fallback={<CargandoPagina />}>
                <AdminCajaLazy />
              </Suspense>
            </RutaProtegida>
          } />
          <Route path="admin/agente" element={
            <RutaProtegida soloAdmin>
              <Suspense fallback={<CargandoPagina />}>
                <AdminAgenteLazy />
              </Suspense>
            </RutaProtegida>
          } />    
          <Route path="admin/estadisticas" element={
            <RutaProtegida soloAdmin>
              <Suspense fallback={<CargandoPagina />}>
                <EstadisticasLazy />
              </Suspense>
            </RutaProtegida>
          } />

          <Route path="admin/recordatorios" element={
            <RutaProtegida soloAdmin>
              <Suspense fallback={<CargandoPagina />}>
                <RecordatoriosLazy />
              </Suspense>
            </RutaProtegida>
          } />

          <Route path="admin/configuracion" element={
            <RutaProtegida soloAdmin>
              <Suspense fallback={<CargandoPagina />}>
                <ConfiguracionEstudioLazy />
              </Suspense>
            </RutaProtegida>
          } />

          <Route path="*" element={<Navigate to="clases" replace />} />
        </Route>

        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </BrowserRouter>
  );
}