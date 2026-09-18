// src/estudios.js
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, serverTimestamp, writeBatch,
  arrayUnion, arrayRemove,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase/config';
import { generarSlugUnico } from './utils/slug';

const estudiosCol = collection(db, 'estudios');

// ============================================================
// HELPERS INTERNOS
// ============================================================
const estudioRef  = (id) => doc(db, 'estudios', id);
const miembroRef  = (id, uid) => doc(db, 'estudios', id, 'miembros', uid);
const usuarioRef  = (uid) => doc(db, 'usuarios', uid);
const slugRef     = (slug) => doc(db, 'slugs', slug);

// ============================================================
// HELPERS: Detectar errores de slug duplicado
// ============================================================
function esErrorSlugDuplicado(err) {
  return (
    err?.code === 'already-exists' ||
    err?.code === 6 || // código gRPC de ALREADY_EXISTS
    err?.message?.toLowerCase().includes('already exists')
  );
}

// ============================================================
// CREAR ESTUDIO SIN ADMIN (con reintentos por concurrencia)
// ============================================================
export async function crearEstudioSinAdmin({ nombre, creadoPor, registroAbierto = false }) {
  if (!nombre?.trim()) throw new Error('El nombre es obligatorio');

  const configDefault = {
    tiposClase: ['Reformer', 'Mat', 'Cadillac', 'Chair'],
    horas: ['08:00','09:00','10:00','11:00','12:00','13:00',
            '14:00','15:00','16:00','17:00','18:00','19:00','20:00']
  };

  const trialHasta = Timestamp.fromDate(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  );

  const MAX_INTENTOS = 5;
  let ultimoError = null;

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const slug = await generarSlugUnico(nombre);
    const nuevoRef = doc(estudiosCol);
    const estudioId = nuevoRef.id;

    const batch = writeBatch(db);

    batch.set(nuevoRef, {
      nombre: nombre.trim(),
      slug,
      activo: true,
      plan: 'trial',
      planVencimiento: trialHasta,
      registroAbierto,
      branding: {
        logoUrl: null,
        colorPrimario: '#9333ea',
        colorSecundario: '#c084fc'
      },
      config: configDefault,
      creadoPor: creadoPor || null,
      creadoEn: serverTimestamp()
    });

    batch.set(slugRef(slug), { estudioId });

    try {
      await batch.commit();
      return { estudioId, slug };
    } catch (err) {
      if (esErrorSlugDuplicado(err)) {
        // Otro usuario tomó el slug entre la verificación y la escritura.
        // Reintentamos con un slug nuevo.
        ultimoError = err;
        continue;
      }
      // Otro tipo de error: no reintentamos
      throw err;
    }
  }

  console.error('No se pudo crear el estudio tras varios intentos:', ultimoError);
  throw new Error(
    'El nombre del estudio es muy común y ya está en uso. Probá con otro.'
  );
}

// ============================================================
// CREAR ESTUDIO CON ADMIN (legacy, con reintentos)
// ============================================================
export async function crearEstudio({
  nombre, adminUid, adminEmail, adminNombre, registroAbierto = false
}) {
  if (!nombre?.trim()) throw new Error('El nombre es obligatorio');
  if (!adminUid) throw new Error('Falta el admin');

  const configDefault = {
    tiposClase: ['Reformer', 'Mat', 'Cadillac', 'Chair'],
    horas: ['08:00','09:00','10:00','11:00','12:00','13:00',
            '14:00','15:00','16:00','17:00','18:00','19:00','20:00']
  };

  const trialHasta = Timestamp.fromDate(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  );

  const MAX_INTENTOS = 5;
  let ultimoError = null;

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const slug = await generarSlugUnico(nombre);
    const nuevoRef = doc(estudiosCol);
    const estudioId = nuevoRef.id;

    const batch = writeBatch(db);

    batch.set(nuevoRef, {
      nombre: nombre.trim(),
      slug,
      activo: true,
      plan: 'trial',
      planVencimiento: trialHasta,
      registroAbierto,
      branding: {
        logoUrl: null,
        colorPrimario: '#9333ea',
        colorSecundario: '#c084fc'
      },
      config: configDefault,
      creadoPor: adminUid,
      creadoEn: serverTimestamp()
    });

    batch.set(slugRef(slug), { estudioId });

    batch.set(miembroRef(estudioId, adminUid), {
      uid: adminUid,
      nombre: adminNombre || 'Admin',
      email: adminEmail,
      telefono: '',
      rol: 'admin',
      clasesRestantes: 0,
      planActivo: null,
      vencimiento: null,
      activo: true,
      unidoEn: serverTimestamp()
    });

    batch.set(usuarioRef(adminUid), {
      nombre: adminNombre || 'Admin',
      email: adminEmail,
      estudios: arrayUnion(estudioId),
      creadoEn: serverTimestamp()
    }, { merge: true });

    try {
      await batch.commit();
      return { estudioId, slug };
    } catch (err) {
      if (esErrorSlugDuplicado(err)) {
        ultimoError = err;
        continue;
      }
      throw err;
    }
  }

  console.error('No se pudo crear el estudio tras varios intentos:', ultimoError);
  throw new Error(
    'El nombre del estudio es muy común y ya está en uso. Probá con otro.'
  );
}

// ============================================================
// OBTENER ESTUDIO
// ============================================================
export async function obtenerEstudioPorSlug(slug) {
  if (!slug) return null;
  const slugSnap = await getDoc(slugRef(slug));
  if (!slugSnap.exists()) return null;
  const { estudioId } = slugSnap.data();
  return obtenerEstudioPorId(estudioId);
}

export async function obtenerEstudioPorId(estudioId) {
  if (!estudioId) return null;
  const snap = await getDoc(estudioRef(estudioId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ============================================================
// MIEMBROS
// ============================================================
export async function obtenerMiembro(estudioId, uid) {
  if (!estudioId || !uid) return null;
  const snap = await getDoc(miembroRef(estudioId, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function listarMiembros(estudioId, { rol = null } = {}) {
  const ref = collection(db, 'estudios', estudioId, 'miembros');
  const q = rol
    ? query(ref, where('rol', '==', rol), orderBy('nombre'))
    : query(ref, orderBy('nombre'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================================================
// UNIR USUARIO A ESTUDIO (Versión para usar DENTRO de una transacción)
// ============================================================
export async function unirUsuarioAEstudioTx(tx, estudioId, uid, {
  nombre, email, telefono = '', rol = 'alumno', clasesIniciales = 0
}) {
  if (!['admin', 'instructor', 'alumno'].includes(rol)) {
    throw new Error('Rol inválido');
  }

  const mRef = miembroRef(estudioId, uid);
  const uRef = usuarioRef(uid);

  const [mSnap, uSnap] = await Promise.all([
    tx.get(mRef),
    tx.get(uRef)
  ]);

  if (mSnap.exists()) {
    return { id: mSnap.id, ...mSnap.data() };
  }

  const nuevoMiembro = {
    uid, nombre, email,
    telefono: telefono || '',
    rol,
    clasesRestantes: Number(clasesIniciales) || 0,
    planActivo: null,
    vencimiento: null,
    activo: true,
    unidoEn: serverTimestamp()
  };

  tx.set(mRef, nuevoMiembro);

  const usuarioData = {
    nombre, email,
    estudios: arrayUnion(estudioId),
    creadoEn: uSnap.exists()
      ? (uSnap.data().creadoEn || serverTimestamp())
      : serverTimestamp()
  };
  tx.set(uRef, usuarioData, { merge: true });

  return { id: uid, ...nuevoMiembro };
}

// ============================================================
// UNIR USUARIO A ESTUDIO (Versión original, ahora usa transacción)
// ============================================================
export async function unirUsuarioAEstudio(estudioId, uid, datos) {
  return runTransaction(db, async (tx) => {
    return unirUsuarioAEstudioTx(tx, estudioId, uid, datos);
  });
}

// ============================================================
// CAMBIAR ROL / ACTUALIZAR MIEMBRO
// ============================================================
export async function cambiarRolMiembro(estudioId, uid, nuevoRol) {
  if (!['admin', 'instructor', 'alumno'].includes(nuevoRol)) {
    throw new Error('Rol inválido');
  }
  await updateDoc(miembroRef(estudioId, uid), { rol: nuevoRol });
}

export async function actualizarMiembro(estudioId, uid, cambios) {
  await updateDoc(miembroRef(estudioId, uid), cambios);
}

export async function eliminarMiembro(estudioId, uid) {
  const batch = writeBatch(db);
  batch.delete(miembroRef(estudioId, uid));
  batch.set(usuarioRef(uid), {
    estudios: arrayRemove(estudioId)
  }, { merge: true });
  await batch.commit();
}
// ============================================================
// SUMAR CLASES (atómico, con transacción)
// ============================================================
export async function sumarClasesMiembro(estudioId, uid, cantidad) {
  if (typeof cantidad !== 'number' || cantidad === 0) {
    throw new Error('La cantidad debe ser un número distinto de 0');
  }

  return runTransaction(db, async (tx) => {
    const ref = miembroRef(estudioId, uid);
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error('Miembro no encontrado');
    }

    const actuales = snap.data().clasesRestantes || 0;
    const nuevo = actuales + cantidad;

    if (nuevo < 0) {
      throw new Error('No se puede tener clases negativas');
    }

    tx.update(ref, { clasesRestantes: nuevo });

    return { clasesRestantes: nuevo, delta: cantidad };
  });
}
// ============================================================
// USUARIO GLOBAL (índice)
// ============================================================
export async function obtenerUsuarioGlobal(uid) {
  if (!uid) return null;
  const snap = await getDoc(usuarioRef(uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function upsertUsuarioGlobal(uid, { nombre, email }) {
  await setDoc(usuarioRef(uid), {
    nombre, email,
    creadoEn: serverTimestamp()
  }, { merge: true });
}

export async function agregarEstudioAUsuario(uid, estudioId, { nombre, email } = {}) {
  const data = { estudios: arrayUnion(estudioId) };
  if (nombre) data.nombre = nombre;
  if (email) data.email = email;
  data.creadoEn = serverTimestamp();

  await setDoc(usuarioRef(uid), data, { merge: true });
}

export async function quitarEstudioDeUsuario(uid, estudioId) {
  await setDoc(usuarioRef(uid), {
    estudios: arrayRemove(estudioId)
  }, { merge: true });
}

export async function listarEstudiosDeUsuario(uid) {
  const u = await obtenerUsuarioGlobal(uid);
  if (!u?.estudios?.length) return [];
  const estudios = await Promise.all(
    u.estudios.map(id => obtenerEstudioPorId(id))
  );
  return estudios.filter(Boolean);
}

// ============================================================
// ACTUALIZAR ESTUDIO
// ============================================================
export async function actualizarEstudio(estudioId, cambios) {
  await updateDoc(estudioRef(estudioId), cambios);
}

export async function actualizarBranding(estudioId, branding) {
  await updateDoc(estudioRef(estudioId), { branding });
}

export async function actualizarRegistroAbierto(estudioId, registroAbierto) {
  await updateDoc(estudioRef(estudioId), { registroAbierto: !!registroAbierto });
}

export async function cambiarPlanEstudio(estudioId, nuevoPlan, meses = 1) {
  const vencimiento = Timestamp.fromDate(
    new Date(Date.now() + meses * 30 * 24 * 60 * 60 * 1000)
  );
  await updateDoc(estudioRef(estudioId), {
    plan: nuevoPlan,
    planVencimiento: vencimiento
  });
}
// ============================================================
// ACTUALIZAR NOMBRE Y BRANDING
// ============================================================
export async function actualizarInfoEstudio(estudioId, { nombre, branding }) {
  const cambios = {};
  if (nombre !== undefined) cambios.nombre = nombre.trim();
  if (branding !== undefined) cambios.branding = branding;
  await updateDoc(estudioRef(estudioId), cambios);
}

export function planVigente(estudio) {
  if (!estudio) return false;
  if (!estudio.planVencimiento) return false;
  const fecha = estudio.planVencimiento.toDate
    ? estudio.planVencimiento.toDate()
    : new Date(estudio.planVencimiento);
  return fecha > new Date();
}

// ============================================================
// LISTAR TODOS
// ============================================================
export async function listarTodosLosEstudios() {
  const snap = await getDocs(query(estudiosCol, orderBy('creadoEn', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================================================
// CONFIG
// ============================================================
export async function actualizarConfigEstudio(estudioId, config) {
  await updateDoc(estudioRef(estudioId), { config });
}