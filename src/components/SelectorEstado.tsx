export type FiltroEstado = 'todos' | 'publicados' | 'archivados';

const OPCIONES: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'publicados', etiqueta: 'Publicados' },
  { valor: 'archivados', etiqueta: 'Archivados' },
];

/**
 * Filtro de los listados de cursos y proyectos, con los mismos botones que el
 * de Blogs: qué se ve en la web (publicados), qué está guardado pero oculto
 * (archivados) o todo.
 */
export function SelectorEstado({
  valor,
  onChange,
}: {
  valor: FiltroEstado;
  onChange: (valor: FiltroEstado) => void;
}) {
  return (
    <div role="group" aria-label="Mostrar" className="flex flex-wrap gap-1.5">
      {OPCIONES.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          aria-pressed={valor === o.valor}
          className={`rounded-lg px-3.5 py-2 text-sm font-bold transition-colors ${
            valor === o.valor ? 'bg-brand-600 text-white' : 'text-slate-800 hover:bg-brand-50'
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
