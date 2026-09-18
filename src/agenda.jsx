// src/agenda.jsx
// Librería compartida: servicios, helpers y componentes de calendario

import { useState } from 'react';
import {
  collection, getDoc, setDoc, getDocs, query, where, orderBy,
  doc, deleteDoc, runTransaction, Timestamp, onSnapshot
} from 'firebase/firestore';
import { db } from './firebase/config';

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

// Crear varios slots de un mismo día (mismo instructor/tipo/camas)
export async function crearSlotsMultiples(estudioId, { fecha, horas, instructor, tipo, camas }) {
  const creados = [];
  const errores = [];
  const duplicados = [];

  for (const hora of horas) {
    try {
      await crearSlot(estudioId, { fecha, hora, instructor, tipo, camas });
      creados.push(hora);
    } catch (err) {
      if (err.message?.includes('Ya existe')) {
        duplicados.push(hora);
      } else {
        errores.push({ hora, error: err.message });
      }
    }
  }

  return { creados, duplicados, errores };
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

    const fechaSlot = new Date(slot.fecha + 'T' + slot.hora + ':00');
    const ahora = new Date();
    if (fechaSlot < ahora) {
      throw new Error('No podés reservar una clase que ya comenzó');
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

export async function cancelarCama(estudioId, slotId, numeroCama, uidSolicitante, esAdmin = false, limiteHoras = 0) {
  return runTransaction(db, async (tx) => {
    const slotRef = doc(db, 'estudios', estudioId, 'slots', slotId);
    const slotSnap = await tx.get(slotRef);
    if (!slotSnap.exists()) throw new Error('Slot no encontrado');

    const slot = slotSnap.data();

    if (!esAdmin && limiteHoras > 0) {
      const fechaSlot = new Date(slot.fecha + 'T' + slot.hora + ':00');
      const ahora = new Date();
      const horasRestantes = (fechaSlot - ahora) / (1000 * 60 * 60);

      if (horasRestantes < limiteHoras) {
        throw new Error(
          `No podés cancelar con menos de ${limiteHoras} horas de anticipación. ` +
          `Contactá al estudio para más información.`
        );
      }
    }

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
export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
                      'Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const HORAS = ['08:00','09:00','10:00','11:00','12:00','13:00',
                      '14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

export function lunesDe(fecha) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

export function formatoISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================================
// COMPONENTE: CAMAS DE UN SLOT (vista tabla / desktop)
// ============================================================
export function CamasDelSlot({ slot, uid, onReservar, onCancelar }) {
  const libres = slot.camas.filter(c => c.estado === 'libre').length;

  return (
    <div className="space-y-0.5 md:space-y-1">
      <div className="text-[8px] md:text-[9px] text-gray-500 leading-tight mb-0.5 md:mb-1 truncate">
        {slot.instructor} · {libres}/{slot.camas.length}
      </div>
      <div className="grid grid-cols-4 gap-0.5 md:gap-1">
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
              className={`w-5 h-5 md:w-6 md:h-6 rounded text-[8px] md:text-[9px] font-bold flex items-center justify-center transition ${
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
// COMPONENTE: SLOT EN LISTA (mobile)
// ============================================================
export function SlotEnLista({ slot, uid, onReservar, onCancelar }) {
  const libres = slot.camas.filter(c => c.estado === 'libre').length;
  const total = slot.camas.length;
  const porcentaje = Math.round(((total - libres) / total) * 100);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-800">
            {slot.hora}
          </span>
          <span className="text-xs text-gray-500">
            {slot.instructor} · {slot.tipo}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            libres === 0
              ? 'bg-red-100 text-red-700'
              : libres <= 2
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {libres}/{total} libres
        </span>
      </div>

      <div className="h-1 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full transition-all ${
            porcentaje === 100
              ? 'bg-red-500'
              : porcentaje >= 75
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {slot.camas.map(cama => {
          const esMia = uid && cama.uid === uid;
          const ocupada = cama.estado === 'ocupada';
          return (
            <button
              key={cama.numero}
              onClick={() => {
                if (esMia) {
                  if (confirm('¿Cancelar esta reserva?')) {
                    onCancelar(slot.id, cama.numero);
                  }
                } else if (!ocupada && uid) {
                  onReservar(slot.id, cama.numero);
                }
              }}
              disabled={(ocupada && !esMia) || (!uid && !esMia)}
              title={
                esMia
                  ? `Tu cama ${cama.numero} - clic para cancelar`
                  : ocupada
                  ? `Ocupada por ${cama.nombre || 'alguien'}`
                  : `Cama ${cama.numero} libre`
              }
              className={`h-9 rounded text-xs font-bold flex items-center justify-center transition ${
                esMia
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : ocupada
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-white border-2 border-gray-200 text-gray-500 hover:bg-purple-50 hover:border-purple-400 active:bg-purple-100'
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
// COMPONENTE: SELECTOR DE HORARIO (multi-selección, mobile)
// ============================================================
export function SelectorHorario({ iso, horasExistentes, onCrear, onCancelar }) {
  const [seleccionadas, setSeleccionadas] = useState([]);

  const toggle = (hora) => {
    if (horasExistentes.includes(hora)) return;
    setSeleccionadas(prev =>
      prev.includes(hora)
        ? prev.filter(h => h !== hora)
        : [...prev, hora].sort()
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600 font-medium">
        Elegí uno o más horarios:
      </p>
      <div className="grid grid-cols-4 gap-1">
        {HORAS.map(h => {
          const existe = horasExistentes.includes(h);
          const seleccionado = seleccionadas.includes(h);
          return (
            <button
              key={h}
              onClick={() => toggle(h)}
              disabled={existe}
              title={existe ? 'Ya existe un slot en este horario' : ''}
              className={`px-2 py-1 rounded text-xs border transition ${
                existe
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                  : seleccionado
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-purple-50 hover:border-purple-400 active:bg-purple-100'
              }`}
            >
              {h}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={onCancelar}
          className="text-xs text-gray-500 hover:underline"
        >
          Cancelar
        </button>
        <button
          onClick={() => onCrear(iso, seleccionadas)}
          disabled={seleccionadas.length === 0}
          className="px-3 py-1 rounded text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {seleccionadas.length === 0
            ? 'Elegí horarios'
            : `Crear ${seleccionadas.length} ${seleccionadas.length === 1 ? 'slot' : 'slots'}`}
        </button>
      </div>

      {seleccionadas.length > 0 && (
        <p className="text-[10px] text-gray-500">
          Seleccionados: {seleccionadas.join(', ')}
        </p>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTE: CALENDARIO EN LISTA (mobile)
// ============================================================
export function CalendarioLista({
  slots, uid, onReservar, onCancelar, semanaBase,
  esAdmin = false, onCrearSlots
}) {
  const lunes = lunesDe(semanaBase);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const hoy = formatoISO(new Date());

  const [diaSeleccionando, setDiaSeleccionando] = useState(null);

  const slotsPorDia = {};
  dias.forEach(d => { slotsPorDia[formatoISO(d)] = []; });
  slots.forEach(s => {
    if (slotsPorDia[s.fecha]) slotsPorDia[s.fecha].push(s);
  });

  return (
    <div className="space-y-4">
      {dias.map((dia, i) => {
        const iso = formatoISO(dia);
        const esHoy = iso === hoy;
        const slotsDelDia = slotsPorDia[iso] || [];
        const horasExistentes = slotsDelDia.map(s => s.hora);
        const fechaLarga = `${DIAS[i]} ${dia.getDate()} de ${MESES[dia.getMonth()]}`;
        const mostrandoSelector = diaSeleccionando === iso;

        return (
          <div
            key={iso}
            className={`bg-white rounded-lg border shadow-sm overflow-hidden ${
              esHoy ? 'ring-2 ring-purple-400' : ''
            }`}
          >
            <div
              className={`px-3 py-2 border-b font-semibold text-sm ${
                esHoy
                  ? 'bg-purple-50 text-purple-700'
                  : 'bg-gray-50 text-gray-700'
              }`}
            >
              {esHoy ? '🔥 Hoy · ' : ''}{fechaLarga}
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({slotsDelDia.length} {slotsDelDia.length === 1 ? 'clase' : 'clases'})
              </span>
            </div>

            {slotsDelDia.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-400 text-sm">
                {esAdmin ? (
                  mostrandoSelector ? (
                    <SelectorHorario
                      iso={iso}
                      horasExistentes={horasExistentes}
                      onCrear={(fecha, horas) => {
                        onCrearSlots(fecha, horas);
                        setDiaSeleccionando(null);
                      }}
                      onCancelar={() => setDiaSeleccionando(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setDiaSeleccionando(iso)}
                      className="text-purple-600 hover:underline"
                    >
                      + Agregar horarios
                    </button>
                  )
                ) : (
                  'Sin clases este día'
                )}
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {slotsDelDia.map(slot => (
                    <SlotEnLista
                      key={slot.id}
                      slot={slot}
                      uid={uid}
                      onReservar={onReservar}
                      onCancelar={onCancelar}
                    />
                  ))}
                </div>

                {esAdmin && (
                  <div className="px-3 py-2 border-t bg-gray-50 text-center">
                    {mostrandoSelector ? (
                      <SelectorHorario
                        iso={iso}
                        horasExistentes={horasExistentes}
                        onCrear={(fecha, horas) => {
                          onCrearSlots(fecha, horas);
                          setDiaSeleccionando(null);
                        }}
                        onCancelar={() => setDiaSeleccionando(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setDiaSeleccionando(iso)}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        + Agregar más horarios
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// COMPONENTE: CALENDARIO (wrapper con vista tabla + lista)
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

      <div className="flex items-center justify-between gap-2 px-3 py-2 md:px-4 md:py-3 border-b bg-gray-50">
        <button
          onClick={() => onCambiarSemana(-7)}
          className="px-2 py-1 md:px-3 md:py-1 rounded border bg-white hover:bg-gray-100 text-xs md:text-sm whitespace-nowrap"
        >
          ← <span className="hidden sm:inline">Semana anterior</span>
          <span className="sm:hidden">Ant</span>
        </button>

        <h2 className="font-semibold text-gray-700 text-xs md:text-base text-center flex-1 truncate">
          {titulo}
        </h2>

        <button
          onClick={() => onCambiarSemana(7)}
          className="px-2 py-1 md:px-3 md:py-1 rounded border bg-white hover:bg-gray-100 text-xs md:text-sm whitespace-nowrap"
        >
          <span className="hidden sm:inline">Semana siguiente</span>
          <span className="sm:hidden">Sig</span> →
        </button>
      </div>

      {/* VISTA DESKTOP */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse min-w-[750px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-10 md:w-16 border-b border-r bg-gray-50 p-1 md:p-2 text-xs text-gray-500">
                Hora
              </th>
              {dias.map((dia, i) => {
                const iso = formatoISO(dia);
                const esHoy = iso === hoy;
                return (
                  <th
                    key={iso}
                    className={`border-b border-r p-1 md:p-2 text-center ${
                      esHoy ? 'bg-purple-50' : 'bg-gray-50'
                    }`}
                  >
                    <div
                      className={`text-[10px] md:text-xs uppercase ${
                        esHoy ? 'text-purple-600 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {DIAS[i]}
                    </div>
                    <div
                      className={`text-sm md:text-lg font-bold ${
                        esHoy ? 'text-purple-700' : 'text-gray-800'
                      }`}
                    >
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
                <td className="sticky left-0 z-10 border-b border-r bg-gray-50 p-1 md:p-2 text-[10px] md:text-xs font-medium text-gray-600 text-center whitespace-nowrap">
                  {hora}
                </td>
                {dias.map(dia => {
                  const iso = formatoISO(dia);
                  const slot = slotMap[`${iso}|${hora}`];
                  return (
                    <td
                      key={`${iso}|${hora}`}
                      className="border-b border-r p-0.5 md:p-1 align-top"
                    >
                      {slot ? (
                        <CamasDelSlot
                          slot={slot}
                          uid={uid}
                          onReservar={onReservar}
                          onCancelar={onCancelar}
                        />
                      ) : esAdmin ? (
                        <button
                          onClick={() => onCrearSlot(iso, hora)}
                          className="w-full h-12 md:h-14 text-gray-300 hover:text-purple-500 hover:bg-purple-50 rounded text-[10px] md:text-xs transition"
                          title="Crear slot"
                        >
                          + crear
                        </button>
                      ) : (
                        <div className="h-12 md:h-14 text-center text-gray-200 text-xs pt-2 md:pt-3">
                          —
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VISTA MOBILE */}
      <div className="md:hidden p-3 bg-gray-50">
        <CalendarioLista
          slots={slots}
          uid={uid}
          onReservar={onReservar}
          onCancelar={onCancelar}
          semanaBase={semanaBase}
          esAdmin={esAdmin}
          onCrearSlots={onCrearSlot}
        />
      </div>

      {/* LEYENDA */}
      <div className="px-3 py-2 md:px-4 border-t bg-gray-50 flex flex-wrap gap-3 md:gap-4 text-[10px] md:text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded border border-gray-300 bg-white inline-block"></span>
          Libre
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded border border-green-400 bg-green-100 inline-block"></span>
          Tuya
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded border border-gray-400 bg-gray-300 inline-block"></span>
          Ocupada
        </span>
      </div>
    </div>
  );
}