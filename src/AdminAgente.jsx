// src/AdminAgente.jsx
import { useState, useEffect } from 'react';
import { useEstudio } from './EstudioContext';
import { getEtiquetas } from './etiquetas';
import {
  obtenerConfigAgente,
  guardarConfigAgente,
  TONOS_DISPONIBLES,
  VARIABLES_PROMPT,
  CONFIG_AGENTE_DEFAULT
} from './agenteConfig';
import {
  Bot, Sparkles, Plus, Trash2,
  Save, Check, AlertCircle, ExternalLink, Zap,
  Settings, Info, Lightbulb
} from 'lucide-react';

export function AdminAgente() {
  const { estudio, esAdmin } = useEstudio();
  const [config, setConfig] = useState(CONFIG_AGENTE_DEFAULT);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [mostrarVariables, setMostrarVariables] = useState(false);

  const et = getEtiquetas(estudio);

  useEffect(() => {
    if (!estudio) return;
    setCargando(true);
    obtenerConfigAgente(estudio.id)
      .then(c => setConfig(c))
      .catch(e => setError('Error al cargar: ' + e.message))
      .finally(() => setCargando(false));
  }, [estudio?.id]);

  if (!estudio) return <div className="p-8">Cargando estudio...</div>;

  if (!esAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold mb-2">Acceso denegado</h2>
          <p className="text-sm text-gray-600">Solo administradores.</p>
        </div>
      </div>
    );
  }

  const mostrarMsg = (texto, esError = false) => {
    if (esError) { setError(texto); setMsg(''); }
    else { setMsg(texto); setError(''); }
    setTimeout(() => { setMsg(''); setError(''); }, 4000);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarConfigAgente(estudio.id, config);
      mostrarMsg('✅ Configuración guardada');
    } catch (e) {
      mostrarMsg('⚠️ Error: ' + e.message, true);
    } finally {
      setGuardando(false);
    }
  };

  const linkPublico = `https://www.pilatesapp.online/${estudio.slug}/chat`;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkPublico);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      window.prompt('Copiá el link:', linkPublico);
    }
  };

  const agregarServicio = () => {
    setConfig({
      ...config,
      servicios: [...(config.servicios || []), { nombre: '', duracion: 60, precio: 0 }]
    });
  };

  const actualizarServicio = (idx, campo, valor) => {
    const nuevos = [...config.servicios];
    nuevos[idx] = { ...nuevos[idx], [campo]: valor };
    setConfig({ ...config, servicios: nuevos });
  };

  const eliminarServicio = (idx) => {
    setConfig({ ...config, servicios: config.servicios.filter((_, i) => i !== idx) });
  };

  const agregarFaq = () => {
    setConfig({
      ...config,
      faq: [...(config.faq || []), { pregunta: '', respuesta: '' }]
    });
  };

  const actualizarFaq = (idx, campo, valor) => {
    const nuevas = [...config.faq];
    nuevas[idx] = { ...nuevas[idx], [campo]: valor };
    setConfig({ ...config, faq: nuevas });
  };

  const eliminarFaq = (idx) => {
    setConfig({ ...config, faq: config.faq.filter((_, i) => i !== idx) });
  };

  if (cargando) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-purple-600" />
          Mi Agente IA
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurá el asistente que atiende a tus {et.clientes.toLowerCase()} 24/7
        </p>
      </div>

      {msg && (
        <div className="mb-4 text-sm bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> {msg}
        </div>
      )}
      {error && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* CARD: Estado */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Zap className={`w-5 h-5 ${config.activo ? 'text-green-600' : 'text-gray-400'}`} />
              <h2 className="font-bold text-lg">Estado del agente</h2>
            </div>
            <p className="text-sm text-gray-600">
              {config.activo
                ? '✅ El agente está activo y atendiendo a tus clientes'
                : '🔴 El agente está desactivado. Activalo para empezar a usarlo'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfig({ ...config, activo: !config.activo })}
            className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors flex-shrink-0 ${
              config.activo ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block w-5 h-5 transform bg-white rounded-full shadow transition-transform ${
              config.activo ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {config.activo && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-700 font-medium mb-2">🔗 Link público del chat</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 text-xs bg-white px-2 py-1.5 rounded border truncate">
                {linkPublico}
              </code>
              <button
                onClick={copiarLink}
                className="text-xs px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 whitespace-nowrap font-medium"
              >
                {linkCopiado ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD: Identidad */}
      <div className="bg-white border rounded-lg p-5 mb-6 space-y-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Identidad del agente
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1 font-medium">Nombre del agente</label>
            <input
              type="text"
              value={config.nombre}
              onChange={(e) => setConfig({ ...config, nombre: e.target.value })}
              placeholder="Ej: Sofi"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1 font-medium">Tono</label>
            <select
              value={config.tono}
              onChange={(e) => setConfig({ ...config, tono: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              {TONOS_DISPONIBLES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.emoji}
              onChange={(e) => setConfig({ ...config, emoji: e.target.checked })}
              className="w-4 h-4 accent-purple-600"
            />
            <span className="text-sm text-gray-700">Usar emojis en las respuestas</span>
          </label>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">Frase de bienvenida</label>
          <input
            type="text"
            value={config.fraseBienvenida}
            onChange={(e) => setConfig({ ...config, fraseBienvenida: e.target.value })}
            placeholder="¡Hola! Soy Sofi, ¿en qué te ayudo? 💜"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">
            Instrucciones extra <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={config.instruccionesExtra}
            onChange={(e) => setConfig({ ...config, instruccionesExtra: e.target.value })}
            placeholder="Ej: Siempre saludá con el nombre del estudio."
            rows={3}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* CARD: Servicios */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">📅 Servicios / {et.citas}</h2>
          <button
            onClick={agregarServicio}
            className="text-sm px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>

        {(config.servicios || []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No hay servicios cargados</p>
        ) : (
          <div className="space-y-2">
            {config.servicios.map((s, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  value={s.nombre}
                  onChange={(e) => actualizarServicio(idx, 'nombre', e.target.value)}
                  placeholder="Nombre"
                  className="flex-1 border rounded px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={s.duracion}
                  onChange={(e) => actualizarServicio(idx, 'duracion', Number(e.target.value))}
                  placeholder="Min"
                  className="w-20 border rounded px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={s.precio}
                  onChange={(e) => actualizarServicio(idx, 'precio', Number(e.target.value))}
                  placeholder="$"
                  className="w-24 border rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={() => eliminarServicio(idx)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CARD: FAQ */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">❓ Preguntas frecuentes</h2>
          <button
            onClick={agregarFaq}
            className="text-sm px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>

        {(config.faq || []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No hay preguntas cargadas</p>
        ) : (
          <div className="space-y-3">
            {config.faq.map((f, idx) => (
              <div key={idx} className="border rounded p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={f.pregunta}
                    onChange={(e) => actualizarFaq(idx, 'pregunta', e.target.value)}
                    placeholder="Pregunta"
                    className="flex-1 border rounded px-3 py-2 text-sm font-medium"
                  />
                  <button
                    onClick={() => eliminarFaq(idx)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={f.respuesta}
                  onChange={(e) => actualizarFaq(idx, 'respuesta', e.target.value)}
                  placeholder="Respuesta"
                  rows={2}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CARD: Prompt avanzado */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-purple-600" />
          <h2 className="font-bold text-lg">Prompt avanzado</h2>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
            Opcional
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Solo si querés control total sobre cómo se comporta el agente.
          Si lo dejás desactivado, se usa el prompt automático basado en tu
          configuración de arriba.
        </p>

        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={config.usarPromptPersonalizado || false}
            onChange={(e) => setConfig({ ...config, usarPromptPersonalizado: e.target.checked })}
            className="w-4 h-4 accent-purple-600"
          />
          <span className="text-sm text-gray-700 font-medium">
            Usar prompt personalizado
          </span>
        </label>

        {config.usarPromptPersonalizado && (
          <>
            <div className="mb-3">
              <button
                onClick={() => setMostrarVariables(!mostrarVariables)}
                className="text-xs text-purple-600 hover:underline flex items-center gap-1"
              >
                <Lightbulb className="w-3 h-3" />
                {mostrarVariables ? 'Ocultar' : 'Ver'} variables disponibles
              </button>

              {mostrarVariables && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
                  <p className="font-medium text-blue-800 mb-2">
                    💡 Podés usar estas variables en tu prompt:
                  </p>
                  {VARIABLES_PROMPT.map(v => (
                    <div key={v.var} className="flex gap-2 text-blue-700">
                      <code className="bg-white px-1 rounded font-mono">{v.var}</code>
                      <span className="text-blue-600">→ {v.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <textarea
              value={config.promptPersonalizado || ''}
              onChange={(e) => setConfig({ ...config, promptPersonalizado: e.target.value })}
              placeholder={`Sos {nombre}, el asistente virtual de {estudio}.\n\nTu tono es cercano y profesional. Usás emojis con moderación.\n\nAyudás a los {clientes} a reservar {citas} y responder dudas.\n\nSiempre saludás con el nombre del estudio...`}
              rows={14}
              className="w-full border rounded px-3 py-2 text-sm font-mono"
            />

            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Importante:</p>
                <p>
                  Las herramientas del agente (reservar, cancelar, etc.) se agregan
                  automáticamente al final. No hace falta que las menciones.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end mb-8">
        <button
          onClick={guardar}
          disabled={guardando}
          className="px-6 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {guardando ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>

      {/* BANNER: Upsell */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🚀</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-2">
              ¿Sabías que podés usar el Agente IA en OTROS negocios?
            </h3>
            <p className="text-sm text-purple-100 mb-4">
              El mismo agente que atiende tus {et.citas.toLowerCase()} puede atender clínicas,
              barberías, restaurantes, consultorios y cualquier otro negocio.
              Conocé <strong>AgenteIA</strong>, la versión para cualquier tipo de negocio.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a
                href="https://agente.servidorlocal.site"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition text-sm"
              >
                Conocer AgenteIA
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => alert('Próximamente: programa de referidos')}
                className="inline-flex items-center gap-2 border border-white/30 px-4 py-2 rounded-lg font-medium hover:bg-white/10 transition text-sm"
              >
                💰 Ganar comisión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}