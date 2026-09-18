// src/ConfiguracionEstudio.jsx
import { useState, useEffect, useRef } from 'react';
import { useEstudio } from './EstudioContext';
import { actualizarRegistroAbierto, actualizarInfoEstudio } from './estudios';
import { Settings, Lock, Globe, Check, AlertCircle, Palette, Type, Image as ImageIcon, Upload } from 'lucide-react';

export function ConfiguracionEstudio() {
  const { estudio, esAdmin, recargar } = useEstudio();
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [colorPrimario, setColorPrimario] = useState('#9333ea');
  const [colorSecundario, setColorSecundario] = useState('#c084fc');
  const [logoUrl, setLogoUrl] = useState('');

  const fileInputRef = useRef(null);

  // Cargar datos actuales
  useEffect(() => {
    if (!estudio) return;
    setNombre(estudio.nombre || '');
    setColorPrimario(estudio.branding?.colorPrimario || '#9333ea');
    setColorSecundario(estudio.branding?.colorSecundario || '#c084fc');
    setLogoUrl(estudio.branding?.logoUrl || '');
  }, [estudio?.id]);

  if (!estudio) return <div className="p-8">Cargando estudio...</div>;

  if (!esAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold mb-2">Acceso denegado</h2>
          <p className="text-sm text-gray-600">
            Solo los administradores pueden acceder a la configuración.
          </p>
        </div>
      </div>
    );
  }

  const registroAbierto = !!estudio.registroAbierto;

  const mostrarMensaje = (texto, esError = false) => {
    if (esError) {
      setError(texto);
      setMsg('');
    } else {
      setMsg(texto);
      setError('');
    }
    setTimeout(() => { setMsg(''); setError(''); }, 4000);
  };

  // Toggle de registro abierto
  const toggleRegistro = async () => {
    setGuardando(true);
    try {
      await actualizarRegistroAbierto(estudio.id, !registroAbierto);
      mostrarMensaje(
        !registroAbierto
          ? '✅ Registro abierto activado'
          : '🔒 Registro abierto desactivado'
      );
      recargar();
    } catch (e) {
      mostrarMensaje('⚠️ Error al guardar: ' + e.message, true);
    } finally {
      setGuardando(false);
    }
  };

  // Subir logo a Cloudinary (unsigned)
  const handleSubirLogo = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Validaciones
    if (archivo.size > 2 * 1024 * 1024) {
      mostrarMensaje('⚠️ El archivo es muy grande (máximo 2MB)', true);
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      mostrarMensaje('⚠️ El archivo debe ser una imagen (PNG, JPG, SVG)', true);
      return;
    }

    setSubiendoLogo(true);
    setError('');
    setMsg('');

    try {
      // Preparar FormData
      const formData = new FormData();
      formData.append('file', archivo);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `logos/${estudio.id}`);

      // Subir a Cloudinary
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Error al subir la imagen');
      }

      const data = await response.json();

      // data.secure_url es la URL HTTPS de la imagen
      setLogoUrl(data.secure_url);

      mostrarMensaje('✅ Logo subido. Guardá los cambios para aplicarlo.');
    } catch (err) {
      console.error(err);
      mostrarMensaje('⚠️ Error al subir el logo: ' + err.message, true);
    } finally {
      setSubiendoLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Guardar cambios (nombre, colores, logo)
  const guardarCambios = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await actualizarInfoEstudio(estudio.id, {
        nombre: nombre.trim(),
        branding: {
          colorPrimario,
          colorSecundario,
          logoUrl: logoUrl.trim() || null
        }
      });
      mostrarMensaje('✅ Cambios guardados');
      recargar();
    } catch (e) {
      mostrarMensaje('⚠️ Error al guardar: ' + e.message, true);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-600" />
          Configuración del estudio
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {estudio.nombre} · Ajustá cómo funciona tu estudio
        </p>
      </div>

      {/* Mensajes */}
      {msg && (
        <div className="mb-4 text-sm bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          {msg}
        </div>
      )}
      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* ============================================================ */}
      {/* CARD 1: Registro abierto                                       */}
      {/* ============================================================ */}
      <div className="bg-white border rounded-lg p-5 md:p-6 space-y-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {registroAbierto ? (
                <Globe className="w-5 h-5 text-green-600" />
              ) : (
                <Lock className="w-5 h-5 text-gray-500" />
              )}
              <h2 className="font-bold text-lg">Registro abierto</h2>
            </div>
            <p className="text-sm text-gray-600">
              {registroAbierto
                ? 'Cualquier persona con el link de tu estudio puede crearse una cuenta y reservar clases.'
                : 'Solo las personas que reciban una invitación tuya pueden unirse al estudio.'}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleRegistro}
            disabled={guardando}
            aria-label={registroAbierto ? 'Desactivar registro abierto' : 'Activar registro abierto'}
            className={`
              relative inline-flex items-center h-7 w-12 rounded-full transition-colors flex-shrink-0
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${registroAbierto ? 'bg-green-500' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block w-5 h-5 transform bg-white rounded-full shadow transition-transform
                ${registroAbierto ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD 2: Identidad del estudio                                  */}
      {/* ============================================================ */}
      <form onSubmit={guardarCambios} className="bg-white border rounded-lg p-5 md:p-6 space-y-5">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-600" />
          Identidad del estudio
        </h2>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
            <Type className="w-4 h-4 text-gray-400" />
            Nombre del estudio
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Colores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Color primario
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorPrimario}
                onChange={(e) => setColorPrimario(e.target.value)}
                className="w-12 h-10 rounded border cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                value={colorPrimario}
                onChange={(e) => setColorPrimario(e.target.value)}
                className="flex-1 border rounded px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Color secundario
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorSecundario}
                onChange={(e) => setColorSecundario(e.target.value)}
                className="w-12 h-10 rounded border cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                value={colorSecundario}
                onChange={(e) => setColorSecundario(e.target.value)}
                className="flex-1 border rounded px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-gray-400" />
            Logo del estudio
          </label>

          {/* Vista previa + botones */}
          <div className="flex flex-col sm:flex-row items-start gap-4 p-3 bg-gray-50 rounded-lg border">
            
            {/* Vista previa */}
            <div className="flex-shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-20 h-20 rounded object-cover border-2 border-white shadow-sm"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded flex items-center justify-center text-white font-bold text-2xl border-2 border-white shadow-sm"
                  style={{ backgroundColor: colorPrimario }}
                >
                  {nombre?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex-1 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={subiendoLogo}
                  className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 font-medium"
                >
                  <Upload className="w-4 h-4" />
                  {subiendoLogo ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
                </button>

                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="text-sm px-3 py-2 rounded border border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Quitar
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSubirLogo}
                className="hidden"
              />

              <p className="text-xs text-gray-500">
                📁 Subí una imagen (PNG, JPG o SVG). Máximo 2 MB. Se recomienda que sea cuadrada.
              </p>
            </div>
          </div>

          {/* Alternativa: pegar URL */}
          <details className="mt-3">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              O pegá una URL externa
            </summary>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
              className="w-full mt-2 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
            />
          </details>
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end pt-2 border-t">
          <button
            type="submit"
            disabled={guardando || !nombre.trim() || subiendoLogo}
            className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 font-medium"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* Próximamente */}
      <div className="mt-6 bg-gray-50 border border-dashed rounded-lg p-4 text-center text-gray-500 text-sm">
        🚧 Próximamente: más opciones de personalización.
      </div>
    </div>
  );
}