// src/invitaciones.js
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  runTransaction, Timestamp, serverTimestamp
} from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db } from './firebase/config';
import { unirUsuarioAEstudioTx } from './estudios';

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// ============================================================
// CREAR INVITACIÓN
// ============================================================
export async function crearInvitacion(estudioId, {
  email, nombre, telefono = '', clasesIniciales = 0, rol = 'alumno', creadaPor
}) {
  if (!email?.trim()) throw new Error('El email es obligatorio');
  if (!estudioId) throw new Error('Falta el estudio');
  if (!['admin', 'instructor', 'alumno'].includes(rol)) {
    throw new Error('Rol inválido');
  }

  const emailNorm = email.trim().toLowerCase();
  const token = crypto.randomUUID();

  const expiraEn = Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const ref = doc(collection(db, 'estudios', estudioId, 'invitaciones'), token);

  await setDoc(ref, {
    token,
    email: emailNorm,
    nombre: nombre?.trim() || emailNorm.split('@')[0],
    telefono: telefono?.trim() || '',
    clasesIniciales: Number(clasesIniciales) || 0,
    rol,
    estado: 'pendiente',
    creadaPor: creadaPor || null,
    creadaEn: serverTimestamp(),
    expiraEn,
    aceptadaEn: null
  });

  return { token, email: emailNorm };
}

// ============================================================
// ENVIAR EMAIL
// ============================================================
export async function enviarEmailInvitacion({
  token, email, nombre, estudioNombre, estudioSlug, adminNombre
}) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    throw new Error('Faltan las credenciales de EmailJS. Revisá tu .env.local');
  }

  const appUrl = window.location.origin;
  const link = `${appUrl}/${estudioSlug}/invitacion/${token}`;

  const templateParams = {
    to_email: email,
    to_name: nombre || email.split('@')[0],
    estudio_nombre: estudioNombre,
    admin_nombre: adminNombre || 'El equipo',
    link
  };

  return emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    templateParams,
    EMAILJS_PUBLIC_KEY
  );
}

// ============================================================
// INVITAR ALUMNO
// ============================================================
export async function invitarAlumno(estudio, {
  email, nombre, telefono = '', clasesIniciales, creadaPor, adminNombre
}) {
  const { token } = await crearInvitacion(estudio.id, {
    email, nombre, telefono, clasesIniciales, creadaPor, rol: 'alumno'
  });

  await enviarEmailInvitacion({
    token,
    email,
    nombre,
    estudioNombre: estudio.nombre,
    estudioSlug: estudio.slug,
    adminNombre
  });

  return { token };
}

// ============================================================
// INVITAR ADMIN
// ============================================================
export async function invitarAdmin(estudio, {
  email, nombre, creadaPor, adminNombre
}) {
  if (!email?.trim()) throw new Error('El email del admin es obligatorio');

  const { token } = await crearInvitacion(estudio.id, {
    email,
    nombre,
    telefono: '',
    clasesIniciales: 0,
    rol: 'admin',
    creadaPor
  });

  await enviarEmailInvitacion({
    token,
    email,
    nombre,
    estudioNombre: estudio.nombre,
    estudioSlug: estudio.slug,
    adminNombre
  });

  return { token };
}

// ============================================================
// OBTENER INVITACIÓN
// ============================================================
export async function obtenerInvitacion(estudioId, token) {
  if (!estudioId || !token) return null;
  const snap = await getDoc(
    doc(db, 'estudios', estudioId, 'invitaciones', token)
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ============================================================
// LISTAR INVITACIONES
// ============================================================
export async function listarInvitaciones(estudioId) {
  if (!estudioId) return [];
  const ref = collection(db, 'estudios', estudioId, 'invitaciones');
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================================================
// ACEPTAR INVITACIÓN (VERSIÓN CORREGIDA Y ATÓMICA)
// ============================================================
export async function aceptarInvitacion(estudioId, token, uid, email, datosExtra = {}) {
  return runTransaction(db, async (tx) => {
    // 1. Leer la invitación
    const invRef = doc(db, 'estudios', estudioId, 'invitaciones', token);
    const invSnap = await tx.get(invRef);

    if (!invSnap.exists()) throw new Error('Invitación no encontrada');

    const data = invSnap.data();

    // 2. Validaciones
    if (data.estado !== 'pendiente') {
      throw new Error('Esta invitación ya fue usada');
    }

    if (data.email !== email.toLowerCase()) {
      throw new Error('El email no coincide con la invitación');
    }

    const expira = data.expiraEn?.toDate?.() || new Date(data.expiraEn);
    if (expira < new Date()) throw new Error('Esta invitación expiró');

    // 3. Unir al usuario al estudio (dentro de la misma transacción)
    await unirUsuarioAEstudioTx(tx, estudioId, uid, {
      nombre: datosExtra.nombre || data.nombre,
      email: data.email,
      telefono: datosExtra.telefono || data.telefono || '',
      rol: data.rol,
      clasesIniciales: data.clasesIniciales || 0
    });

    // 4. Marcar la invitación como aceptada
    tx.update(invRef, {
      estado: 'aceptada',
      aceptadaEn: serverTimestamp(),
      aceptadaPor: uid
    });

    return true;
  });
}
// ============================================================
// CREAR INVITACIÓN SIN ENVIAR EMAIL
// ============================================================
export async function crearInvitacionSinEmail(estudioId, {
  email, nombre, telefono = '', clasesIniciales = 0, rol = 'alumno', creadaPor
}) {
  const { token } = await crearInvitacion(estudioId, {
    email, nombre, telefono, clasesIniciales, rol, creadaPor
  });
  return { token };
  
}
// ============================================================
// OBTENER INVITACIÓN DE ADMIN PENDIENTE
// ============================================================
export async function obtenerInvitacionAdminPendiente(estudioId) {
  if (!estudioId) return null;
  const ref = collection(db, 'estudios', estudioId, 'invitaciones');
  const snap = await getDocs(ref);
  
  const invitaciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Buscar la primera invitación de admin que esté pendiente y no expirada
  const ahora = new Date();
  return invitaciones.find(inv => {
    if (inv.rol !== 'admin') return false;
    if (inv.estado !== 'pendiente') return false;
    const exp = inv.expiraEn?.toDate?.() || new Date(inv.expiraEn);
    return exp > ahora;
  }) || null;
}