import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FotoConAlt } from '@/components/FotoConAlt';
import { ListaEditable } from '@/components/ListaEditable';
import { coursesApi, type CoursePayload } from '@/lib/api';
import type { CourseMode, MediaDTO } from '@/lib/types';

type Formulario = Omit<CoursePayload, 'coverImageId'> & { coverImage: MediaDTO | null };

const VACIO: Formulario = {
  name: '',
  slug: '',
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

/** Crear o editar un curso. "nuevo" en la URL = crear. */
export function CourseEditorPage() {
  const { id } = useParams();
  const esNuevo = !id || id === 'nuevo';
  const navigate = useNavigate();

  const [form, setForm] = useState<Formulario>(VACIO);
  const [cargando, setCargando] = useState(!esNuevo);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (esNuevo) return;
    coursesApi
      .get(id!)
      .then((c) =>
        setForm({
          ...c,
          coverAlt: c.coverAlt ?? '',
          objective: c.objective ?? '',
          instructor: c.instructor ?? '',
          topics: c.topics.length ? c.topics : [''],
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el curso'))
      .finally(() => setCargando(false));
  }, [id, esNuevo]);

  const actualizar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    const { coverImage, ...resto } = form;
    const payload: CoursePayload = {
      ...resto,
      coverImageId: coverImage?.id ?? null,
      coverAlt: form.coverAlt?.trim() || null,
      topics: form.topics.map((t) => t.trim()).filter(Boolean),
    };

    if (payload.topics.length === 0) {
      setError('Agrega al menos un tema al contenido del programa.');
      return;
    }

    setGuardando(true);
    try {
      if (esNuevo) await coursesApi.create(payload);
      else await coursesApi.update(id!, payload);
      navigate('/cursos');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el curso');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <div className="card h-96 animate-pulse" />;

  return (
    <form onSubmit={guardar} className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/cursos" className="text-sm font-medium text-brand-600 hover:text-brand-800">
            ← Volver a cursos
          </Link>
          <h2 className="mt-1 text-lg font-bold text-brand-900">
            {esNuevo ? 'Nuevo curso' : `Editar: ${form.name || 'curso'}`}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* La web muestra el aviso "¡Próximamente!" en la tarjeta y la ficha */}
          <label className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            <input
              type="checkbox"
              checked={form.comingSoon}
              onChange={(e) => actualizar('comingSoon', e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            Próximamente
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => actualizar('isPublished', e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            Publicado en la web
          </label>
          <button type="submit" disabled={guardando} className="btn-primary">
            {guardando ? 'Guardando...' : 'Guardar curso'}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ── Datos principales ── */}
      <section className="card space-y-5 p-5">
        <h3 className="text-sm font-bold text-brand-900">Datos del curso</h3>

        <div>
          <label htmlFor="name" className="label">
            Nombre del curso <span className="text-red-500">*</span>
          </label>
          <input id="name" required value={form.name} onChange={(e) => actualizar('name', e.target.value)} className="input" placeholder="Gestión y organización comunal" />
        </div>

        <div>
          <label htmlFor="summary" className="label">
            Resumen <span className="text-red-500">*</span>
          </label>
          <textarea id="summary" required rows={3} value={form.summary} onChange={(e) => actualizar('summary', e.target.value)} className="input" placeholder="De qué trata el curso, en dos o tres líneas." />
          <p className="hint">{form.summary.length}/600 caracteres. Se muestra en /cursos y Google lo usa como descripción del curso.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="lectiveHours" className="label">
              Horas lectivas <span className="text-red-500">*</span>
            </label>
            <input id="lectiveHours" type="number" min={1} required value={form.lectiveHours} onChange={(e) => actualizar('lectiveHours', Number(e.target.value))} className="input" />
          </div>
          <div>
            <label htmlFor="duration" className="label">
              Duración <span className="text-red-500">*</span>
            </label>
            <input id="duration" required value={form.duration} onChange={(e) => actualizar('duration', e.target.value)} className="input" placeholder="8 semanas" />
          </div>
          <div>
            <label htmlFor="mode" className="label">Tipo de modalidad</label>
            <select id="mode" value={form.mode} onChange={(e) => actualizar('mode', e.target.value as CourseMode)} className="input">
              {MODOS.map((m) => (
                <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="modality" className="label">Cómo se dicta</label>
            <input id="modality" required value={form.modality} onChange={(e) => actualizar('modality', e.target.value)} className="input" placeholder="En vivo por Zoom" />
          </div>
          <div>
            <label htmlFor="material" className="label">Material</label>
            <input id="material" required value={form.material} onChange={(e) => actualizar('material', e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="certificate" className="label">Certificado</label>
            <input id="certificate" required value={form.certificate} onChange={(e) => actualizar('certificate', e.target.value)} className="input" />
          </div>
        </div>

        <div>
          <label htmlFor="audience" className="label">
            Dirigido a <span className="text-red-500">*</span>
          </label>
          <input id="audience" required value={form.audience} onChange={(e) => actualizar('audience', e.target.value)} className="input" placeholder="Dirigentes en ejercicio y comuneros empadronados" />
        </div>

        <div>
          <label htmlFor="objective" className="label">¿Para qué te sirve?</label>
          <textarea id="objective" rows={3} value={form.objective ?? ''} onChange={(e) => actualizar('objective', e.target.value)} className="input" placeholder="Al terminar podrás llevar el libro de actas y el padrón comunal sin observaciones..." />
          <p className="hint">Opcional. Se muestra en la ficha del curso en /cursos.</p>
        </div>

        <div>
          <label htmlFor="instructor" className="label">Dictado por</label>
          <input id="instructor" value={form.instructor ?? ''} onChange={(e) => actualizar('instructor', e.target.value)} className="input" placeholder="Nombre del docente o del equipo a cargo" />
          <p className="hint">Opcional. Si lo dejas vacío no aparece en la web.</p>
        </div>
      </section>

      {/* ── Contenido del programa ── */}
      <section className="card p-5">
        <ListaEditable
          id="topics"
          etiqueta="Contenido del programa"
          obligatoria
          items={form.topics}
          onChange={(items) => actualizar('topics', items)}
          placeholder="Tema del programa"
          ayuda="Agrega tantos temas como tenga el curso. Enter crea el siguiente; las flechas cambian el orden."
        />
      </section>

      {/* ── Foto ── */}
      <section className="card space-y-4 p-5">
        <h3 className="text-sm font-bold text-brand-900">
          Foto del curso <span className="text-red-500">*</span>
        </h3>
        <FotoConAlt
          id="coverAlt"
          media={form.coverImage}
          alt={form.coverAlt ?? ''}
          onMedia={(m) => actualizar('coverImage', m)}
          onAlt={(alt) => actualizar('coverAlt', alt)}
          placeholder="Dirigentes comunales en un taller de capacitación"
        />
      </section>

      {/* ── Orden y URL ── */}
      <section className="card grid gap-5 p-5 sm:grid-cols-2">
        <div>
          <label htmlFor="position" className="label">Orden en la web</label>
          <input id="position" type="number" min={0} value={form.position} onChange={(e) => actualizar('position', Number(e.target.value))} className="input" />
          <p className="hint">Los números más bajos aparecen primero.</p>
        </div>
        <div>
          <label htmlFor="slug" className="label">Identificador en la URL</label>
          <input id="slug" value={form.slug} onChange={(e) => actualizar('slug', e.target.value)} className="input font-mono" placeholder="se genera del nombre" />
          <p className="hint">/cursos#{form.slug || 'nombre-del-curso'}</p>
        </div>
      </section>
    </form>
  );
}
