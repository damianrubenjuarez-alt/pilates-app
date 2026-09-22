// src/agenteConfig.js
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/config';

// ============================================================
// CONFIGURACIÓN POR DEFECTO DEL AGENTE
// ============================================================
export const CONFIG_AGENTE_DEFAULT = {
  activo: false,
  nombre: 'Asistente',
  tono: 'cercano',
  emoji: true,
  fraseBienvenida: '¡Hola! ¿En qué puedo ayudarte?',
  instruccionesExtra: '',
  servicios: [],
  horarios: {
    lunes: '09:00-18:00',
    martes: '09:00-18:00',
    miercoles: '09:00-18:00',
    jueves: '09:00-18:00',
    viernes: '09:00-18:00',
    sabado: 'cerrado',
    domingo: 'cerrado'
  },
  faq: [],
  quickReplies: [],
  // Prompt avanzado
  usarPromptPersonalizado: false,
  promptPersonalizado: ''
};

// ============================================================
// OBTENER CONFIG DEL AGENTE
// ============================================================
export async function obtenerConfigAgente(estudioId) {
  if (!estudioId) return CONFIG_AGENTE_DEFAULT;
  const ref = doc(db, 'estudios', estudioId, 'config', 'agente');
  const snap = await getDoc(ref);
  if (!snap.exists()) return CONFIG_AGENTE_DEFAULT;
  return { ...CONFIG_AGENTE_DEFAULT, ...snap.data() };
}

// ============================================================
// GUARDAR CONFIG DEL AGENTE
// ============================================================
export async function guardarConfigAgente(estudioId, config) {
  if (!estudioId) throw new Error('Falta el estudio');
  const ref = doc(db, 'estudios', estudioId, 'config', 'agente');
  await setDoc(ref, {
    ...config,
    actualizadoEn: serverTimestamp()
  }, { merge: true });
  return true;
}

// ============================================================
// TONOS DISPONIBLES
// ============================================================
export const TONOS_DISPONIBLES = [
  { value: 'cercano', label: '😊 Cercano y cálido' },
  { value: 'profesional', label: '💼 Profesional y formal' },
  { value: 'casual', label: '😎 Casual y relajado' },
  { value: 'motivador', label: '💪 Motivador y enérgico' }
];

// ============================================================
// VARIABLES DISPONIBLES EN EL PROMPT PERSONALIZADO
// ============================================================
export const VARIABLES_PROMPT = [
  { var: '{nombre}', desc: 'Nombre del agente (ej: Sofi)' },
  { var: '{estudio}', desc: 'Nombre del estudio (ej: Pilates Palermo)' },
  { var: '{rubro}', desc: 'Rubro del estudio (ej: pilates)' },
  { var: '{clientes}', desc: 'Etiqueta de clientes (ej: alumnos)' },
  { var: '{citas}', desc: 'Etiqueta de reservas (ej: clases)' },
  { var: '{recursos}', desc: 'Etiqueta de recursos (ej: camas)' },
  { var: '{profesionales}', desc: 'Etiqueta de profesionales (ej: instructores)' }
];