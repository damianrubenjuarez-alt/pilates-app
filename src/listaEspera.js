// src/listaEspera.js
import {
  collection, doc, addDoc, getDocs, deleteDoc, updateDoc,
  query, where, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase/config';

const listaCol = (estudioId, slotId) =>
  collection(db, 'estudios', estudioId, 'slots', slotId, 'listaEspera');

/**
 * Anotarse en la lista de espera de un slot
 */
export async function anotarseEnLista(estudioId, slotId, {
  uid, nombre, email, telefono
}) {
  if (!uid || !nombre) throw new Error('Faltan datos del alumno');

  const q = query(listaCol(estudioId, slotId), where('uid', '==', uid));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error('Ya estás anotado en la lista de espera de esta clase');
  }

  await addDoc(listaCol(estudioId, slotId), {
    uid,
    nombre,
    email: email || '',
    telefono: telefono || '',
    anotadoEn: serverTimestamp(),
    notificado: false,
    aceptado: null
  });
}

/**
 * Salir de la lista de espera
 */
export async function salirDeLista(estudioId, slotId, uid) {
  const q = query(listaCol(estudioId, slotId), where('uid', '==', uid));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
}

/**
 * Obtener la lista de espera de un slot (ordenada FIFO)
 */
export async function obtenerLista(estudioId, slotId) {
  const q = query(listaCol(estudioId, slotId), orderBy('anotadoEn', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Ver si un usuario específico está en la lista
 */
export async function estoyEnLista(estudioId, slotId, uid) {
  const q = query(listaCol(estudioId, slotId), where('uid', '==', uid));
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Contar cuántos hay en lista de espera
 */
export async function contarEnLista(estudioId, slotId) {
  const snap = await getDocs(listaCol(estudioId, slotId));
  return snap.size;
}

/**
 * Cuando se libera una cama, notificar al primero de la lista
 * (llama a la Cloud Function)
 */
export async function notificarListaEspera(estudioId, slotId) {
  try {
    const notificar = httpsCallable(functions, 'notificarListaEspera');
    const result = await notificar({ estudioId, slotId });
    return result.data;
  } catch (err) {
    console.error('Error notificando lista de espera:', err);
    return { notificado: false, error: err.message };
  }
}