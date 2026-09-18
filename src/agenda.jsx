// src/agenda.jsx
import { useEffect, useState } from 'react';
import {
  collection, addDoc, getDoc, setDoc, getDocs, query, where, orderBy,
  doc, updateDoc, deleteDoc, runTransaction, Timestamp, onSnapshot
} from 'firebase/firestore';
import { db } from './firebase/config';
import { useEstudio } from './EstudioContext';

// ============================================================
// SERVICIOS DE SLOTS (multi-tenant)
// ============================================================
const slotsCol = (estudioId) =>
  collection(db, 'estudios', estudioId, 'slots');

export async function crearSlot(estudioId, {
  fecha, hora, instructor, tipo = 'Reformer', camas = 8
}) {
  const id = `${fecha}_${hora.replace(':', '')}`;
  const ref = doc(db, 'estudios', estudioId, 'slots', id);

  const existente = await getDoc(ref);
  if (existente.exists()) {
    throw new Error(`Ya existe un slot para ${fecha} ${hora}`);
  }

  const camasArray = Array.from({ length: camas }, (_, i) => ({
    numero: i + 1, estado: 'libre', uid: null, nombre: null
  }));

  return setDoc(ref, {
    fecha, hora, instructor, tipo, camas: camasArray,
    creadoEn: Timestamp.now()
  });
}

// Lee una sola vez (se usa en MisReservas)
export async function listarSlotsPorRango(estudioId, desde, hasta) {
  const q = query(
    slotsCol(estudioId),
    where('fecha', '>=', desde),
    where('fecha', '<=', hasta),
    orderBy('fecha')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return a.hora.localeCompare(b.hora);
    });
}

// Suscripción en tiempo real
export function suscribirSlotsPorRango(estudioId, desde, hasta, callback) {
  const q = query(
    slotsCol(estudioId),
    where('fecha', '>=', desde),
    where('fecha', '<=', hasta),
    orderBy('fecha')
  );

  return onSnapshot(
    q,
    (snap) => {
      const slots = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
          return a.hora.localeCompare(b.hora);
        });
      callback(slots);
    },
    (err) => {
      console.error('Error en onSnapshot de slots:', err);
      callback(null, err);
    }
  );
}

export async function reservarCama(estudioId, slotId, numeroCama, uid, nombre) {
  return runTransaction(db, async (tx) => {
    const slotRef = doc(db, 'estudios', estudioId, 'slots', slotId);
    const miembroRef = doc(db, 'estudios', estudioId, 'miembros', uid);

    const [slotSnap, miembroSnap] = await Promise.all([
      tx.get(slotRef), tx.get(miembroRef)
    ]);

    if (!slotSnap.exists()) throw new Error('Slot no encontrado');
    if (!miembroSnap.exists()) throw new Error('No pertenecés a este estudio');

    const slot = slotSnap.data();
    const miembro = miembroSnap.data();

    const hoyISO = new Date().toISOString().slice(0, 10);
    if (slot.fecha < hoyISO) {
      throw new Error('No podés reservar una clase pasada');
    }

    if ((miembro.clasesRestantes || 0) <= 0) {
      throw new Error('No tenés clases disponibles');
    }

    const camaIdx = slot.camas.findIndex(c => c.numero === numeroCama);
    if (camaIdx === -1) throw new Error('Cama no existe');
    if (slot.camas[camaIdx].estado === 'ocupada') throw new Error('Cama ya ocupada');
    if (slot.camas.some(c => c.uid === uid)) {
      throw new Error('Ya tenés una cama en este horario');
    }

    const camasNuevas = [...slot.camas];
    camasNuevas[camaIdx] = { ...camasNuevas[camaIdx], estado: 'ocupada', uid, nombre };

    tx.update(slotRef, { camas: camasNuevas });
    tx.update(miembroRef, { clasesRestantes: (miembro.clasesRestantes || 0) - 1 });
  });
}

export async function cancelarCama(estudioId, slotId, numeroCama, uidSolicitante, esAdmin = false) {
  return runTransaction(db, async (tx) => {
    const slotRef = doc(db, 'estudios', estudioId, 'slots', slotId);
    const slotSnap = await tx.get(slotRef);
    if (!slotSnap.exists()) throw new Error('Slot no encontrado');

    const slot = slotSnap.data();
    const camaIdx = slot.camas.findIndex(c => c.numero === numeroCama);
    if (camaIdx === -1) throw new Error('Cama no existe');

    const cama = slot.camas[camaIdx];
    if (cama.estado !== 'ocupada') throw new Error('Cama ya está libre');
    if (!cama.uid) throw new Error('La cama no tiene dueño');

    if (!esAdmin && cama.uid !== uidSolicitante) {
      throw new Error('No podés cancelar la reserva de otra persona');
    }

    const miembroRef = doc(db, 'estudios', estudioId, 'miembros', cama.uid);
    const miembroSnap = await tx.get(miembroRef);

    const camasNuevas = [...slot.camas];
    camasNuevas[camaIdx] = {
      numero: cama.numero, estado: 'libre', uid: null, nombre: null
    };

    tx.update(slotRef, { camas: camasNuevas });

    if (miembroSnap.exists()) {
      const m = miembroSnap.data();
      tx.update(miembroRef, { clasesRestantes: (m.clasesRestantes || 0) + 1 });
    }
  });
}

export async function eliminarSlot(estudioId, slotId) {
  return deleteDoc(doc(db, 'estudios', estudioId, 'slots', slotId));
}

// ============================================================
// HELPERS DE FECHA
// ============================================================
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
               'Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const HORAS = ['08:00','09:00','10:00','11:00','12:00','13:00',
               '14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

function lunesDe(fecha) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function formatoISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================================
// COMPONENTE: CAMAS DE UN SLOT
// ============================================================
function CamasDelSlot({ slot, uid, onReservar, onCancelar }) {
  const libres = slot.camas.filter(c => c.estado === 'libre').length;

  return (
    <div className="space-y-1">
      <div className="text-[9px] text-gray-500 leading-tight mb-1">
        {slot.instructor} · {libres}/{slot.camas.length}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {slot.camas.map(cama => {
          const esMia = uid && cama.uid === uid;
          const ocupada = cama.estado === 'ocupada';
          return (
            <button
              key={cama.numero}
              onClick={() => {
                if (esMia) {
                  if (confirm('¿Cancelar esta reserva?')) onCancelar(slot.id, cama.numero);
                } else if (!ocupada && uid) {
                  onReservar(slot.id, cama.numero);
                }
              }}
              disabled={(ocupada && !esMia) || (!uid && !esMia)}
              title={
                esMia ? `Tu cama ${cama.numero} - clic para cancelar`
                : ocupada ? `Ocupada por ${cama.nombre || 'alguien'}`
                : `Cama ${cama.numero} libre`
              }
              className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center transition ${
                esMia ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                : ocupada ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-white border border-gray-300 text-gray-500 hover:bg-purple-100 hover:border-purple-400 cursor-pointer'
              }`}
            >
              {esMia ? '✓' : ocupada ? '×' : cama.numero}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: CALENDARIO
// ============================================================
export function CalendarioCamas({
  slots, uid, onReservar, onCancelar, semanaBase, onCambiarSemana,
  esAdmin = false, onCrearSlot
}) {
  const lunes = lunesDe(semanaBase);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const hoy = formatoISO(new Date());

  const slotMap = {};
  slots.forEach(s => { slotMap[`${s.fecha}|${s.hora}`] = s; });

  const primerDia = dias[0];
  const ultimoDia = dias[6];
  const titulo = primerDia.getMonth() === ultimoDia.getMonth()
    ? `${primerDia.getDate()} - ${ultimoDia.getDate()} de ${MESES[primerDia.getMonth()]} ${primerDia.getFullYear()}`
    : `${primerDia.getDate()} ${MESES[primerDia.getMonth()].slice(0,3)} - ${ultimoDia.getDate()} ${MESES[ultimoDia.getMonth()].slice(0,3)} ${ultimoDia.getFullYear()}`;

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <button onClick={() => onCambiarSemana(-7)}
          className="px-3 py-1 rounded border bg-white hover:bg-gray-100 text-sm">
          ← Semana anterior
        </button>
        <h2 className="font-semibold text-gray-700">{titulo}</h2>
        <button onClick={() => onCambiarSemana(7)}
          className="px-3 py-1 rounded border bg-white hover:bg-gray-100 text-sm">
          Semana siguiente →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-20 border-b border-r bg-gray-50 p-2 text-xs text-gray-500">Hora</th>
              {dias.map((dia, i) => {
                const iso = formatoISO(dia);
                const esHoy = iso === hoy;
                return (
                  <th key={iso} className={`border-b border-r p-2 text-center ${esHoy ? 'bg-purple-50' : 'bg-gray-50'}`}>
                    <div className={`text-xs uppercase ${esHoy ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>
                      {DIAS[i]}
                    </div>
                    <div className={`text-lg font-bold ${esHoy ? 'text-purple-700' : 'text-gray-800'}`}>
                      {dia.getDate()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(hora => (
              <tr key={hora}>
                <td className="border-b border-r bg-gray-50 p-2 text-xs font-medium text-gray-600 text-center">
                  {hora}
                </td>
                {dias.map(dia => {
                  const iso = formatoISO(dia);
                  const slot = slotMap[`${iso}|${hora}`];
                  return (
                    <td key={`${iso}|${hora}`} className="border-b border-r p-1 align-top">
                      {slot ? (
                        <CamasDelSlot slot={slot} uid={uid}
                          onReservar={onReservar} onCancelar={onCancelar} />
                      ) : esAdmin ? (
                        <button onClick={() => onCrearSlot(iso, hora)}
                          className="w-full h-14 text-gray-300 hover:text-purple-500 hover:bg-purple-50 rounded text-xs transition"
                          title="Crear slot">
                          + crear
                        </button>
                      ) : (
                        <div className="h-14 text-center text-gray-200 text-xs pt-3">—</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t bg-gray-50 flex gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-gray-300 bg-white inline-block"></span> Libre
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-green-400 bg-green-100 inline-block"></span> Tuya
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-gray-400 bg-gray-300 inline-block"></span> Ocupada
        </span>
      </div>
    </div>
  );
}

// ============================================================
// PÁGINA: CLASES (alumno)
// ============================================================
export function Clases() {
  const { estudio, miembro, user } = useEstudio();
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState('');
  const [cargando, setCargando] = useState(true);
  const [semana, setSemana] = useState(new Date());

  // ⚡ onSnapshot en tiempo real
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
        miembro?.nombre || 'Alumno'
      );
      setMsg(`✅ Cama ${numeroCama} reservada`);
    } catch (e) { setMsg('⚠️ ' + e.message); }
  };

  const cancelar = async (slotId, numeroCama) => {
    setMsg('');
    try {
      await cancelarCama(
        estudio.id, slotId, numeroCama,
        user.uid,
        miembro?.rol === 'admin' || miembro?.rol === 'instructor'
      );
      setMsg(`✅ Reserva cancelada (cama ${numeroCama})`);
    } catch (e) { setMsg('⚠️ ' + e.message); }
  };

  const cambiarSemana = (dias) => {
    const nueva = new Date(semana);
    nueva.setDate(nueva.getDate() + dias);
    setSemana(nueva);
  };

  if (!estudio) return <div className="p-8">Cargando estudio...</div>;

  return (
    <div className="max-w-[1400px] mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Agenda semanal</h1>
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
      />
    </div>
  );
}

// ============================================================
// PÁGINA: ADMIN
// ============================================================
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

  // ⚡ onSnapshot en tiempo real
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

  const abrirModal = (fecha, hora) => setModal({ fecha, hora });

  const crearDesdeModal = async () => {
    if (!modal) return;
    try {
      await crearSlot(estudio.id, {
        fecha: modal.fecha, hora: modal.hora,
        instructor: form.instructor, tipo: form.tipo,
        camas: Number(form.camas)
      });
      setModal(null);
    } catch (e) {
      alert('⚠️ Error al crear slot: ' + e.message);
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
    <div className="max-w-[1400px] mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Panel Admin</h1>
        <div className="flex gap-2">
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

      {/* MODAL CREAR SLOT */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 space-y-4">
            <h3 className="text-lg font-bold">Crear slot</h3>
            <p className="text-sm text-gray-500">📅 {modal.fecha} · 🕐 {modal.hora}</p>
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
              <button onClick={() => setModal(null)}
                className="px-4 py-2 rounded border hover:bg-gray-100">Cancelar</button>
              <button onClick={crearDesdeModal}
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR SEMANA COMPLETA */}
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
              <div className="flex gap-3 mt-2 text-xs">
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
              <div className="flex gap-3 mt-2 text-xs">
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

      {/* MODAL BORRAR HORARIOS */}
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

// ============================================================
// PÁGINA: MIS RESERVAS
// ============================================================
export function MisReservas() {
  const { estudio, user } = useEstudio();
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
      await cancelarCama(estudio.id, slotId, numeroCama, user.uid, false);
      setMsg('✅ Reserva cancelada');
      cargar();
    } catch (e) {
      setMsg('⚠️ ' + e.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Mis reservas</h1>
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