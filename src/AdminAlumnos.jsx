// src/AdminAlumnos.jsx
import { useEffect, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase/config';
import { useEstudio } from './EstudioContext';
import { listarMiembros, actualizarMiembro, eliminarMiembro } from './estudios';
import { listarInvitaciones, invitarAlumno, crearInvitacion, enviarEmailInvitacion } from './invitaciones';
import { ModalConfirm } from './ModalConfirm';

// ============================================================
// PÁGINA: ADMIN · ALUMNOS
// ============================================================
export function AdminAlumnos() {
  const { estudio, miembro: yo } = useEstudio();
  const [alumnos, setAlumnos] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState('');
  const [tab, setTab] = useState('alumnos');
  const [modalInvitar, setModalInvitar] = useState(false);

  // Estado del modal de confirmación
  const [confirmData, setConfirmData] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroInv, setFiltroInv] = useState('todas');

  const cargar = async () => {
    if (!estudio) return;
    setCargando(true);
    try {
      const [a, i] = await Promise.all([
        listarMiembros(estudio.id),
        listarInvitaciones(estudio.id)
      ]);
      setAlumnos(a);
      setInvitaciones(i.sort((x, y) => {
        const fx = x.creadaEn?.toDate?.() || new Date(0);
        const fy = y.creadaEn?.toDate?.() || new Date(0);
        return fy - fx;
      }));
    } catch (e) {
      setMsgError('⚠️ Error: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [estudio?.id]);

  useEffect(() => {
    if (!msg && !msgError) return;
    const t = setTimeout(() => { setMsg(''); setMsgError(''); }, 4000);
    return () => clearTimeout(t);
  }, [msg, msgError]);

  // ============================================================
  // ACCIONES (con modal de confirmación)
  // ============================================================
  const cambiarRol = (uid, nuevoRol) => {
    setConfirmData({
      titulo: 'Cambiar rol',
      mensaje: `¿Cambiar el rol del miembro a "${nuevoRol}"?`,
      textoConfirmar: 'Cambiar',
      colorBoton: 'purple',
      onConfirmar: async () => {
        try {
          await actualizarMiembro(estudio.id, uid, { rol: nuevoRol });
          setMsg(`✅ Rol cambiado a "${nuevoRol}"`);
          cargar();
        } catch (e) {
          setMsgError('⚠️ ' + e.message);
        }
      }
    });
  };

  const toggleActivo = (alumno) => {
    const activo = alumno.activo !== false;
    setConfirmData({
      titulo: activo ? 'Desactivar miembro' : 'Activar miembro',
      mensaje: activo
        ? `¿Desactivar a ${alumno.nombre}? No va a poder iniciar sesión ni reservar.`
        : `¿Activar a ${alumno.nombre}?`,
      textoConfirmar: activo ? 'Desactivar' : 'Activar',
      colorBoton: activo ? 'red' : 'green',
      onConfirmar: async () => {
        try {
          await actualizarMiembro(estudio.id, alumno.uid, { activo: !activo });
          setMsg(activo ? `✅ ${alumno.nombre} desactivado` : `✅ ${alumno.nombre} activado`);
          cargar();
        } catch (e) {
          setMsgError('⚠️ ' + e.message);
        }
      }
    });
  };

  const sumarClases = async (alumno, cantidad) => {
    const nuevo = (alumno.clasesRestantes || 0) + cantidad;
    if (nuevo < 0) {
      setMsgError('⚠️ No se puede tener clases negativas');
      return;
    }
    try {
      await actualizarMiembro(estudio.id, alumno.uid, { clasesRestantes: nuevo });
      setMsg(`✅ ${alumno.nombre}: ${nuevo} clases (${cantidad > 0 ? '+' : ''}${cantidad})`);
      cargar();
    } catch (e) {
      setMsgError('⚠️ ' + e.message);
    }
  };

  const quitar = (alumno) => {
    setConfirmData({
      titulo: 'Quitar del estudio',
      mensaje: `¿Quitar a ${alumno.nombre} del estudio?\n\nEsta acción no se puede deshacer.`,
      textoConfirmar: 'Quitar',
      colorBoton: 'red',
      onConfirmar: async () => {
        try {
          await eliminarMiembro(estudio.id, alumno.uid);
          setMsg(`✅ ${alumno.nombre} eliminado del estudio`);
          cargar();
        } catch (e) {
          setMsgError('⚠️ ' + e.message);
        }
      }
    });
  };

  const reenviarInvitacion = (inv) => {
    setConfirmData({
      titulo: 'Reenviar invitación',
      mensaje: `¿Reenviar invitación a ${inv.email}?\n\nSe va a generar un link nuevo.`,
      textoConfirmar: 'Reenviar',
      colorBoton: 'purple',
      onConfirmar: async () => {
        try {
          const { token } = await crearInvitacion(estudio.id, {
            email: inv.email,
            nombre: inv.nombre,
            telefono: inv.telefono || '',
            clasesIniciales: inv.clasesIniciales || 0,
            rol: inv.rol || 'alumno',
            creadaPor: yo?.email
          });
          await enviarEmailInvitacion({
            token,
            email: inv.email,
            nombre: inv.nombre,
            estudioNombre: estudio.nombre,
            estudioSlug: estudio.slug,
            adminNombre: yo?.nombre
          });
          setMsg(`✅ Invitación reenviada a ${inv.email}`);
          cargar();
        } catch (e) {
          setMsgError('⚠️ ' + e.message);
        }
      }
    });
  };

  const copiarLinkInvitacion = async (token) => {
    const link = `${window.location.origin}/${estudio.slug}/invitacion/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setMsg('✅ Link copiado al portapapeles');
    } catch {
      window.prompt('Copiá el link:', link);
    }
  };

  const enviarResetPassword = (alumno) => {
    setConfirmData({
      titulo: 'Resetear contraseña',
      mensaje: `¿Enviar un email de reseteo de contraseña a ${alumno.email}?`,
      textoConfirmar: 'Enviar',
      colorBoton: 'purple',
      onConfirmar: async () => {
        try {
          await sendPasswordResetEmail(auth, alumno.email);
          setMsg(`✅ Email de reseteo enviado a ${alumno.email}`);
        } catch (e) {
          setMsgError('⚠️ ' + e.message);
        }
      }
    });
  };

  const expirada = (inv) => {
    const exp = inv.expiraEn?.toDate?.() || new Date(inv.expiraEn);
    return exp < new Date();
  };

  if (!estudio) return <div className="p-8">Cargando estudio...</div>;

  const alumnosFiltrados = alumnos
    .filter(a => a.rol === 'alumno' || a.rol === 'instructor')
    .filter(a => {
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        a.nombre?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.telefono?.toLowerCase().includes(q)
      );
    });

  const invitacionesFiltradas = invitaciones.filter(inv => {
    if (filtroInv === 'todas') return true;
    if (filtroInv === 'aceptadas') return inv.estado === 'aceptada';
    if (filtroInv === 'expiradas') return inv.estado !== 'aceptada' && expirada(inv);
    if (filtroInv === 'pendientes') return inv.estado !== 'aceptada' && !expirada(inv);
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">👥 Alumnos</h1>
          <p className="text-sm text-gray-500">
            {estudio.nombre} · {alumnos.length} miembros
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar}
            className="text-sm px-3 py-2 rounded border bg-white hover:bg-gray-100">
            🔄 Recargar
          </button>
          <button onClick={() => setModalInvitar(true)}
            className="text-sm px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">
            + Invitar alumno
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

      <div className="border-b mb-4 flex gap-6">
        <button
          onClick={() => setTab('alumnos')}
          className={`pb-2 text-sm font-medium border-b-2 ${
            tab === 'alumnos' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Alumnos ({alumnosFiltrados.length})
        </button>
        <button
          onClick={() => setTab('invitaciones')}
          className={`pb-2 text-sm font-medium border-b-2 ${
            tab === 'invitaciones' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Invitaciones ({invitaciones.length})
        </button>
      </div>

      {/* TAB ALUMNOS */}
      {tab === 'alumnos' && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, email o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full max-w-md border rounded px-3 py-2 text-sm"
            />
          </div>

          {cargando ? <p className="text-gray-500">Cargando...</p> :
          alumnosFiltrados.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
              {busqueda
                ? 'No hay alumnos que coincidan con la búsqueda.'
                : 'No hay alumnos todavía. Hacé clic en "+ Invitar alumno" para empezar.'}
            </div>
          ) : (
            <div className="bg-white border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b text-left text-xs text-gray-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Clases</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {alumnosFiltrados.map(a => (
                    <tr key={a.uid} className="text-sm">
                      <td className="px-4 py-3 font-medium">{a.nombre}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{a.email}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {a.telefono ? (
                          <a
                            href={`https://wa.me/${a.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:underline"
                            title="Abrir WhatsApp"
                          >
                            {a.telefono}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={a.rol}
                          onChange={(e) => cambiarRol(a.uid, e.target.value)}
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="alumno">alumno</option>
                          <option value="instructor">instructor</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => sumarClases(a, -1)}
                            className="w-6 h-6 rounded border hover:bg-gray-100">−</button>
                          <span className="w-8 text-center font-mono">{a.clasesRestantes || 0}</span>
                          <button onClick={() => sumarClases(a, 1)}
                            className="w-6 h-6 rounded border hover:bg-gray-100">+</button>
                          <button onClick={() => sumarClases(a, 4)}
                            className="text-xs px-2 py-1 rounded border hover:bg-gray-100">+4</button>
                          <button onClick={() => sumarClases(a, 8)}
                            className="text-xs px-2 py-1 rounded border hover:bg-gray-100">+8</button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          a.activo === false
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {a.activo === false ? 'Inactivo' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => enviarResetPassword(a)}
                          className="text-xs text-gray-600 hover:underline">
                          Resetear pass
                        </button>
                        <button onClick={() => toggleActivo(a)}
                          className="text-xs text-gray-600 hover:underline">
                          {a.activo === false ? 'Activar' : 'Desactivar'}
                        </button>
                        {a.uid !== yo?.uid && (
                          <button onClick={() => quitar(a)}
                            className="text-xs text-red-600 hover:underline">
                            Quitar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB INVITACIONES */}
      {tab === 'invitaciones' && (
        <>
          <div className="mb-4 flex gap-2 text-sm flex-wrap">
            <button
              onClick={() => setFiltroInv('todas')}
              className={`px-3 py-1 rounded border ${
                filtroInv === 'todas' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-gray-50'
              }`}>
              Todas ({invitaciones.length})
            </button>
            <button
              onClick={() => setFiltroInv('pendientes')}
              className={`px-3 py-1 rounded border ${
                filtroInv === 'pendientes' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-gray-50'
              }`}>
              Pendientes
            </button>
            <button
              onClick={() => setFiltroInv('aceptadas')}
              className={`px-3 py-1 rounded border ${
                filtroInv === 'aceptadas' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-gray-50'
              }`}>
              Aceptadas
            </button>
            <button
              onClick={() => setFiltroInv('expiradas')}
              className={`px-3 py-1 rounded border ${
                filtroInv === 'expiradas' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-gray-50'
              }`}>
              Expiradas
            </button>
          </div>

          {cargando ? <p className="text-gray-500">Cargando...</p> :
          invitacionesFiltradas.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
              No hay invitaciones en este filtro.
            </div>
          ) : (
            <div className="bg-white border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b text-left text-xs text-gray-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Clases</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Creada</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invitacionesFiltradas.map(inv => {
                    const exp = expirada(inv);
                    const fechaCreacion = inv.creadaEn?.toDate?.()
                      ? inv.creadaEn.toDate().toLocaleDateString()
                      : '—';
                    return (
                      <tr key={inv.id} className="text-sm">
                        <td className="px-4 py-3 font-medium">{inv.nombre}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{inv.email}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {inv.telefono || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">{inv.clasesIniciales}</td>
                        <td className="px-4 py-3">
                          {inv.estado === 'aceptada' ? (
                            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                              ✓ Aceptada
                            </span>
                          ) : exp ? (
                            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                              Expirada
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fechaCreacion}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {inv.estado !== 'aceptada' && (
                            <>
                              <button
                                onClick={() => copiarLinkInvitacion(inv.id || inv.token)}
                                className="text-xs text-gray-600 hover:underline">
                                Copiar link
                              </button>
                              <button
                                onClick={() => reenviarInvitacion(inv)}
                                className="text-xs text-purple-600 hover:underline">
                                Reenviar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalInvitar && (
        <ModalInvitar
          estudio={estudio}
          adminNombre={yo?.nombre}
          onCerrar={() => setModalInvitar(false)}
          onInvitado={() => { setModalInvitar(false); cargar(); setMsg('✅ Invitación enviada'); }}
        />
      )}

      {/* Modal de confirmación */}
      <ModalConfirm
        abierto={!!confirmData}
        titulo={confirmData?.titulo}
        mensaje={confirmData?.mensaje}
        textoConfirmar={confirmData?.textoConfirmar}
        colorBoton={confirmData?.colorBoton}
        onConfirmar={confirmData?.onConfirmar}
        onCancelar={() => setConfirmData(null)}
      />
    </div>
  );
}

// ============================================================
// MODAL: INVITAR ALUMNO
// ============================================================
function ModalInvitar({ estudio, adminNombre, onCerrar, onInvitado }) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [clases, setClases] = useState(8);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const validarEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validarEmail(email)) {
      setError('El email no tiene un formato válido');
      return;
    }

    setEnviando(true);
    try {
      await invitarAlumno(estudio, {
        email,
        nombre,
        telefono,
        clasesIniciales: Number(clases),
        adminNombre
      });
      onInvitado();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al enviar la invitación');
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-bold">Invitar alumno</h3>
        <p className="text-sm text-gray-500">
          Le vamos a enviar un email a <strong>{estudio.nombre}</strong> con un link para unirse.
        </p>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>
        )}

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alumno@email.com"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Juan Pérez (opcional)"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">
            Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+54 9 11 1234-5678"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">
            Clases iniciales
          </label>
          <input
            type="number"
            min="0"
            max="200"
            value={clases}
            onChange={(e) => setClases(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <p className="text-xs text-gray-400 mt-1">
            Podés cambiarlo después desde la lista de alumnos.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} disabled={enviando}
            className="px-4 py-2 rounded border hover:bg-gray-100 disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={enviando}
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
            {enviando ? 'Enviando email...' : 'Enviar invitación'}
          </button>
        </div>
      </form>
    </div>
  );
}