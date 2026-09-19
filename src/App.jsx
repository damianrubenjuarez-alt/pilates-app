// src/App.jsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { EstudioProvider } from './EstudioContext';
import { Login, Registro } from './auth';
import { Navbar } from './Navbar';
import { RutaProtegida } from './RutaProtegida';
import { RutaSuperAdmin } from './RutaSuperAdmin';
import { Landing } from './Landing';

// ============================================================
// Lazy loading de páginas
// ============================================================
const ClasesLazy = lazy(() => import('./Clases').then(m => ({ default: m.Clases })));
const AdminLazy = lazy(() => import('./Admin').then(m => ({ default: m.Admin })));
const MisReservasLazy = lazy(() => import('./MisReservas').then(m => ({ default: m.MisReservas })));

const SuperAdminLazy = lazy(() => import('./SuperAdmin').then(m => ({ default: m.SuperAdmin })));
const AdminAlumnosLazy = lazy(() => import('./AdminAlumnos').then(m => ({ default: m.AdminAlumnos })));
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
// 🆕 ErrorBoundary con auto-reload en ChunkLoadError
// ============================================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, autoReloading: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó:', error, info);

    // 🔧 Si es ChunkLoadError → recargar automáticamente (una sola vez)
    const esChunkError =
      error?.name === 'ChunkLoadError' ||
      /Loading chunk \d+ failed/.test(error?.message || '') ||
      /Failed to fetch dynamically imported module/.test(error?.message || '');

    if (esChunkError) {
      const yaRecargo = sessionStorage.getItem('chunk_reload_done');
      if (!yaRecargo) {
        sessionStorage.setItem('chunk_reload_done', '1');
        this.setState({ autoReloading: true });
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.autoReloading) {
        return (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500">Actualizando...</p>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md text-center bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-red-700 mb-2">
              Algo salió mal
            </h2>
            <p className="text-sm text-red-600 mb-4">
              {this.state.error?.message || 'Error desconocido'}
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem('chunk_reload_done');
                window.location.reload();
              }}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
            >
              Recargar la página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// Wrapper: ErrorBoundary + Suspense
// ============================================================
function ConSuspense({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<CargandoPagina />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// ============================================================
// Layout de estudio (Navbar + contenido)
// ============================================================
function LayoutEstudio() {
  return (
    <EstudioProvider>
      <Navbar />
      <ConSuspense>
        <Outlet />
      </ConSuspense>
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
        <Route path="/registro-admin" element={
          <ConSuspense><RegistroAdminLazy /></ConSuspense>
        } />
        <Route path="/login-admin" element={
          <ConSuspense><LoginAdminLazy /></ConSuspense>
        } />
        <Route path="/crear-estudio" element={
          <ConSuspense><CrearEstudioLazy /></ConSuspense>
        } />

        {/* Panel de súper admin */}
        <Route path="/super-admin" element={
          <RutaSuperAdmin>
            <ConSuspense><SuperAdminLazy /></ConSuspense>
          </RutaSuperAdmin>
        } />

        {/* Rutas dentro de un estudio (con slug) */}
        <Route path="/:slug" element={<LayoutEstudio />}>
          <Route index element={<Navigate to="clases" replace />} />

          <Route path="login" element={<Login />} />
          <Route path="registro" element={<Registro />} />
          <Route path="recuperar-password" element={
            <ConSuspense><RecuperarPasswordLazy /></ConSuspense>
          } />
          <Route path="invitacion/:token" element={
            <ConSuspense><AceptarInvitacionLazy /></ConSuspense>
          } />

          <Route path="clases" element={
            <RutaProtegida>
              <ConSuspense><ClasesLazy /></ConSuspense>
            </RutaProtegida>
          } />

          <Route path="mis-reservas" element={
            <RutaProtegida>
              <ConSuspense><MisReservasLazy /></ConSuspense>
            </RutaProtegida>
          } />

          <Route path="admin" element={
            <RutaProtegida soloInstructor>
              <ConSuspense><AdminLazy /></ConSuspense>
            </RutaProtegida>
          } />

          <Route path="admin/alumnos" element={
            <RutaProtegida soloAdmin>
              <ConSuspense><AdminAlumnosLazy /></ConSuspense>
            </RutaProtegida>
          } />

          <Route path="admin/estadisticas" element={
            <RutaProtegida soloAdmin>
              <ConSuspense><EstadisticasLazy /></ConSuspense>
            </RutaProtegida>
          } />

          <Route path="admin/recordatorios" element={
            <RutaProtegida soloAdmin>
              <ConSuspense><RecordatoriosLazy /></ConSuspense>
            </RutaProtegida>
          } />

          <Route path="admin/configuracion" element={
            <RutaProtegida soloAdmin>
              <ConSuspense><ConfiguracionEstudioLazy /></ConSuspense>
            </RutaProtegida>
          } />

          <Route path="*" element={<Navigate to="clases" replace />} />
        </Route>

        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </BrowserRouter>
  );
}