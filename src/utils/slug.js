// src/utils/slug.js
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Convierte "Pilates Palermo Ñuñoa" → "pilates-palermo-nunoa"
 * Se usa para generar la URL del estudio.
 */
export function generarSlug(texto) {
  return texto
    .toString()
    .toLowerCase()
    .normalize('NFD')                    // descompone acentos (á → a + ´)
    .replace(/[\u0300-\u036f]/g, '')     // elimina los acentos sueltos
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')        // solo letras, números, espacios, guiones
    .trim()
    .replace(/\s+/g, '-')                // espacios → guiones
    .replace(/-+/g, '-')                 // varios guiones → uno
    .substring(0, 40);                   // máx 40 caracteres
}

/**
 * Verifica si un slug está disponible en Firestore.
 * @returns {Promise<boolean>} true si está libre
 */
export async function slugDisponible(slug) {
  if (!slug) return false;
  const snap = await getDoc(doc(db, 'slugs', slug));
  return !snap.exists();
}

/**
 * Genera un slug único.
 * Si "pilates-palermo" ya existe, devuelve "pilates-palermo-2", etc.
 *
 * ⚠️ NOTA: Esta función SOLO verifica disponibilidad, no reserva el slug.
 * Para evitar condiciones de carrera, la escritura del estudio debe
 * manejar el error 'already-exists' con reintentos (ver crearEstudioSinAdmin).
 *
 * @returns {Promise<string>}
 */
export async function generarSlugUnico(texto) {
  const base = generarSlug(texto);
  if (!base) throw new Error('No se pudo generar un slug a partir del texto');
  if (await slugDisponible(base)) return base;

  let i = 2;
  while (i <= 100) {
    const candidato = `${base}-${i}`;
    if (await slugDisponible(candidato)) return candidato;
    i++;
  }
  throw new Error('No se pudo generar un slug único tras 100 intentos');
}