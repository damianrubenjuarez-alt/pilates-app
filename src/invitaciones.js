// src/invitaciones.js
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  Timestamp, serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase/config';

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
// ENVIAR EMAIL VÍA CLOUD FUNCTION (RESEND)
// ============================================================
export async function enviarEmailInvitacion({
  token, email, nombre, estudioNombre, estudioSlug, adminNombre
}) {
  try {
    const enviar = httpsCallable(functions, 'enviarInvitacion');
    const result = await enviar({
      token,
      email,
      nombre,
      estudioNombre,
      estudioSlug,
      adminNombre
    });
    return result.data;
  } catch (err) {
    console.error('Error enviando invitación:', err);
    throw new Error('No se pudo enviar el email: ' + err.message);
  }
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
// ACEPTAR INVITACIÓN
// ============================================================
export async function aceptarInvitacion(estudioId, token, uid, email, datosExtra = {}) {
  const invRef = doc(db, 'estudios', estudioId, 'invitaciones', token);
  const invSnap = await getDoc(invRef);

  if (!invSnap.exists()) throw new Error('Invitación no encontrada');

  const data = invSnap.data();

  if (data.estado === 'aceptada') {
    throw new Error('Esta invitación ya fue usada');
  }

  if (data.email !== email.toLowerCase()) {
    throw new Error('El email no coincide con la invitación');
  }

  const expira = data.expiraEn?.toDate?.() || new Date(data.expiraEn);
  if (expira < new Date()) throw new Error('Esta invitación expiró');

  const { unirUsuarioAEstudio } = await import('./estudios');
  await unirUsuarioAEstudio(estudioId, uid, {
    nombre: datosExtra.nombre || data.nombre,
    email: data.email,
    telefono: datosExtra.telefono || data.telefono || '',
    rol: data.rol,
    clasesIniciales: data.clasesIniciales || 0
  });

  await updateDoc(invRef, {
    estado: 'aceptada',
    aceptadaEn: serverTimestamp(),
    aceptadaPor: uid
  });

  return true;
}

// ============================================================
// OBTENER INVITACIÓN DE ADMIN PENDIENTE
// ============================================================
export async function obtenerInvitacionAdminPendiente(estudioId) {
  if (!estudioId) return null;
  const ref = collection(db, 'estudios', estudioId, 'invitaciones');
  const snap = await getDocs(ref);

  const invitaciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const ahora = new Date();
  return invitaciones.find(inv => {
    if (inv.rol !== 'admin') return false;
    if (inv.estado !== 'pendiente') return false;
    const exp = inv.expiraEn?.toDate?.() || new Date(inv.expiraEn);
    return exp > ahora;
  }) || null;
}