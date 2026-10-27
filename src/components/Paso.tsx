/** Bloques numerados de los formularios: guían paso a paso a quien no es técnico. */

export function EncabezadoPaso({
  numero,
  titulo,
  descripcion,
}: {
  numero: number;
  titulo: string;
  descripcion?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
        {numero}
      </span>
      <div>
        <h3 className="text-lg font-extrabold leading-8 text-slate-900">{titulo}</h3>
        {descripcion && <p className="text-sm text-slate-800">{descripcion}</p>}
      </div>
    </div>
  );
}

export function Paso({
  numero,
  titulo,
  descripcion,
  children,
}: {
  numero: number;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-5 p-5 sm:p-6">
      <EncabezadoPaso numero={numero} titulo={titulo} descripcion={descripcion} />
      {children}
    </section>
  );
}
