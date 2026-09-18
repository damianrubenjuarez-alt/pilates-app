// src/Recordatorios.jsx
import { useState } from 'react';
import { useEstudio } from './EstudioContext';
import {
  enviarRecordatoriosDelDia,
  obtenerReservasDelDia,
  formatoISO,
  sumarDias,
  formatoFechaLinda
} from './recordatoriosApi';
import { Mail, Send, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

export function Recordatorios() {
  const { estudio, esAdmin } = useEstudio();
  const [fecha, setFecha] = useState(() => {
    // Por defecto: mañana
    return formatoISO(sumarDias(new Date(), 1));
  });
  const [preview, setPreview] = useState(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  if (!estudio) return <div className="p-8">Cargando estudio...</div>;

  if (!esAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold mb-2">Acceso denegado</h2>
          <p className="text-sm text-gray-600">
            Solo los administradores pueden enviar recordatorios.
          </p>
        </div>
      </div>
    );
  }

  const cargarPreview = async () => {
    setCargandoPreview(true);
    setPreview(null);
    setResultado(null);
    setError('');
    try {
      const reservas = await obtenerReservasDelDia(estudio.id, fecha);
      setPreview(reservas);
    } catch (e) {
      setError('Error cargando vista previa: ' + e.message);
    } finally {
      setCargandoPreview(false);
    }
  };

  const enviarTodos = async () => {
    if (!preview || preview.length === 0) {
      setError('Primero cargá la vista previa y verificá que haya reservas.');
      return;
    }

    if (!confirm(
      `¿Enviar ${preview.length} recordatorio${preview.length === 1 ? '' : 's'} ` +
      `para el ${formatoFechaLinda(fecha)}?\n\n` +
      `Los emails se van a enviar a todos los alumnos con reserva.`
    )) return;

    setEnviando(true);
    setProgreso({ actual: 0, total: preview.length, enviados: 0, errores: 0 });
    setResultado(null);
    setError('');

    try {
      const res = await enviarRecordatoriosDelDia(estudio, fecha, (p) => {
        setProgreso(p);
      });
      setResultado(res);
    } catch (e) {
      setError('Error al enviar: ' + e.message);
    } finally {
      setEnviando(false);
      setProgreso(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6 text-purple-600" />
          Recordatorios de clase
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {estudio.nombre} · Enviá recordatorios a los alumnos con reservas
        </p>
      </div>

      {/* Selector de fecha */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          Fecha de las clases
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setPreview(null);
              setResultado(null);
            }}
            className="border rounded-lg px-3 py-2"
          />
          <button
            onClick={() => { setFecha(formatoISO(new Date())); setPreview(null); }}
            className="px-3 py-2 rounded border text-sm hover:bg-gray-100"
          >
            Hoy
          </button>
          <button
            onClick={() => { setFecha(formatoISO(sumarDias(new Date(), 1))); setPreview(null); }}
            className="px-3 py-2 rounded border text-sm hover:bg-gray-100"
          >
            Mañana
          </button>
          <button
            onClick={cargarPreview}
            disabled={cargandoPreview}
            className="ml-auto px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
          >
            {cargandoPreview ? 'Cargando...' : 'Ver vista previa'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          Se van a enviar recordatorios de las clases del{' '}
          <strong>{formatoFechaLinda(fecha)}</strong>.
        </p>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {resultado && (
        <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
            <CheckCircle className="w-5 h-5" />
            Envío completado
          </div>
          <p className="text-sm text-green-700">
            ✅ <strong>{resultado.enviados}</strong> recordatorios enviados correctamente.
          </p>
          {resultado.errores > 0 && (
            <div className="mt-2">
              <p className="text-sm text-red-700">
                ⚠️ <strong>{resultado.errores}</strong> errores:
              </p>
              <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                {resultado.detalleErrores.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Progreso */}
      {progreso && (
        <div className="mb-6 bg-purple-50 border border-purple-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-purple-800 font-medium mb-2">
            <Send className="w-5 h-5 animate-pulse" />
            Enviando recordatorios...
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-600 h-full transition-all duration-300"
              style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-purple-700 mt-2">
            {progreso.actual} de {progreso.total} · ✅ {progreso.enviados} enviados · ⚠️ {progreso.errores} errores
          </p>
        </div>
      )}

      {/* Vista previa */}
      {preview && (
        <div className="bg-white border rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">
              Vista previa: {preview.length} reserva{preview.length === 1 ? '' : 's'}
            </h2>
            {preview.length > 0 && !enviando && (
              <button
                onClick={enviarTodos}
                disabled={enviando}
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar {preview.length} recordatorio{preview.length === 1 ? '' : 's'}
              </button>
            )}
          </div>

          {preview.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay reservas para el {formatoFechaLinda(fecha)}.
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {preview.map((r, i) => (
                <div key={i} className="px-4 py-3 flex justify-between items-center text-sm hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{r.nombre || 'Alumno'}</p>
                    <p className="text-xs text-gray-500">
                      {r.hora} · {r.instructor} · {r.tipo} · Cama {r.cama}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
        <p className="font-medium mb-1">💡 ¿Cómo funciona?</p>
        <ul className="text-xs space-y-1 list-disc list-inside">
          <li>Elegís la fecha de las clases.</li>
          <li>Hacés clic en <strong>Ver vista previa</strong> para ver quiénes tienen reserva.</li>
          <li>Si todo está bien, hacés clic en <strong>Enviar</strong>.</li>
          <li>Cada alumno recibe un email con los detalles de su clase.</li>
        </ul>
      </div>
    </div>
  );
}