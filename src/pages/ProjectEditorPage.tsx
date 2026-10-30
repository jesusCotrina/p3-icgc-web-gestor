import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SubidorArchivo } from '@/components/BlockEditor';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Paso } from '@/components/Paso';
import { SaludSeo } from '@/components/SeoPanel';
import { projectsApi, type ProjectPayload } from '@/lib/api';
import { slugify } from '@/lib/format';
import { revisarProyecto } from '@/lib/seo-reglas';
import { PERU_REGIONS, type MediaDTO, type ProjectItem } from '@/lib/types';

/**
 * El slug no se muestra: se genera del título. Estado, duración, inversión,
 * área, ejecutor, logros y coordenadas ya no se editan (la web no los
 * muestra desde oct. 2026), pero se conservan tal como vienen.
 */
type Formulario = Omit<ProjectPayload, 'coverImageId' | 'slug'> & {
  coverImage: MediaDTO | null;
};

const TRABAJO_VACIO: ProjectItem = { title: '', description: '' };

const VACIO: Formulario = {
  title: '',
  company: '',
  duration: '',
  status: 'COMPLETED',
  capital: '',
  location: '',
  community: '',
  implementingEntity: '',
  area: '',
  objective: '',
  items: [TRABAJO_VACIO],
  achievements: [],
  communitiesBenefited: 1,
  region: '',
  latitude: null,
  longitude: null,
  coverImage: null,
  coverAlt: '',
  position: 0,
  isPublished: true,
};

const obligatorio = <span className="text-red-600">*</span>;

/** Crear o editar un proyecto. "nuevo" en la URL = crear. */
export function ProjectEditorPage() {
  const { id } = useParams();
  const esNuevo = !id || id === 'nuevo';
  const navigate = useNavigate();

  const [form, setForm] = useState<Formulario>(VACIO);
  const [cargando, setCargando] = useState(!esNuevo);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState('');
  const listaTrabajos = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (esNuevo) return;
    projectsApi
      .get(id!)
      .then(({ slug: _slug, ...p }) =>
        setForm({
          ...p,
          coverAlt: p.coverAlt ?? '',
          items: p.items.length ? p.items : [TRABAJO_VACIO],
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el proyecto'))
      .finally(() => setCargando(false));
  }, [id, esNuevo]);

  const actualizar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  // ── Lista de trabajos realizados ──
  const cambiarTrabajo = (indice: number, campo: keyof ProjectItem, valor: string) =>
    actualizar(
      'items',
      form.items.map((t, i) => (i === indice ? { ...t, [campo]: valor } : t)),
    );

  function agregarTrabajo() {
    actualizar('items', [...form.items, TRABAJO_VACIO]);
    // Lleva el foco al título del trabajo nuevo
    window.requestAnimationFrame(() => {
      const titulos = listaTrabajos.current?.querySelectorAll<HTMLInputElement>('input');
      titulos?.[titulos.length - 1]?.focus();
    });
  }

  const quitarTrabajo = (indice: number) =>
    actualizar(
      'items',
      form.items.length > 1 ? form.items.filter((_, i) => i !== indice) : [TRABAJO_VACIO],
    );

  function moverTrabajo(indice: number, delta: -1 | 1) {
    const destino = indice + delta;
    if (destino < 0 || destino >= form.items.length) return;
    const copia = [...form.items];
    [copia[indice], copia[destino]] = [copia[destino]!, copia[indice]!];
    actualizar('items', copia);
  }

  const trabajosLimpios = () =>
    form.items
      .map((t) => ({ title: t.title.trim(), description: t.description.trim() }))
      .filter((t) => t.title || t.description);

  /** Primero se revisa lo obligatorio; si está todo, se pide confirmación. */
  function revisar(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (trabajosLimpios().some((t) => !t.title)) {
      setError('Cada trabajo realizado necesita su título (o bórralo si está de más).');
      return;
    }
    if (form.isPublished && !form.coverImage) {
      setError('Sube la foto del proyecto antes de publicarlo.');
      return;
    }
    if (form.isPublished && !form.coverAlt?.trim()) {
      setError('Escribe qué se ve en la foto antes de publicarlo.');
      return;
    }
    setConfirmando(true);
  }

  async function guardar() {
    const { coverImage, ...resto } = form;
    const payload: ProjectPayload = {
      ...resto,
      // La dirección del proyecto sale del título; nadie tiene que escribirla
      slug: slugify(form.title),
      coverImageId: coverImage?.id ?? null,
      coverAlt: form.coverAlt?.trim() || null,
      items: trabajosLimpios(),
    };

    setGuardando(true);
    try {
      if (esNuevo) await projectsApi.create(payload);
      else await projectsApi.update(id!, payload);
      navigate('/proyectos');
    } catch (err) {
      setConfirmando(false);
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proyecto');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <div className="card h-96 animate-pulse" />;

  const avisos = revisarProyecto({ ...form, coverAlt: form.coverAlt ?? '' });

  const campo = (
    key: 'company' | 'community' | 'location',
    etiqueta: string,
    placeholder: string,
    ayuda?: string,
  ) => (
    <div>
      <label htmlFor={key} className="label">
        {etiqueta} {obligatorio}
      </label>
      <input
        id={key}
        required
        value={form[key]}
        onChange={(e) => actualizar(key, e.target.value)}
        className="input"
        placeholder={placeholder}
      />
      {ayuda && <p className="hint">{ayuda}</p>}
    </div>
  );

  const botonChico =
    'flex h-8 w-8 items-center justify-center rounded-md border border-silver-200 bg-white text-slate-700 hover:bg-silver-100 disabled:opacity-30';

  return (
    <form onSubmit={revisar} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/proyectos" className="text-sm font-bold text-brand-700 hover:text-brand-900">
            ← Volver a proyectos
          </Link>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            {esNuevo ? 'Nuevo proyecto' : form.title || 'Editar proyecto'}
          </h2>
        </div>

        {/* Cómo se muestra en la web: a la vista, junto al botón de guardar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 rounded-lg border border-silver-200 bg-white px-3 py-2 text-sm font-bold text-slate-900">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => actualizar('isPublished', e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            Publicado en la web
          </label>
          <label
            title="El número más bajo sale primero. Los 6 primeros aparecen en el inicio."
            className="flex items-center gap-2 rounded-lg border border-silver-200 bg-white py-1 pl-3 pr-1 text-sm font-bold text-slate-900"
          >
            Posición
            <input
              type="number"
              min={0}
              value={form.position}
              onChange={(e) => actualizar('position', Number(e.target.value))}
              className="w-16 rounded-md border border-silver-200 px-2 py-1 text-sm font-semibold"
            />
          </label>
          <button type="submit" disabled={guardando} className="btn-primary">
            {esNuevo ? 'Crear proyecto' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* ── Paso 1: empresa y comunidad (lo que se lee en la tarjeta) ── */}
          <Paso numero={1} titulo="Empresa, comunidad y ubicación">
            <p className="hint -mt-1">
              En la tarjeta de la web se ve así, al centro: la empresa arriba, una raya, la
              comunidad y debajo la ubicación.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              {campo('company', 'Empresa (minera u otra)', 'Compañía Minera Raura S.A.')}
              {campo(
                'community',
                'Comunidad o empresa comunal',
                'Comunidad Campesina de Quichas',
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {campo('location', 'Ubicación (distrito y provincia)', 'Oyón, Lima')}
              <div>
                <label htmlFor="region" className="label">
                  Región {obligatorio}
                </label>
                <select
                  id="region"
                  required
                  value={form.region}
                  onChange={(e) => actualizar('region', e.target.value)}
                  className="input"
                >
                  <option value="" disabled>
                    Elige una región
                  </option>
                  {PERU_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <p className="hint">Suma a las “regiones atendidas” del inicio.</p>
              </div>
            </div>
          </Paso>

          {/* ── Paso 2: título, foto y descripción (la página del proyecto) ── */}
          <Paso numero={2} titulo="Título, foto y descripción">
            <div>
              <label htmlFor="title" className="label">
                Título de la página {obligatorio}
              </label>
              <input
                id="title"
                required
                value={form.title}
                onChange={(e) => actualizar('title', e.target.value)}
                className="input text-lg font-bold"
                placeholder="Minera Raura y la Comunidad Campesina de Quichas"
              />
              <p className="hint">
                Es el título grande de la página del proyecto y el que muestra Google.
              </p>
            </div>

            <div className="grid gap-5 rounded-xl border border-silver-200 bg-silver-100/60 p-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="label">Foto del proyecto {obligatorio}</p>
                <SubidorArchivo
                  kind="IMAGE"
                  media={form.coverImage}
                  onUploaded={(media) =>
                    setForm((prev) => ({
                      ...prev,
                      coverImage: media,
                      coverAlt: prev.coverAlt || media.alt || '',
                    }))
                  }
                  onClear={() => actualizar('coverImage', null)}
                />
                <div>
                  <label htmlFor="coverAlt" className="label">
                    ¿Qué se ve en la foto? {obligatorio}
                  </label>
                  <input
                    id="coverAlt"
                    value={form.coverAlt ?? ''}
                    onChange={(e) => actualizar('coverAlt', e.target.value)}
                    maxLength={300}
                    className="input"
                    placeholder="Dirigentes reunidos en una mesa de diálogo"
                  />
                  <p className="hint">Una frase corta. Google la lee porque no puede ver fotos.</p>
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="objective" className="label">
                  Descripción {obligatorio}
                </label>
                <textarea
                  id="objective"
                  required
                  value={form.objective}
                  onChange={(e) => actualizar('objective', e.target.value)}
                  className="input min-h-40 flex-1 resize-y"
                  placeholder="Asesoría para el fortalecimiento de la gestión comunal y acompañamiento en mesas de diálogo con la empresa."
                />
              </div>
            </div>
          </Paso>

          {/* ── Paso 3: trabajos realizados ── */}
          <Paso numero={3} titulo="Trabajos realizados">
            <p className="hint -mt-1">
              Cada trabajo se muestra en la página del proyecto con su ícono, su título y su
              descripción. Usa las flechas para cambiar el orden.
            </p>
            <ol ref={listaTrabajos} className="space-y-3">
              {form.items.map((trabajo, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-silver-200 bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        aria-label={`Título del trabajo ${i + 1}`}
                        value={trabajo.title}
                        onChange={(e) => cambiarTrabajo(i, 'title', e.target.value)}
                        maxLength={160}
                        className="input font-bold"
                        placeholder="Mesas de diálogo y negociación"
                      />
                      <textarea
                        aria-label={`Descripción del trabajo ${i + 1}`}
                        value={trabajo.description}
                        onChange={(e) => cambiarTrabajo(i, 'description', e.target.value)}
                        maxLength={800}
                        className="input min-h-20 resize-y"
                        placeholder="Acompañamiento en mesas de diálogo y procesos de negociación con la empresa."
                      />
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moverTrabajo(i, -1)}
                        disabled={i === 0}
                        aria-label={`Subir el trabajo ${i + 1}`}
                        className={botonChico}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moverTrabajo(i, 1)}
                        disabled={i === form.items.length - 1}
                        aria-label={`Bajar el trabajo ${i + 1}`}
                        className={botonChico}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => quitarTrabajo(i)}
                        aria-label={`Quitar el trabajo ${i + 1}`}
                        className={`${botonChico} text-red-700 hover:bg-red-50`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" onClick={agregarTrabajo} className="btn-secondary">
              + Agregar trabajo
            </button>
          </Paso>

          <div className="flex justify-end">
            <button type="submit" disabled={guardando} className="btn-primary">
              {esNuevo ? 'Crear proyecto' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {/* ── Revisión SEO, a la vista mientras se completa ── */}
        <aside className="min-w-0">
          <div className="space-y-4 xl:sticky xl:top-20">
            <SaludSeo
              avisos={avisos}
              detalle={
                <>
                  Se muestra en la página <strong>Proyectos</strong> y, si está entre los 6
                  primeros, en el inicio.
                </>
              }
              textoListo="¡Todo listo! El proyecto está completo para mostrarse en la web."
            />
          </div>
        </aside>
      </div>

      <ConfirmModal
        abierto={confirmando}
        titulo={esNuevo ? '¿Crear este proyecto?' : '¿Guardar los cambios?'}
        mensaje={
          <>
            <strong>{form.title}</strong>{' '}
            {form.isPublished
              ? esNuevo
                ? 'se publicará en la web.'
                : 'se actualizará en la web.'
              : 'quedará guardado, pero oculto en la web.'}
          </>
        }
        textoConfirmar={esNuevo ? 'Sí, crear' : 'Sí, guardar'}
        tono={form.isPublished ? 'publicar' : 'aviso'}
        ocupado={guardando}
        onConfirmar={() => void guardar()}
        onCancelar={() => setConfirmando(false)}
      />
    </form>
  );
}
