// src/caja.js
import {
  collection, addDoc, getDocs, query, where, orderBy,
  serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './firebase/config';

const movimientosCol = (estudioId) =>
  collection(db, 'estudios', estudioId, 'movimientos');

/**
 * Registrar un movimiento (ingreso o egreso)
 */
export async function registrarMovimiento(estudioId, {
  tipo, monto, metodo, concepto, categoria,
  alumnoUid, alumnoNombre, creadoPor, notas, fechaManual
}) {
  if (!tipo || !monto || monto <= 0) {
    throw new Error('Tipo y monto son obligatorios');
  }

  const ahora = fechaManual ? new Date(fechaManual) : new Date();
  const fechaISO = ahora.toISOString().slice(0, 10);

  const ref = await addDoc(movimientosCol(estudioId), {
    tipo,
    monto: Number(monto),
    metodo: metodo || 'efectivo',
    concepto: concepto?.trim() || '',
    categoria: categoria || 'otro',
    alumnoUid: alumnoUid || null,
    alumnoNombre: alumnoNombre || null,
    creadoPor: creadoPor || null,
    notas: notas?.trim() || '',
    fecha: Timestamp.fromDate(ahora),
    fechaISO
  });

  return { id: ref.id };
}

/**
 * Lista movimientos de un rango de fechas
 */
export async function listarMovimientos(estudioId, { desde, hasta } = {}) {
  let q = query(movimientosCol(estudioId), orderBy('fecha', 'desc'));
  
  if (desde && hasta) {
    q = query(
      movimientosCol(estudioId),
      where('fechaISO', '>=', desde),
      where('fechaISO', '<=', hasta),
      orderBy('fechaISO', 'desc')
    );
  } else if (desde) {
    q = query(
      movimientosCol(estudioId),
      where('fechaISO', '>=', desde),
      orderBy('fechaISO', 'desc')
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Resumen del día
 */
export async function resumenDelDia(estudioId, fechaISO) {
  const q = query(
    movimientosCol(estudioId),
    where('fechaISO', '==', fechaISO)
  );
  const snap = await getDocs(q);
  const movs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const ingresos = movs.filter(m => m.tipo === 'ingreso');
  const egresos = movs.filter(m => m.tipo === 'egreso');

  const totalIngresos = ingresos.reduce((s, m) => s + m.monto, 0);
  const totalEgresos = egresos.reduce((s, m) => s + m.monto, 0);

  const porMetodo = {};
  ingresos.forEach(m => {
    porMetodo[m.metodo] = (porMetodo[m.metodo] || 0) + m.monto;
  });

  const porCategoria = {};
  movs.forEach(m => {
    if (!porCategoria[m.categoria]) {
      porCategoria[m.categoria] = { ingresos: 0, egresos: 0 };
    }
    porCategoria[m.categoria][m.tipo === 'ingreso' ? 'ingresos' : 'egresos'] += m.monto;
  });

  return {
    totalIngresos,
    totalEgresos,
    balance: totalIngresos - totalEgresos,
    cantidadIngresos: ingresos.length,
    cantidadEgresos: egresos.length,
    porMetodo,
    porCategoria,
    movimientos: movs
  };
}

/**
 * Resumen por rango de fechas
 */
export async function resumenPorRango(estudioId, desde, hasta) {
  const movs = await listarMovimientos(estudioId, { desde, hasta });
  
  const ingresos = movs.filter(m => m.tipo === 'ingreso');
  const egresos = movs.filter(m => m.tipo === 'egreso');

  return {
    totalIngresos: ingresos.reduce((s, m) => s + m.monto, 0),
    totalEgresos: egresos.reduce((s, m) => s + m.monto, 0),
    cantidadMovimientos: movs.length,
    movimientos: movs
  };
}