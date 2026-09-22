// src/etiquetas.js

// ============================================================
// ETIQUETAS POR RUBRO
// Cada rubro define cómo se llaman las cosas en su negocio
// ============================================================
export const ETIQUETAS_POR_RUBRO = {
  pilates: {
    cliente: 'alumno',
    clientes: 'Alumnos',
    cita: 'clase',
    citas: 'Clases',
    recurso: 'cama',
    recursos: 'Camas',
    profesional: 'instructor',
    profesionales: 'Instructores'
  },
  yoga: {
    cliente: 'alumno',
    clientes: 'Alumnos',
    cita: 'clase',
    citas: 'Clases',
    recurso: 'mat',
    recursos: 'Mats',
    profesional: 'instructor',
    profesionales: 'Instructores'
  },
  clinica: {
    cliente: 'paciente',
    clientes: 'Pacientes',
    cita: 'turno',
    citas: 'Turnos',
    recurso: 'consultorio',
    recursos: 'Consultorios',
    profesional: 'doctor',
    profesionales: 'Doctores'
  },
  barberia: {
    cliente: 'cliente',
    clientes: 'Clientes',
    cita: 'turno',
    citas: 'Turnos',
    recurso: 'silla',
    recursos: 'Sillas',
    profesional: 'barbero',
    profesionales: 'Barberos'
  },
  restaurante: {
    cliente: 'comensal',
    clientes: 'Comensales',
    cita: 'reserva',
    citas: 'Reservas',
    recurso: 'mesa',
    recursos: 'Mesas',
    profesional: 'mozo',
    profesionales: 'Mozos'
  },
  generico: {
    cliente: 'cliente',
    clientes: 'Clientes',
    cita: 'turno',
    citas: 'Turnos',
    recurso: 'lugar',
    recursos: 'Lugares',
    profesional: 'profesional',
    profesionales: 'Profesionales'
  }
};

export const ETIQUETAS_DEFAULT = ETIQUETAS_POR_RUBRO.pilates;

// ============================================================
// Obtener etiquetas de un estudio
// Prioridad: etiquetas custom > etiquetas por rubro > default
// ============================================================
export function getEtiquetas(estudio) {
  if (!estudio) return ETIQUETAS_DEFAULT;
  if (estudio.etiquetas) {
    return { ...ETIQUETAS_DEFAULT, ...estudio.etiquetas };
  }
  if (estudio.rubro && ETIQUETAS_POR_RUBRO[estudio.rubro]) {
    return ETIQUETAS_POR_RUBRO[estudio.rubro];
  }
  return ETIQUETAS_DEFAULT;
}

// ============================================================
// Lista de rubros disponibles
// ============================================================
export const RUBROS_DISPONIBLES = [
  { value: 'pilates',    label: '🧘 Pilates / Yoga' },
  { value: 'clinica',    label: '🏥 Clínica / Consultorio' },
  { value: 'barberia',   label: '💈 Barbería / Peluquería' },
  { value: 'restaurante',label: '🍽️ Restaurante' },
  { value: 'generico',   label: '🏢 Otro' }
];