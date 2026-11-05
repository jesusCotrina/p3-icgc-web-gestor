export type FiltroEstado = 'todos' | 'publicados' | 'archivados';

const OPCIONES: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'publicados', etiqueta: 'Publicados' },
  { valor: 'archivados', etiqueta: 'Archivados' },
];

/**
 * Selector de los listados de cursos y proyectos: qué se ve en la web
 * (publicados), qué está guardado pero oculto (archivados) o todo.
 */
export function SelectorEstado({
  valor,
  onChange,
}: {
  valor: FiltroEstado;
  onChange: (valor: FiltroEstado) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
      <span className="sr-only sm:not-sr-only">Mostrar</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value as FiltroEstado)}
        aria-label="Mostrar"
        className="input w-auto py-2 pr-9 font-semibold"
      >
        {OPCIONES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}
