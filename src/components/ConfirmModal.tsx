import { useEffect, useRef } from 'react';
import { IconoAlerta, IconoBasura, IconoMundo } from './Iconos';

/** publicar: azul con el mundo · aviso: azul con alerta · peligro: rojo con papelera */
type Tono = 'publicar' | 'aviso' | 'peligro';

/**
 * Ventana de confirmación. Usa <dialog> nativo: atrapa el foco, se cierra con
 * Esc y bloquea el resto de la pantalla sin librerías.
 */
export function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  textoConfirmar,
  tono = 'aviso',
  ocupado = false,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean;
  titulo: string;
  mensaje: React.ReactNode;
  textoConfirmar: string;
  tono?: Tono;
  ocupado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  const peligro = tono === 'peligro';
  const Icono = { publicar: IconoMundo, aviso: IconoAlerta, peligro: IconoBasura }[tono];

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirmar-titulo"
      // Esc o clic fuera: cancelar (salvo mientras se procesa)
      onCancel={(e) => {
        e.preventDefault();
        if (!ocupado) onCancelar();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !ocupado) onCancelar();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-2xl backdrop:bg-brand-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              peligro ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-700'
            }`}
          >
            <Icono size={22} />
          </span>
          <div className="min-w-0">
            <h2 id="confirmar-titulo" className="text-lg font-extrabold text-slate-900">
              {titulo}
            </h2>
            <div className="mt-2 text-sm leading-relaxed text-slate-800">{mensaje}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancelar} disabled={ocupado} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={ocupado}
            className={peligro ? 'btn-danger' : 'btn-primary'}
            autoFocus
          >
            {ocupado ? 'Un momento...' : textoConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
