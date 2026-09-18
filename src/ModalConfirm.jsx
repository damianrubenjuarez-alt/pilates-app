// src/ModalConfirm.jsx
import { useEffect } from 'react';

/**
 * Modal de confirmación reutilizable.
 */
export function ModalConfirm({
  abierto,
  titulo = '¿Estás seguro?',
  mensaje = '',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  colorBoton = 'purple',
  onConfirmar,
  onCancelar
}) {
  useEffect(() => {
    if (!abierto) return;
    const handler = (e) => { if (e.key === 'Escape') onCancelar?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  const colores = {
    purple: 'bg-purple-600 hover:bg-purple-700',
    red:    'bg-red-600 hover:bg-red-700',
    green:  'bg-green-600 hover:bg-green-700'
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">{titulo}</h3>
        {mensaje && (
          <p className="text-sm text-gray-600 whitespace-pre-line">{mensaje}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 rounded border hover:bg-gray-100"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={() => { onConfirmar?.(); onCancelar?.(); }}
            className={`px-4 py-2 rounded text-white ${colores[colorBoton]}`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}