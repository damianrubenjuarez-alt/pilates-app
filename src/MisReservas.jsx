// src/MisReservas.jsx
import { useEffect, useState } from 'react';
import { useEstudio } from './EstudioContext';
import {
  listarSlotsPorRango, cancelarCama,
  sumarDias, formatoISO
} from './agenda';

export function MisReservas() {
  const { estudio, user, recargar } = useEstudio();
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState('');

  const cargar = async () => {
    if (!estudio || !user) return;
    setCargando(true);
    try {
      const hoy = new Date();
      const desde = formatoISO(hoy);
      const hasta = formatoISO(sumarDias(hoy, 28));
      const data = await listarSlotsPorRango(estudio.id, desde, hasta);

      const mias = [];
      data.forEach(slot => {
        slot.camas.forEach(cama => {
          if (cama.uid === user.uid) {
            mias.push({
              slotId: slot.id,
              fecha: slot.fecha,
              hora: slot.hora,
              instructor: slot.instructor,
              tipo: slot.tipo,
              cama: cama.numero
            });
          }
        });
      });

      mias.sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
        return a.hora.localeCompare(b.hora);
      });

      setReservas(mias);
    } catch (e) {
      setMsg('⚠️ Error al cargar reservas: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [estudio?.id, user?.uid]);

  const cancelar = async (slotId, numeroCama) => {
    if (!confirm('¿Cancelar esta reserva?')) return;
    setMsg('');
    try {
      await cancelarCama(
        estudio.id, slotId, numeroCama, user.uid, false,
        estudio.limiteCancelacionHoras ?? 0
      );
      setMsg('✅ Reserva cancelada');
      recargar();
      cargar();
    } catch (e) {
      setMsg('⚠️ ' + e.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl md:text-2xl font-bold">Mis reservas</h1>
        <button onClick={cargar}
          className="text-sm px-3 py-1 rounded border bg-white hover:bg-gray-100">
          🔄 Recargar
        </button>
      </div>

      {msg && <p className="mb-4 text-sm bg-gray-100 p-2 rounded">{msg}</p>}

      {cargando ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="space-y-2">
          {reservas.map((r, i) => (
            <div key={i} className="border rounded p-3 bg-white flex justify-between items-center">
              <div>
                <p className="font-medium">📅 {r.fecha} · 🕐 {r.hora}</p>
                <p className="text-sm text-gray-600">
                  {r.tipo} · {r.instructor} · Cama {r.cama}
                </p>
              </div>
              <button
                onClick={() => cancelar(r.slotId, r.cama)}
                className="text-sm px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50">
                Cancelar
              </button>
            </div>
          ))}
          {reservas.length === 0 && (
            <p className="text-gray-500">Sin reservas próximas.</p>
          )}
        </div>
      )}
    </div>
  );
}