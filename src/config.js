// src/config.js

/**
 * Verifica si el usuario tiene el custom claim `superAdmin`.
 * El claim es firmado por Firebase, no puede falsearse desde el cliente.
 *
 * @param {import('firebase/auth').User} user - Usuario de Firebase Auth
 * @param {Object} [opts]
 * @param {boolean} [opts.forceRefresh=false] - Fuerza refrescar el token
 * @returns {Promise<boolean>}
 */
export async function esSuperAdmin(user, { forceRefresh = false } = {}) {
  if (!user) return false;
  try {
    const token = await user.getIdTokenResult(forceRefresh);
    return token.claims.superAdmin === true;
  } catch (err) {
    console.error('Error leyendo claims:', err);
    return false;
  }
}