// src/AdminCaja.jsx
import { useState, useEffect } from 'react';
import { useEstudio } from './EstudioContext';
import { listarMovimientos, resumenDelDia, registrarMovimiento } from './caja';
import { Wallet, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export function AdminCaja() {
  const { estudio, user, esAdmin } = useEstudio();
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    if (!estudio) return;
    setCargando(true);
    setError('');
    try {
      const r = await resumenDelDia(estudio.id, fecha);
      setResumen(r);
    } catch (e) {
      console.error(e);
      setError('Error al cargar: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [estudio?.id, fecha]);

  if (!estudio) return <div className="p-8">Cargando estudio...</div>;

  if (!esAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold mb-2">Acceso denegado</h2>
          <p className="text-sm text-gray-600">
            Solo los administradores pueden ver la caja.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-purple-600" />
            Caja diaria
          </h1>
          <p className="text-sm text-gray-500">{estudio.nombre}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <button
            onClick={() => setModalNuevo(true)}
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 text-sm flex items-center gap-2 font-medium"
          >
            <Plus className="w-4 h-4" /> Nuevo movimiento
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      ) : resumen && (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Ingresos</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                ${resumen.totalIngresos.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-green-600">
                {resumen.cantidadIngresos} {resumen.cantidadIngresos === 1 ? 'movimiento' : 'movimientos'}
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-medium">Egresos</span>
              </div>
              <p className="text-2xl font-bold text-red-900">
                ${resumen.totalEgresos.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-red-600">
                {resumen.cantidadEgresos} {resumen.cantidadEgresos === 1 ? 'movimiento' : 'movimientos'}
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-700 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium">Balance</span>
              </div>
              <p className={`text-2xl font-bold ${resumen.balance >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                ${resumen.balance.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-purple-600">
                {resumen.movimientos.length} total
              </p>
            </div>
          </div>

          {/* Por método de pago */}
          <div className="bg-white border rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3 text-sm">Ingresos por método</h3>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(resumen.porMetodo).map(([metodo, monto]) => (
                <div key={metodo} className="bg-gray-50 rounded px-3 py-2">
                  <p className="text-xs text-gray-500 uppercase">{metodo}</p>
                  <p className="font-bold">${monto.toLocaleString('es-AR')}</p>
                </div>
              ))}
              {Object.keys(resumen.porMetodo).length === 0 && (
                <p className="text-sm text-gray-400">Sin ingresos este día</p>
              )}
            </div>
          </div>

          {/* Lista de movimientos */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b bg-gray-50 font-semibold text-sm text-gray-700">
              Movimientos del día ({resumen.movimientos.length})
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {resumen.movimientos.map(m => (
                <div key={m.id} className="px-4 py-3 flex justify-between items-center text-sm hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {m.tipo === 'ingreso' ? '💰' : '💸'} {m.concepto || m.categoria}
                    </p>
                    <p className="text-xs text-gray-500">
                      {m.metodo} · {m.alumnoNombre || 'General'}
                    </p>
                  </div>
                  <span className={`font-bold ml-2 whitespace-nowrap ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {m.tipo === 'ingreso' ? '+' : '-'}${m.monto.toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
              {resumen.movimientos.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">
                  Sin movimientos este día
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {modalNuevo && (
        <ModalNuevoMovimiento
          estudio={estudio}
          user={user}
          onCerrar={() => setModalNuevo(false)}
          onCreado={() => { setModalNuevo(false); cargar(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// MODAL: NUEVO MOVIMIENTO
// ============================================================
function ModalNuevoMovimiento({ estudio, user, onCerrar, onCreado }) {
  const [tipo, setTipo] = useState('ingreso');
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [categoria, setCategoria] = useState('clase');
  const [concepto, setConcepto] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);

    try {
      await registrarMovimiento(estudio.id, {
        tipo,
        monto: Number(monto),
        metodo,
        categoria,
        concepto,
        creadoPor: user.uid
      });
      onCreado();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-bold">Nuevo movimiento</h3>

        {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo('ingreso')}
            className={`flex-1 py-2 rounded border font-medium transition ${tipo === 'ingreso' ? 'bg-green-600 text-white border-green-600' : 'bg-white hover:bg-gray-50'}`}
          >
            💰 Ingreso
          </button>
          <button
            type="button"
            onClick={() => setTipo('egreso')}
            className={`flex-1 py-2 rounded border font-medium transition ${tipo === 'egreso' ? 'bg-red-600 text-white border-red-600' : 'bg-white hover:bg-gray-50'}`}
          >
            💸 Egreso
          </button>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">Monto</label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
            required
            min="1"
            className="w-full border rounded px-3 py-2 text-lg"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">Método</label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)}
            className="w-full border rounded px-3 py-2">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">Categoría</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
            className="w-full border rounded px-3 py-2">
            <option value="clase">Clase individual</option>
            <option value="pack">Pack de clases</option>
            <option value="suscripcion">Suscripción</option>
            <option value="producto">Producto</option>
            <option value="sueldo">Sueldo</option>
            <option value="alquiler">Alquiler</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">Concepto (opcional)</label>
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej: Pack 8 clases - Juan Pérez"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} disabled={guardando}
            className="px-4 py-2 rounded border hover:bg-gray-100 disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={guardando || !monto}
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 font-medium">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}