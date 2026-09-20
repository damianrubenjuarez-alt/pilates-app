// src/Clases.jsx
import { useEffect, useState } from 'react';
import { useEstudio } from './EstudioContext';
import {
  suscribirSlotsPorRango, reservarCama, cancelarCama,
  lunesDe, sumarDias, formatoISO, CalendarioCamas
} from './agenda';

export function Clases() {
  const { estudio, miembro, user, recargar } = useEstudio();
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState('');
  const [cargando, setCargando] = useState(true);
  const [semana, setSemana] = useState(new Date());

  useEffect(() => {
    if (!estudio) return;
    setCargando(true);

    const lunes = lunesDe(semana);
    const domingo = sumarDias(lunes, 6);

    const unsub = suscribirSlotsPorRango(
      estudio.id,
      formatoISO(lunes),
      formatoISO(domingo),
      (data, err) => {
        if (err) {
          console.error(err);
          setCargando(false);
          return;
        }
        setSlots(data);
        setCargando(false);
      }
    );

    return () => unsub();
  }, [semana, estudio?.id]);

  const reservar = async (slotId, numeroCama) => {
    setMsg('');
    try {
      await reservarCama(
        estudio.id, slotId, numeroCama,
        user.uid,
        miembro?.nombre || 'Alumno',
        miembro?.telefono || null
      );
      setMsg(`✅ Cama ${numeroCama} reservada`);
      recargar();
    } catch (e) { setMsg('⚠️ ' + e.message); }
  };

  const cancelar = async (slotId, numeroCama) => {
    setMsg('');
    try {
      await cancelarCama(
        estudio.id, slotId, numeroCama,
        user.uid,
        miembro?.rol === 'admin' || miembro?.rol === 'instructor',
        estudio.limiteCancelacionHoras ?? 0
      );
      setMsg(`✅ Reserva cancelada (cama ${numeroCama})`);
      recargar();
    } catch (e) { setMsg('⚠️ ' + e.message); }
  };

  const cambiarSemana = (dias) => {
    const nueva = new Date(semana);
    nueva.setDate(nueva.getDate() + dias);
    setSemana(nueva);
  };

  if (!estudio) return <div className="p-8">Cargando estudio...</div>;

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Agenda semanal</h1>
          <p className="text-sm text-gray-500">
            {miembro?.nombre} · {miembro?.clasesRestantes ?? 0} clases disponibles
          </p>
        </div>
        <button onClick={() => setSemana(new Date())}
          className="text-sm px-3 py-1 rounded border bg-white hover:bg-gray-100">
          Hoy
        </button>
      </div>

      {msg && <p className="mb-4 text-sm bg-gray-100 p-2 rounded">{msg}</p>}
      {cargando && <p className="mb-4 text-sm text-gray-500">Cargando...</p>}

      <CalendarioCamas
        slots={slots}
        uid={user?.uid || null}
        onReservar={reservar}
        onCancelar={cancelar}
        semanaBase={semana}
        onCambiarSemana={cambiarSemana}
        estudioNombre={estudio?.nombre || ''}
      />
    </div>
  );
}