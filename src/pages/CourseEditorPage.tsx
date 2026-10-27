import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SubidorArchivo } from '@/components/BlockEditor';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ListaEditable } from '@/components/ListaEditable';
import { Paso } from '@/components/Paso';
import { SaludSeo, VistaGoogle } from '@/components/SeoPanel';
import { coursesApi, settingsApi, type CoursePayload } from '@/lib/api';
import { slugify } from '@/lib/format';
import { descripcionCurso, revisarCurso, tituloCurso } from '@/lib/seo-reglas';
import type { CourseMode, MediaDTO } from '@/lib/types';

/** El slug no se muestra: se genera del nombre. El precio se escribe como texto. */
type Formulario = Omit<CoursePayload, 'coverImageId' | 'slug' | 'price'> & {
  coverImage: MediaDTO | null;
  price: string;
};

const VACIO: Formulario = {
  name: '',
  summary: '',
  duration: '',
  lectiveHours: 24,
  modality: 'En vivo por Zoom',
  mode: 'ONLINE',
  material: 'Material digital descargable',
  certificate: 'Certificado del ICGC',
  audience: '',
  topics: [''],
  objective: '',
  instructor: '',
  comingSoon: false,
  price: '',
  coverImage: null,
  coverAlt: '',
  position: 0,
  isPublished: true,
};

const MODOS: { valor: CourseMode; etiqueta: string }[] = [
  { valor: 'ONLINE', etiqueta: 'Virtual' },
  { valor: 'ONSITE', etiqueta: 'Presencial' },
  { valor: 'BLENDED', etiqueta: 'Semipresencial' },
];

const opcional = <span className="font-medium text-slate-700">(opcional)</span>;
const obligatorio = <span className="text-red-600">*</span>;

/** Crear o editar un curso. "nuevo" en la URL = crear. */
export function CourseEditorPage() {
  const { id } = useParams();
  const esNuevo = !id || id === 'nuevo';
  const navigate = useNavigate();

  const [form, setForm] = useState<Formulario>(VACIO);
  const [cargando, setCargando] = useState(!esNuevo);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState('');
  const [sitio, setSitio] = useState<{ nombre: string; logo: string | null }>({
    nombre: 'Instituto de Capacitación en Gestión Comunal',
    logo: null,
  });

  // Nombre y logo del sitio para la vista previa de Google
  useEffect(() => {
    settingsApi
      .get()
      .then((s) => setSitio({ nombre: s.siteName, logo: s.logo?.url ?? null }))
      .catch(() => {
        // Sin ajustes, la vista previa usa las iniciales
      });
  }, []);

  useEffect(() => {
    if (esNuevo) return;
    coursesApi
      .get(id!)
      .then(({ slug: _slug, ...c }) =>
        setForm({
          ...c,
          coverAlt: c.coverAlt ?? '',
          objective: c.objective ?? '',
          instructor: c.instructor ?? '',
          price: c.price == null ? '' : String(c.price),
          topics: c.topics.length ? c.topics : [''],
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el curso'))
      .finally(() => setCargando(false));
  }, [id, esNuevo]);

  const actualizar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  /** Primero se revisa lo obligatorio; si está todo, se pide confirmación. */
  function revisar(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!form.topics.some((t) => t.trim())) {
      setError('Agrega al menos un tema en "Contenido del programa".');
      return;
    }
    if (!(Number(form.price.trim().replace(',', '.')) > 0)) {
      setError('Indica el precio del curso.');
      return;
    }
    if (form.isPublished && !form.coverImage) {
      setError('Sube la foto del curso antes de publicarlo.');
      return;
    }
    if (form.isPublished && !form.coverAlt?.trim()) {
      setError('Escribe qué se ve en la foto antes de publicarlo.');
      return;
    }
    setConfirmando(true);
  }

  async function guardar() {
    const { coverImage, price, ...resto } = form;
    const precio = price.trim().replace(',', '.');
    const payload: CoursePayload = {
      ...resto,
      // La dirección del curso sale del nombre; nadie tiene que escribirla
      slug: slugify(form.name),
      price: precio ? Number(precio) : null,
      coverImageId: coverImage?.id ?? null,
      coverAlt: form.coverAlt?.trim() || null,
      topics: form.topics.map((t) => t.trim()).filter(Boolean),
    };

    setGuardando(true);
    try {
      if (esNuevo) await coursesApi.create(payload);
      else await coursesApi.update(id!, payload);
      navigate('/cursos');
    } catch (err) {
      setConfirmando(false);
      setError(err instanceof Error ? err.message : 'No se pudo guardar el curso');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <div className="card h-96 animate-pulse" />;

  const avisos = revisarCurso({
    ...form,
    coverAlt: form.coverAlt ?? '',
    objective: form.objective ?? '',
  });

  return (
    <form onSubmit={revisar} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/cursos" className="text-sm font-bold text-brand-700 hover:text-brand-900">
            ← Volver a cursos
          </Link>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            {esNuevo ? 'Nuevo curso' : form.name || 'Editar curso'}
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
          <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
            <input
              type="checkbox"
              checked={form.comingSoon}
              onChange={(e) => actualizar('comingSoon', e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            Próximamente
          </label>
          <label
            title="El número más bajo sale primero"
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
            {esNuevo ? 'Crear curso' : 'Guardar cambios'}
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
        {/* ── Paso 1: lo primero que ve la gente ── */}
        <Paso numero={1} titulo="Nombre, foto y descripción">
          <div>
            <label htmlFor="name" className="label">
              Nombre del curso {obligatorio}
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => actualizar('name', e.target.value)}
              className="input text-lg font-bold"
              placeholder="Gestión y organización comunal"
            />
          </div>

          <div className="grid gap-5 rounded-xl border border-silver-200 bg-silver-100/60 p-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="label">Foto del curso {obligatorio}</p>
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
                  placeholder="Dirigentes comunales en un taller"
                />
                <p className="hint">Una frase corta. Google la lee porque no puede ver fotos.</p>
              </div>
            </div>

            <div className="flex flex-col">
              <label htmlFor="summary" className="label">
                Descripción del curso {obligatorio}
              </label>
              <textarea
                id="summary"
                required
                minLength={20}
                maxLength={600}
                value={form.summary}
                onChange={(e) => actualizar('summary', e.target.value)}
                className="input min-h-40 flex-1 resize-y"
                placeholder="De qué trata el curso, en dos o tres líneas."
              />
              <p className="hint">{form.summary.length}/600 letras</p>
            </div>
          </div>
        </Paso>

        {/* ── Paso 2: datos prácticos ── */}
        <Paso numero={2} titulo="Datos del curso">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="price" className="label">
                Precio {obligatorio}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-slate-700">
                  S/
                </span>
                <input
                  id="price"
                  required
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => actualizar('price', e.target.value.replace(/[^\d.,]/g, ''))}
                  className="input pl-9"
                  placeholder="150.00"
                />
              </div>
              <p className="hint">En soles. Se ve en la tarjeta y en la página del curso.</p>
            </div>
            <div>
              <label htmlFor="lectiveHours" className="label">
                Horas lectivas {obligatorio}
              </label>
              <input
                id="lectiveHours"
                type="number"
                min={1}
                required
                value={form.lectiveHours}
                onChange={(e) => actualizar('lectiveHours', Number(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="duration" className="label">
                Duración {obligatorio}
              </label>
              <input
                id="duration"
                required
                value={form.duration}
                onChange={(e) => actualizar('duration', e.target.value)}
                className="input"
                placeholder="8 semanas"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="mode" className="label">Modalidad</label>
              <select
                id="mode"
                value={form.mode}
                onChange={(e) => actualizar('mode', e.target.value as CourseMode)}
                className="input"
              >
                {MODOS.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="modality" className="label">Cómo se dicta</label>
              <input
                id="modality"
                required
                value={form.modality}
                onChange={(e) => actualizar('modality', e.target.value)}
                className="input"
                placeholder="En vivo por Zoom"
              />
            </div>
          </div>

          <div>
            <label htmlFor="audience" className="label">
              Dirigido a {obligatorio}
            </label>
            <input
              id="audience"
              required
              value={form.audience}
              onChange={(e) => actualizar('audience', e.target.value)}
              className="input"
              placeholder="Dirigentes en ejercicio y comuneros empadronados"
            />
          </div>

          <div>
            <label htmlFor="objective" className="label">
              ¿Para qué le sirve al alumno? {opcional}
            </label>
            <textarea
              id="objective"
              rows={2}
              value={form.objective ?? ''}
              onChange={(e) => actualizar('objective', e.target.value)}
              className="input resize-y"
              placeholder="Al terminar podrá llevar el libro de actas y el padrón comunal sin observaciones."
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="instructor" className="label">
                Profesor {opcional}
              </label>
              <input
                id="instructor"
                value={form.instructor ?? ''}
                onChange={(e) => actualizar('instructor', e.target.value)}
                className="input"
                placeholder="Nombre del docente"
              />
            </div>
            <div>
              <label htmlFor="material" className="label">Material</label>
              <input
                id="material"
                required
                value={form.material}
                onChange={(e) => actualizar('material', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="certificate" className="label">Certificado</label>
              <input
                id="certificate"
                required
                value={form.certificate}
                onChange={(e) => actualizar('certificate', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </Paso>

        {/* ── Paso 3: temario ── */}
        <Paso numero={3} titulo="Contenido del programa">
          <ListaEditable
            id="topics"
            etiqueta="Temas del curso"
            obligatoria
            items={form.topics}
            onChange={(items) => actualizar('topics', items)}
            placeholder="Escribe un tema"
            ayuda="Un tema por línea. Enter agrega otro."
          />
        </Paso>

        <div className="flex justify-end">
          <button type="submit" disabled={guardando} className="btn-primary">
            {esNuevo ? 'Crear curso' : 'Guardar cambios'}
          </button>
        </div>
        </div>

        {/* ── Revisión SEO, a la vista mientras se completa ── */}
        <aside className="min-w-0">
          <div className="space-y-4 xl:sticky xl:top-20">
            <section className="card space-y-3 p-5">
              <h3 className="text-base font-extrabold text-slate-900">Así se verá en Google</h3>
              <VistaGoogle
                titulo={tituloCurso(form.name)}
                descripcion={descripcionCurso(form)}
                slug={slugify(form.name)}
                busqueda={form.name ? `curso de ${form.name.toLowerCase()}` : ''}
                nombreSitio={sitio.nombre}
                logoUrl={sitio.logo}
                ruta="cursos"
              />
              <p className="hint">
                El título y el texto se arman solos con el nombre y la descripción del curso.
              </p>
            </section>
            <SaludSeo
              avisos={avisos}
              detalle={
                <>
                  La descripción tiene <strong>{form.summary.trim().length}</strong> letras.
                </>
              }
              textoListo="¡Todo listo! El curso está perfecto para que lo encuentren en Google."
            />
          </div>
        </aside>
      </div>

      <ConfirmModal
        abierto={confirmando}
        titulo={esNuevo ? '¿Crear este curso?' : '¿Guardar los cambios?'}
        mensaje={
          <>
            <strong>{form.name}</strong>{' '}
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
