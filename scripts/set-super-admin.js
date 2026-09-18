// scripts/set-super-admin.js
// Uso: node scripts/set-super-admin.js <UID> [true|false]

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

let serviceAccount;
try {
  serviceAccount = JSON.parse(
    readFileSync('./serviceAccountKey.json', 'utf-8')
  );
} catch (err) {
  console.error('❌ No se pudo leer ./serviceAccountKey.json');
  console.error('   Asegurate de haberlo descargado desde Firebase Console');
  console.error('   y de estar corriendo el script desde la raíz del proyecto.');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const [,, uid, valor = 'true'] = process.argv;

if (!uid) {
  console.error('❌ Falta el UID.');
  console.error('   Uso: node scripts/set-super-admin.js <UID> [true|false]');
  process.exit(1);
}

const activo = valor === 'true';

getAuth()
  .setCustomUserClaims(uid, { superAdmin: activo })
  .then(() => {
    console.log(`✅ superAdmin=${activo} seteado para ${uid}`);
    console.log('');
    console.log('⚠️  El usuario debe cerrar sesión y volver a entrar');
    console.log('   (o refrescar el token) para que el cambio se aplique.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });