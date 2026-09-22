// src/Admin.jsx
import { useEffect, useState } from 'react';
import { useEstudio } from './EstudioContext';
import {
  suscribirSlotsPorRango, crearSlot, crearSlotsMultiples, eliminarSlot,
  lunesDe, sumarDias, formatoISO, CalendarioCamas, HORAS
} from './agenda';

export function Admin() {
  const { estudio } = useEstudio();
  const [slots, setSlots] = useState([]);
  const [semana, setSemana] = useState(new Date());
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ instructor: 'Lucía', tipo: 'Reformer', camas: 8 });

  const [modalSemana, setModalSemana] = useState(false);
  const [formSemana, setFormSemana] = useState({
    dias: [1, 2, 3, 4, 5],
    horas: [...HORAS],
    instructor: 'Lucía',
    tipo: 'Reformer',
    camas: 8
  });
  const [creando, setCreando] = useState(false);
  const [msgAdmin, setMsgAdmin] = useState('');
  const [cargando, setCargando] = useState(true);

  const [modalBorrar, setModalBorrar] = useState(false);
  const [formBorrar, setFormBorrar] = useState({
    dias: [1, 2, 3, 4, 5, 6, 7],
    horas: [...HORAS]
  });

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

  const abrirModal = (fecha, horas) => {
    const horasArr = Array.isArray(horas) ? horas : [horas];
    if (horasArr.length === 0) return;
    setModal({ fecha, horas: horasArr });
  };

  const crearDesdeModal = async () => {
    if (!modal) return;
    setMsgAdmin('');
    setCreando(true);
    try {
      const { creados, duplicados, errores } = await crearSlotsMultiples(
        estudio.id,
        {
          fecha: modal.fecha,
          horas: modal.horas,
          instructor: form.instructor,
          tipo: form.tipo,
          camas: Number(form.camas)
        }
      );

      let mensaje = '';
      if (creados.length > 0) mensaje += `✅ ${creados.length} ${creados.length === 1 ? 'slot creado' : 'slots creados'}`;
      if (duplicados.length > 0) {
        if (mensaje) mensaje += ' · ';
        mensaje += `${duplicados.length} ya existían`;
      }
      if (errores.length > 0) {
        if (mensaje) mensaje += ' · ';
        mensaje += `⚠️ ${errores.length} con error`;
      }
      if (!mensaje) mensaje = 'ℹ️ No se creó ningún slot';

      setMsgAdmin(mensaje);
      setModal(null);
    } catch (e) {
      console.error(e);
      setMsgAdmin('⚠️ Error: ' + e.message);
    } finally {
      setCreando(false);
    }
  };

  const borrarSlot = async (slotId) => {
    if (!confirm('¿Eliminar este slot y todas sus reservas?')) return;
    await eliminarSlot(estudio.id, slotId);
  };

  const cambiarSemana = (dias) => {
    const nueva = new Date(semana);
    nueva.setDate(nueva.getDate() + dias);
    setSemana(nueva);
  };

  const crearSemanaCompleta = async () => {
    setMsgAdmin('');
    setCreando(true);
    try {
      const lunes = lunesDe(semana);
      let creados = 0;
      let duplicados = 0;
      let primerError = null;

      for (const dia of formSemana.dias) {
        const fecha = sumarDias(lunes, dia - 1);
        for (const hora of formSemana.horas) {
          try {
            await crearSlot(estudio.id, {
              fecha: formatoISO(fecha),
              hora,
              instructor: formSemana.instructor,
              tipo: formSemana.tipo,
              camas: Number(formSemana.camas)
            });
            creados++;
          } catch (err) {
            if (err.message?.includes('Ya existe')) {
              duplicados++;
            } else {
              if (!primerError) primerError = err;
            }
          }
        }
      }

      let mensaje = '';
      if (creados > 0) mensaje += `✅ ${creados} slots creados`;
      if (duplicados > 0) {
        if (mensaje) mensaje += ' · ';
        mensaje += `${duplicados} ya existían`;
      }
      if (primerError) {
        if (mensaje) mensaje += ' · ';
        mensaje += `⚠️ ${primerError.message}`;
      }
      if (!mensaje) mensaje = 'ℹ️ No se creó ningún slot';

      setMsgAdmin(mensaje);

      if (!primerError) {
        setModalSemana(false);
      }
    } catch (e) {
      console.error(e);
      setMsgAdmin('⚠️ Error: ' + e.message);
    } finally {
      setCreando(false);
    }
  };

  const borrarSemanaSelectiva = async () => {
    setMsgAdmin('');
    setCreando(true);
    try {
      let borrados = 0;
      for (const slot of slots) {
        const fechaSlot = new Date(slot.fecha + 'T00:00:00');
        const diaSemana = fechaSlot.getDay() === 0 ? 7 : fechaSlot.getDay();
        const matchDia = formBorrar.dias.includes(diaSemana);
        const matchHora = formBorrar.horas.includes(slot.hora);
        if (matchDia && matchHora) {
          await eliminarSlot(estudio.id, slot.id);
          borrados++;
        }
      }
      setMsgAdmin(`🗑️ ${borrados} slots eliminados`);
      setModalBorrar(false);
    } catch (e) {
      console.error(e);
      setMsgAdmin('⚠️ Error al borrar: ' + e.message);
    } finally {
      setCreando(false);
    }
  };

  if (!estudio) return <div className="p-8">Cargando estudio...</div>;

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h1 className="text-xl md:text-2xl font-bold">Panel Admin</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSemana(new Date())}
            className="text-sm px-3 py-1 rounded border bg-white hover:bg-gray-100">
            Hoy
          </button>
          <button onClick={() => setModalSemana(true)}
            className="text-sm px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700">
            Crear semana
          </button>
          <button onClick={() => setModalBorrar(true)}
            className="text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
            Borrar horarios
          </button>
        </div>
      </div>

      {msgAdmin && (
        <p className="mb-4 text-sm bg-yellow-50 border border-yellow-200 p-2 rounded">
          {msgAdmin}
        </p>
      )}

      <p className="text-sm text-gray-500 mb-4">
        💡 Clic en <strong>+ crear</strong> en cualquier celda vacía para agregar un slot.
      </p>

      {cargando && <p className="mb-4 text-sm text-gray-500">Cargando...</p>}

      <CalendarioCamas
        slots={slots}
        uid={null}
        onReservar={() => {}}
        onCancelar={() => {}}
        semanaBase={semana}
        onCambiarSemana={cambiarSemana}
        esAdmin
        onCrearSlot={abrirModal}
        estudioNombre={estudio?.nombre || ''}
        estudioId={estudio?.id || ''}
      />

      <div className="mt-6 bg-white border rounded-lg">
        <div className="px-4 py-2 border-b font-semibold text-sm text-gray-700">
          Slots de la semana ({slots.length})
        </div>
        <div className="divide-y max-h-72 overflow-y-auto">
          {slots.map(s => (
            <div key={s.id} className="px-4 py-2 flex justify-between items-center text-sm">
              <span>
                <strong>{s.fecha}</strong> {s.hora} · {s.instructor} ·{' '}
                {s.camas.filter(c => c.estado === 'ocupada').length}/{s.camas.length} ocupadas
              </span>
              <button onClick={() => borrarSlot(s.id)} className="text-red-600 hover:underline">
                Eliminar
              </button>
            </div>
          ))}
          {slots.length === 0 && !cargando && (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              No hay slots esta semana
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold">
              {modal.horas.length === 1 ? 'Crear slot' : `Crear ${modal.horas.length} slots`}
            </h3>
            <div className="text-sm text-gray-500 space-y-1">
              <p>📅 {modal.fecha}</p>
              <p className="flex flex-wrap gap-1">
                🕐 {modal.horas.map(h => (
                  <span key={h} className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-xs">
                    {h}
                  </span>
                ))}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Instructor</label>
              <input value={form.instructor}
                onChange={e => setForm({ ...form, instructor: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tipo</label>
              <select value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
                className="w-full border rounded px-3 py-2">
                <option>Reformer</option>
                <option>Mat</option>
                <option>Cadillac</option>
                <option>Chair</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cantidad de camas</label>
              <input type="number" min="1" max="20" value={form.camas}
                onChange={e => setForm({ ...form, camas: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} disabled={creando}
                className="px-4 py-2 rounded border hover:bg-gray-100 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={crearDesdeModal} disabled={creando}
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                {creando ? 'Creando...' : `Crear ${modal.horas.length === 1 ? 'slot' : `${modal.horas.length} slots`}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSemana && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4 my-8">
            <h3 className="text-lg font-bold">Crear semana</h3>
            <p className="text-sm text-gray-500">
              Semana del <strong>{formatoISO(lunesDe(semana))}</strong> al{' '}
              <strong>{formatoISO(sumarDias(lunesDe(semana), 6))}</strong>
            </p>

            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">Días de la semana</label>
              <div className="flex gap-1 flex-wrap">
                {[
                  { num: 1, label: 'Lun' }, { num: 2, label: 'Mar' },
                  { num: 3, label: 'Mié' }, { num: 4, label: 'Jue' },
                  { num: 5, label: 'Vie' }, { num: 6, label: 'Sáb' },
                  { num: 7, label: 'Dom' }
                ].map(d => {
                  const activo = formSemana.dias.includes(d.num);
                  return (
                    <button key={d.num} type="button"
                      onClick={() => {
                        const nuevos = activo
                          ? formSemana.dias.filter(x => x !== d.num)
                          : [...formSemana.dias, d.num].sort();
                        setFormSemana({ ...formSemana, dias: nuevos });
                      }}
                      className={`px-3 py-1 rounded text-sm border ${
                        activo
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-2 text-xs flex-wrap">
                <button type="button" onClick={() => setFormSemana({ ...formSemana, dias: [1,2,3,4,5] })} className="text-purple-600 hover:underline">Lunes a viernes</button>
                <button type="button" onClick={() => setFormSemana({ ...formSemana, dias: [6,7] })} className="text-purple-600 hover:underline">Fin de semana</button>
                <button type="button" onClick={() => setFormSemana({ ...formSemana, dias: [1,2,3,4,5,6,7] })} className="text-purple-600 hover:underline">Todos</button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">Horarios habilitados</label>
              <div className="grid grid-cols-4 gap-1">
                {HORAS.map(h => {
                  const activo = formSemana.horas.includes(h);
                  return (
                    <button key={h} type="button"
                      onClick={() => {
                        const nuevas = activo
                          ? formSemana.horas.filter(x => x !== h)
                          : [...formSemana.horas, h].sort();
                        setFormSemana({ ...formSemana, horas: nuevas });
                      }}
                      className={`px-2 py-1 rounded text-xs border ${
                        activo
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}>
                      {h}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-2 text-xs flex-wrap">
                <button type="button" onClick={() => setFormSemana({ ...formSemana, horas: [...HORAS] })} className="text-purple-600 hover:underline">Todos</button>
                <button type="button" onClick={() => setFormSemana({ ...formSemana, horas: ['08:00','09:00','10:00','11:00','12:00'] })} className="text-purple-600 hover:underline">Mañana</button>
                <button type="button" onClick={() => setFormSemana({ ...formSemana, horas: ['14:00','15:00','16:00','17:00','18:00','19:00','20:00'] })} className="text-purple-600 hover:underline">Tarde</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Instructor</label>
                <input value={formSemana.instructor}
                  onChange={e => setFormSemana({ ...formSemana, instructor: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                <select value={formSemana.tipo}
                  onChange={e => setFormSemana({ ...formSemana, tipo: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm">
                  <option>Reformer</option>
                  <option>Mat</option>
                  <option>Cadillac</option>
                  <option>Chair</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Camas</label>
                <input type="number" min="1" max="20" value={formSemana.camas}
                  onChange={e => setFormSemana({ ...formSemana, camas: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm" />
              </div>
            </div>

            <div className="bg-gray-50 rounded p-2 text-xs text-gray-600">
              Se van a crear <strong>{formSemana.dias.length * formSemana.horas.length}</strong> slots
              {' '}({formSemana.dias.length} días × {formSemana.horas.length} horarios)
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalSemana(false)} disabled={creando}
                className="px-4 py-2 rounded border hover:bg-gray-100 disabled:opacity-50">Cancelar</button>
              <button onClick={crearSemanaCompleta}
                disabled={creando || formSemana.dias.length === 0 || formSemana.horas.length === 0}
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                {creando ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalBorrar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4 my-8">
            <h3 className="text-lg font-bold text-red-600">Borrar horarios</h3>
            <p className="text-sm text-gray-500">
              Se van a eliminar los slots de la semana del{' '}
              <strong>{formatoISO(lunesDe(semana))}</strong> al{' '}
              <strong>{formatoISO(sumarDias(lunesDe(semana), 6))}</strong> que coincidan.
            </p>

            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">Días a borrar</label>
              <div className="flex gap-1 flex-wrap">
                {[
                  { num: 1, label: 'Lun' }, { num: 2, label: 'Mar' },
                  { num: 3, label: 'Mié' }, { num: 4, label: 'Jue' },
                  { num: 5, label: 'Vie' }, { num: 6, label: 'Sáb' },
                  { num: 7, label: 'Dom' }
                ].map(d => {
                  const activo = formBorrar.dias.includes(d.num);
                  return (
                    <button key={d.num} type="button"
                      onClick={() => {
                        const nuevos = activo
                          ? formBorrar.dias.filter(x => x !== d.num)
                          : [...formBorrar.dias, d.num].sort();
                        setFormBorrar({ ...formBorrar, dias: nuevos });
                      }}
                      className={`px-3 py-1 rounded text-sm border ${
                        activo
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">Horarios a borrar</label>
              <div className="grid grid-cols-4 gap-1">
                {HORAS.map(h => {
                  const activo = formBorrar.horas.includes(h);
                  return (
                    <button key={h} type="button"
                      onClick={() => {
                        const nuevas = activo
                          ? formBorrar.horas.filter(x => x !== h)
                          : [...formBorrar.horas, h].sort();
                        setFormBorrar({ ...formBorrar, horas: nuevas });
                      }}
                      className={`px-2 py-1 rounded text-xs border ${
                        activo
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}>
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
              <p className="font-medium mb-1">Se van a eliminar:</p>
              <p>
                <strong>{slots.filter(s => {
                  const fechaSlot = new Date(s.fecha + 'T00:00:00');
                  const diaSemana = fechaSlot.getDay() === 0 ? 7 : fechaSlot.getDay();
                  return formBorrar.dias.includes(diaSemana) && formBorrar.horas.includes(s.hora);
                }).length}</strong> slots de esta semana
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalBorrar(false)} disabled={creando}
                className="px-4 py-2 rounded border hover:bg-gray-100 disabled:opacity-50">Cancelar</button>
              <button onClick={borrarSemanaSelectiva}
                disabled={creando || formBorrar.dias.length === 0 || formBorrar.horas.length === 0}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {creando ? 'Borrando...' : 'Borrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}