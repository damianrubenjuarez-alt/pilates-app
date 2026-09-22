// src/recordatoriosApi.js
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase/config';

// ============================================================
// HELPERS DE FECHA
// ============================================================
export function formatoISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function formatoFechaLinda(isoString) {
  const [y, m, d] = isoString.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return `${DIAS_LARGOS[fecha.getDay()]} ${d} de ${MESES_LARGOS[m - 1]}`;
}

// ============================================================
// OBTENER RESERVAS DE UN DÍA
// ============================================================
export async function obtenerReservasDelDia(estudioId, fechaISO) {
  const slotsRef = collection(db, 'estudios', estudioId, 'slots');
  const q = query(
    slotsRef,
    where('fecha', '==', fechaISO),
    orderBy('hora')
  );
  const snap = await getDocs(q);

  const reservas = [];
  snap.docs.forEach(docSnap => {
    const slot = { id: docSnap.id, ...docSnap.data() };
    slot.camas.forEach(cama => {
      if (cama.estado === 'ocupada' && cama.uid) {
        reservas.push({
          slotId: slot.id,
          fecha: slot.fecha,
          hora: slot.hora,
          instructor: slot.instructor,
          tipo: slot.tipo,
          cama: cama.numero,
          uid: cama.uid,
          nombre: cama.nombre
        });
      }
    });
  });

  return reservas;
}

// ============================================================
// OBTENER INFO DE LOS ALUMNOS
// ============================================================
export async function obtenerInfoAlumnos(estudioId, uids) {
  if (!uids.length) return {};

  const miembrosRef = collection(db, 'estudios', estudioId, 'miembros');
  const snap = await getDocs(miembrosRef);

  const mapa = {};
  snap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (uids.includes(docSnap.id)) {
      mapa[docSnap.id] = {
        email: data.email,
        nombre: data.nombre,
        telefono: data.telefono
      };
    }
  });

  return mapa;
}

// ============================================================
// ENVIAR UN RECORDATORIO (VÍA CLOUD FUNCTION → RESEND)
// ============================================================
export async function enviarRecordatorio({
  email, nombre, estudioNombre, fecha, hora, instructor, tipo, cama
}) {
  try {
    const enviar = httpsCallable(functions, 'enviarRecordatorioManual');
    const result = await enviar({
      email,
      nombre,
      estudioNombre,
      fecha: formatoFechaLinda(fecha),
      hora,
      instructor,
      tipo,
      cama
    });
    return result.data;
  } catch (err) {
    console.error('Error enviando recordatorio:', err);
    throw new Error('No se pudo enviar el email: ' + err.message);
  }
}

// ============================================================
// ENVIAR TODOS LOS RECORDATORIOS DE UN DÍA
// ============================================================
export async function enviarRecordatoriosDelDia(estudio, fechaISO, onProgreso) {
  const reservas = await obtenerReservasDelDia(estudio.id, fechaISO);

  if (reservas.length === 0) {
    return { enviados: 0, errores: 0, total: 0, detalleErrores: [] };
  }

  const uids = [...new Set(reservas.map(r => r.uid))];
  const infoAlumnos = await obtenerInfoAlumnos(estudio.id, uids);

  let enviados = 0;
  let errores = 0;
  const detalleErrores = [];

  for (let i = 0; i < reservas.length; i++) {
    const r = reservas[i];
    const alumno = infoAlumnos[r.uid];

    if (!alumno?.email) {
      errores++;
      detalleErrores.push(`${r.nombre || r.uid}: sin email registrado`);
      continue;
    }

    try {
      await enviarRecordatorio({
        email: alumno.email,
        nombre: alumno.nombre || r.nombre || 'Alumno',
        estudioNombre: estudio.nombre,
        fecha: r.fecha,
        hora: r.hora,
        instructor: r.instructor,
        tipo: r.tipo,
        cama: r.cama
      });
      enviados++;
    } catch (e) {
      errores++;
      detalleErrores.push(`${alumno.email}: ${e.message}`);
      console.error('Error enviando a', alumno.email, e);
    }

    if (onProgreso) {
      onProgreso({ actual: i + 1, total: reservas.length, enviados, errores });
    }

    // Pausa entre envíos
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return {
    enviados,
    errores,
    total: reservas.length,
    detalleErrores
  };
}