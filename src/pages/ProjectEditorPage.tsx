import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SubidorArchivo } from '@/components/BlockEditor';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ListaEditable } from '@/components/ListaEditable';
import { Paso } from '@/components/Paso';
import { SaludSeo } from '@/components/SeoPanel';
import { projectsApi, type ProjectPayload } from '@/lib/api';
import { slugify } from '@/lib/format';
import { revisarProyecto } from '@/lib/seo-reglas';
import {
  PERU_REGIONS,
  PROJECT_STATUS_LABELS,
  type MediaDTO,
  type ProjectStatus,
} from '@/lib/types';

/** El slug no se muestra: se genera del título. */
type Formulario = Omit<ProjectPayload, 'coverImageId' | 'slug' | 'latitude' | 'longitude'> & {
  coverImage: MediaDTO | null;
  // Como texto para permitir escribir "-10.68" sin que el input lo borre
  latitude: string;
  longitude: string;
};

const VACIO: Formulario = {
  title: '',
  duration: '',
  status: 'IN_PROGRESS',
  capital: '',
  location: '',
  community: '',
  implementingEntity: '',
  area: '',
  objective: '',
  achievements: [''],
  communitiesBenefited: 1,
  region: '',
  latitude: '',
  longitude: '',
  coverImage: null,
  coverAlt: '',
  position: 0,
  isPublished: true,
};

const opcional = <span className="font-medium text-slate-700">(opcional)</span>;
const obligatorio = <span className="text-red-600">*</span>;

/** Convierte el texto del input en número; vacío = null. Acepta coma decimal. */
const aNumero = (texto: string): number | null => {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
};

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

  useEffect(() => {
    if (esNuevo) return;
    projectsApi
      .get(id!)
      .then(({ slug: _slug, ...p }) =>
        setForm({
          ...p,
          coverAlt: p.coverAlt ?? '',
          achievements: p.achievements.length ? p.achievements : [''],
          latitude: p.latitude?.toString() ?? '',
          longitude: p.longitude?.toString() ?? '',
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el proyecto'))
      .finally(() => setCargando(false));
  }, [id, esNuevo]);

  const actualizar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  /** Pegar "-10.6864, -76.2567" (como lo copia Google Maps) llena ambos campos. */
  function pegarCoordenadas(event: React.ClipboardEvent<HTMLInputElement>) {
    const texto = event.clipboardData.getData('text');
    const partes = texto.split(',').map((t) => t.trim());
    if (partes.length === 2 && partes.every((t) => aNumero(t) !== null)) {
      event.preventDefault();
      setForm((prev) => ({ ...prev, latitude: partes[0]!, longitude: partes[1]! }));
    }
  }

  /** Primero se revisa lo obligatorio; si está todo, se pide confirmación. */
  function revisar(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if ((aNumero(form.latitude) === null) !== (aNumero(form.longitude) === null)) {
      setError('Completa los dos números de la ubicación en el mapa, o deja ambos vacíos.');
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
      latitude: aNumero(form.latitude),
      longitude: aNumero(form.longitude),
      coverImageId: coverImage?.id ?? null,
      coverAlt: form.coverAlt?.trim() || null,
      achievements: form.achievements.map((t) => t.trim()).filter(Boolean),
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
    key: 'duration' | 'capital' | 'location' | 'community' | 'implementingEntity' | 'area',
    etiqueta: string,
    placeholder: string,
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
    </div>
  );

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
            title="El número más bajo sale primero. Los 4 primeros aparecen en el inicio."
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
        {/* ── Paso 1: lo primero que ve la gente ── */}
        <Paso numero={1} titulo="Título, foto y objetivo">
          <div>
            <label htmlFor="title" className="label">
              Título del proyecto {obligatorio}
            </label>
            <input
              id="title"
              required
              value={form.title}
              onChange={(e) => actualizar('title', e.target.value)}
              className="input text-lg font-bold"
              placeholder="Sistema de riego tecnificado en la comunidad de..."
            />
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
                  placeholder="Canal de riego construido en la ladera"
                />
                <p className="hint">Una frase corta. Google la lee porque no puede ver fotos.</p>
              </div>
            </div>

            <div className="flex flex-col">
              <label htmlFor="objective" className="label">
                ¿Qué busca el proyecto? {obligatorio}
              </label>
              <textarea
                id="objective"
                required
                value={form.objective}
                onChange={(e) => actualizar('objective', e.target.value)}
                className="input min-h-40 flex-1 resize-y"
                placeholder="Mejorar el riego de 320 hectáreas para que las familias produzcan todo el año."
              />
            </div>
          </div>
        </Paso>

        {/* ── Paso 2: datos ── */}
        <Paso numero={2} titulo="Datos del proyecto">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="status" className="label">
                Estado
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => actualizar('status', e.target.value as ProjectStatus)}
                className="input"
              >
                {Object.entries(PROJECT_STATUS_LABELS).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </div>
            {campo('duration', 'Duración', '18 meses')}
            {campo('capital', 'Inversión', 'S/ 2 450 000')}
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {campo('community', 'Comunidad', 'Comunidad campesina de ...')}
            {campo('implementingEntity', 'Quién lo ejecuta', 'Municipalidad distrital de ...')}
            {campo('area', 'Área', '320 hectáreas')}
          </div>
        </Paso>

        {/* ── Paso 3: mapa ── */}
        <Paso numero={3} titulo="¿Dónde está?">
          <div className="grid gap-5 sm:grid-cols-3">
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
            </div>
            {campo('location', 'Distrito y provincia', 'Chaupimarca, Pasco')}
            <div>
              <label htmlFor="communitiesBenefited" className="label">
                Comunidades beneficiadas
              </label>
              <input
                id="communitiesBenefited"
                type="number"
                min={0}
                value={form.communitiesBenefited}
                onChange={(e) => actualizar('communitiesBenefited', Number(e.target.value))}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="latitude" className="label">
              Punto exacto en el mapa {opcional}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                id="latitude"
                aria-label="Latitud"
                inputMode="decimal"
                value={form.latitude}
                onChange={(e) => actualizar('latitude', e.target.value)}
                onPaste={pegarCoordenadas}
                className="input"
                placeholder="Latitud: -10.6864"
              />
              <input
                id="longitude"
                aria-label="Longitud"
                inputMode="decimal"
                value={form.longitude}
                onChange={(e) => actualizar('longitude', e.target.value)}
                onPaste={pegarCoordenadas}
                className="input"
                placeholder="Longitud: -76.2567"
              />
            </div>
            <p className="hint">
              En Google Maps, clic derecho sobre el lugar, copia los números y pégalos aquí. Si lo
              dejas vacío, se marca el centro de la región.
            </p>
          </div>
        </Paso>

        {/* ── Paso 4: avances ── */}
        <Paso numero={4} titulo="Avances y logros">
          <ListaEditable
            id="achievements"
            etiqueta="Logros del proyecto"
            items={form.achievements}
            onChange={(items) => actualizar('achievements', items)}
            placeholder="65 % de avance en canales y reservorios"
            ayuda="Un logro por línea. Enter agrega otro."
          />
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
                  Se muestra en la página <strong>Proyectos</strong>, en el mapa y en el inicio.
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
