// src/SuperAdmin.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import {
  crearEstudioSinAdmin,
  listarTodosLosEstudios,
  actualizarEstudio,
  cambiarPlanEstudio,
  listarMiembros
} from './estudios';
import {
  invitarAdmin,
  obtenerInvitacionAdminPendiente,
  crearInvitacion,
  enviarEmailInvitacion
} from './invitaciones';

// ============================================================
// PÁGINA: SÚPER ADMIN
// ============================================================
export function SuperAdmin() {
  const [user, setUser] = useState(null);
  const [estudios, setEstudios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState('');
  const [modalCrear, setModalCrear] = useState(false);
  const [reenviando, setReenviando] = useState(null); // slug del estudio que se está reenviando
  const [confirmReenvio, setConfirmReenvio] = useState(null); // datos del estudio a reenviar
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!msg && !msgError) return;
    const t = setTimeout(() => { setMsg(''); setMsgError(''); }, 5000);
    return () => clearTimeout(t);
  }, [msg, msgError]);

  const logout = async () => {
    if (!confirm('¿Cerrar sesión?')) return;
    await signOut(auth);
    navigate('/');
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await listarTodosLosEstudios();
      const conConteo = await Promise.all(
        data.map(async (e) => {
          try {
            const miembros = await listarMiembros(e.id);
            return { ...e, totalMiembros: miembros.length };
          } catch {
            return { ...e, totalMiembros: 0 };
          }
        })
      );
      setEstudios(conConteo);
    } catch (e) {
      setMsgError('⚠️ Error: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const toggleActivo = async (estudio) => {
    if (!confirm(
      estudio.activo
        ? `¿Desactivar "${estudio.nombre}"? Los usuarios no van a poder acceder.`
        : `¿Activar "${estudio.nombre}"?`
    )) return;
    await actualizarEstudio(estudio.id, { activo: !estudio.activo });
    cargar();
  };

  const cambiarPlan = async (estudio, nuevoPlan) => {
    if (!confirm(`¿Cambiar plan de "${estudio.nombre}" a "${nuevoPlan}" por 1 mes?`)) return;
    await cambiarPlanEstudio(estudio.id, nuevoPlan, 1);
    cargar();
  };

  // ============================================================
  // REENVIAR INVITACIÓN AL ADMIN
  // ============================================================
  const solicitarReenvio = (estudio) => {
    setConfirmReenvio(estudio);
  };

  const confirmarReenvio = async () => {
    const estudio = confirmReenvio;
    if (!estudio) return;

    setConfirmReenvio(null);
    setReenviando(estudio.slug);
    setMsg('');
    setMsgError('');

    try {
      // 1. Buscar invitación de admin pendiente
      const inv = await obtenerInvitacionAdminPendiente(estudio.id);

      if (!inv) {
        // No hay invitación pendiente, creamos una nueva
        // Pero necesitamos el email del admin. ¿De dónde lo sacamos?
        // Como no lo tenemos guardado, mostramos un mensaje de error.
        setMsgError(
          `⚠️ No hay una invitación pendiente para "${estudio.nombre}". ` +
          `Pedile al admin que se registre y volvé a invitarlo desde el panel del estudio.`
        );
        setReenviando(null);
        return;
      }

      // 2. Reenviar el email con el token existente
      await enviarEmailInvitacion({
        token: inv.token,
        email: inv.email,
        nombre: inv.nombre,
        estudioNombre: estudio.nombre,
        estudioSlug: estudio.slug,
        adminNombre: 'Soporte'
      });

      setMsg(`✅ Invitación reenviada a ${inv.email}`);
    } catch (e) {
      console.error(e);
      setMsgError('⚠️ Error al reenviar: ' + e.message);
    } finally {
      setReenviando(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">🔧 Panel Súper Admin</h1>
            <p className="text-sm text-gray-500">
              Logueado como {user?.email || '...'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={cargar}
              className="text-sm px-3 py-2 rounded border bg-white hover:bg-gray-100">
              🔄 Recargar
            </button>
            <button onClick={() => setModalCrear(true)}
              className="text-sm px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">
              + Crear estudio
            </button>
            <button onClick={logout}
              className="text-sm px-4 py-2 rounded border border-red-300 text-red-600 hover:bg-red-50">
              Salir
            </button>
          </div>
        </div>

        {msg && (
          <p className="mb-4 text-sm bg-green-50 border border-green-200 text-green-800 p-2 rounded">
            {msg}
          </p>
        )}
        {msgError && (
          <p className="mb-4 text-sm bg-red-50 border border-red-200 text-red-800 p-2 rounded">
            {msgError}
          </p>
        )}

        {cargando ? (
          <p className="text-gray-500">Cargando estudios...</p>
        ) : estudios.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
            No hay estudios creados. Hacé clic en "+ Crear estudio" para empezar.
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-xs text-gray-600 uppercase">
                  <th className="px-4 py-3">Estudio</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3">Miembros</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {estudios.map(e => (
                  <tr key={e.id} className="text-sm">
                    <td className="px-4 py-3 font-medium">{e.nombre}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        /{e.slug}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={e.plan}
                        onChange={(ev) => cambiarPlan(e, ev.target.value)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        <option value="trial">trial</option>
                        <option value="basico">básico</option>
                        <option value="pro">pro</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {e.planVencimiento?.toDate
                        ? e.planVencimiento.toDate().toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">{e.totalMiembros}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        e.activo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {e.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <Link
                        to={`/${e.slug}/admin`}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        Ver
                      </Link>
                      <button
                        onClick={() => solicitarReenvio(e)}
                        disabled={reenviando === e.slug}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {reenviando === e.slug ? 'Reenviando...' : 'Reenviar invitación'}
                      </button>
                      <button
                        onClick={() => toggleActivo(e)}
                        className="text-xs text-gray-600 hover:underline"
                      >
                        {e.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalCrear && (
        <ModalCrearEstudio
          superAdminEmail={user?.email}
          onCerrar={() => setModalCrear(false)}
          onCreado={(emailAdmin) => {
            setModalCrear(false);
            setMsg(`✅ Estudio creado. Se envió una invitación a ${emailAdmin}`);
            cargar();
          }}
        />
      )}

      {/* Modal de confirmación para reenviar */}
      {confirmReenvio && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">Reenviar invitación</h3>
            <p className="text-sm text-gray-600">
              ¿Reenviar la invitación pendiente del estudio{' '}
              <strong>{confirmReenvio.nombre}</strong>?
            </p>
            <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              Se va a enviar un email al admin con el link de invitación.
              Si no hay invitación pendiente, vas a ver un error.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmReenvio(null)}
                className="px-4 py-2 rounded border hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarReenvio}
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
              >
                Reenviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODAL: CREAR ESTUDIO + INVITAR ADMIN
// ============================================================
function ModalCrearEstudio({ superAdminEmail, onCerrar, onCreado }) {
  const [nombre, setNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreando(true);

    try {
      // 1. Crear el estudio (sin admin todavía)
      const { estudioId, slug } = await crearEstudioSinAdmin({
        nombre,
        creadoPor: superAdminEmail
      });

      // 2. Enviar la invitación al admin
      try {
        await invitarAdmin(
          { id: estudioId, nombre: nombre.trim(), slug },
          {
            email: adminEmail,
            nombre: adminNombre || adminEmail.split('@')[0],
            creadaPor: superAdminEmail,
            adminNombre: superAdminEmail
          }
        );
      } catch (emailErr) {
        // El estudio se creó pero el email falló
        setError(
          `El estudio se creó (/${slug}) pero no se pudo enviar el email: ` +
          `${emailErr.message}. ` +
          `Pedile al admin que se registre y volvé a invitarlo desde el panel del estudio.`
        );
        setCreando(false);
        return;
      }

      // 3. Todo OK
      onCreado(adminEmail);
    } catch (err) {
      setError(err.message);
      setCreando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg p-6 w-full max-w-md space-y-4"
      >
        <h3 className="text-lg font-bold">Crear estudio nuevo</h3>

        <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 p-2 rounded">
          💡 Al crear el estudio, se le va a enviar un correo al admin
          con un link para que acepte y cree su contraseña.
        </p>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>
        )}

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">
            Nombre del estudio
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Pilates Palermo"
            required
            className="w-full border rounded px-3 py-2"
          />
          <p className="text-xs text-gray-400 mt-1">
            Se va a generar la URL automáticamente
          </p>
        </div>

        <hr />

        <p className="text-xs text-gray-600 font-medium">
          Datos del administrador
        </p>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Nombre</label>
          <input
            value={adminNombre}
            onChange={(e) => setAdminNombre(e.target.value)}
            placeholder="Juana Pérez"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="juana@pilatespalermo.com"
            required
            className="w-full border rounded px-3 py-2"
          />
          <p className="text-xs text-gray-400 mt-1">
            Ahí le va a llegar el link para aceptar la invitación.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} disabled={creando}
            className="px-4 py-2 rounded border hover:bg-gray-100 disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={creando}
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
            {creando ? 'Creando...' : 'Crear y enviar invitación'}
          </button>
        </div>
      </form>
    </div>
  );
}