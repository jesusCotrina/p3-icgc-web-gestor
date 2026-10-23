import { useRef } from 'react';

/**
 * Lista de textos de largo libre (contenido del programa, avances y logros).
 * Se agregan, quitan y reordenan ítems; Enter en el último crea uno nuevo.
 */
export function ListaEditable({
  id,
  etiqueta,
  items,
  onChange,
  placeholder,
  ayuda,
  obligatoria = false,
}: {
  id: string;
  etiqueta: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  ayuda?: string;
  obligatoria?: boolean;
}) {
  const contenedor = useRef<HTMLOListElement>(null);

  // Lleva el foco al ítem recién creado
  function enfocar(indice: number) {
    window.requestAnimationFrame(() => {
      contenedor.current
        ?.querySelectorAll<HTMLInputElement>('input')
        [indice]?.focus();
    });
  }

  function cambiar(indice: number, valor: string) {
    onChange(items.map((t, i) => (i === indice ? valor : t)));
  }

  function agregar(despuesDe = items.length - 1) {
    const copia = [...items];
    copia.splice(despuesDe + 1, 0, '');
    onChange(copia);
    enfocar(despuesDe + 1);
  }

  function quitar(indice: number) {
    onChange(items.filter((_, i) => i !== indice));
  }

  function mover(indice: number, delta: -1 | 1) {
    const destino = indice + delta;
    if (destino < 0 || destino >= items.length) return;
    const copia = [...items];
    [copia[indice], copia[destino]] = [copia[destino]!, copia[indice]!];
    onChange(copia);
  }

  const llenos = items.filter((t) => t.trim()).length;

  return (
    <fieldset>
      <legend className="label">
        {etiqueta} {obligatoria && <span className="text-red-500">*</span>}
        <span className="ml-2 text-xs font-normal text-slate-500">
          {llenos} {llenos === 1 ? 'ítem' : 'ítems'}
        </span>
      </legend>

      <ol ref={contenedor} className="space-y-2">
        {items.map((texto, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right text-xs font-bold text-slate-400">{i + 1}.</span>
            <input
              id={i === 0 ? id : undefined}
              type="text"
              value={texto}
              onChange={(e) => cambiar(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  agregar(i);
                }
              }}
              placeholder={placeholder}
              aria-label={`${etiqueta}, ítem ${i + 1}`}
              className="input"
            />
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => mover(i, -1)}
                disabled={i === 0}
                aria-label={`Subir el ítem ${i + 1}`}
                className="btn-ghost btn-sm px-2"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                disabled={i === items.length - 1}
                aria-label={`Bajar el ítem ${i + 1}`}
                className="btn-ghost btn-sm px-2"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label={`Quitar el ítem ${i + 1}`}
                className="btn-sm btn px-2 text-red-600 hover:bg-red-50"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ol>

      <button type="button" onClick={() => agregar()} className="btn-secondary btn-sm mt-3">
        + Agregar ítem
      </button>
      {ayuda && <p className="hint">{ayuda}</p>}
    </fieldset>
  );
}
