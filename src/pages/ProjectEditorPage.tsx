import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FotoConAlt } from '@/components/FotoConAlt';
import { ListaEditable } from '@/components/ListaEditable';
import { projectsApi, type ProjectPayload } from '@/lib/api';
import {
  PERU_REGIONS,
  PROJECT_STATUS_LABELS,
  type MediaDTO,
  type ProjectStatus,
} from '@/lib/types';

type Formulario = Omit<ProjectPayload, 'coverImageId' | 'latitude' | 'longitude'> & {
  coverImage: MediaDTO | null;
  // Como texto para permitir escribir "-10.68" sin que el input lo borre
  latitude: string;
  longitude: string;
};

const VACIO: Formulario = {
  title: '',
  slug: '',
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
  const [error, setError] = useState('');

  useEffect(() => {
    if (esNuevo) return;
    projectsApi
      .get(id!)
      .then((p) =>
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

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    const latitude = aNumero(form.latitude);
    const longitude = aNumero(form.longitude);
    if ((latitude === null) !== (longitude === null)) {
      setError('Completa la latitud y la longitud, o deja ambas vacías.');
      return;
    }

    const { coverImage, ...resto } = form;
    const payload: ProjectPayload = {
      ...resto,
      latitude,
      longitude,
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
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proyecto');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <div className="card h-96 animate-pulse" />;

  const campo = (
    key: 'duration' | 'capital' | 'location' | 'community' | 'implementingEntity' | 'area',
    etiqueta: string,
    placeholder: string,
  ) => (
    <div>
      <label htmlFor={key} className="label">
        {etiqueta} <span className="text-red-500">*</span>
      </label>
      <input id={key} required value={form[key]} onChange={(e) => actualizar(key, e.target.value)} className="input" placeholder={placeholder} />
    </div>
  );

  return (
    <form onSubmit={guardar} className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/proyectos" className="text-sm font-medium text-brand-600 hover:text-brand-800">
            ← Volver a proyectos
          </Link>
          <h2 className="mt-1 text-lg font-bold text-brand-900">
            {esNuevo ? 'Nuevo proyecto' : `Editar: ${form.title || 'proyecto'}`}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => actualizar('isPublished', e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Publicado en la web
          </label>
          <button type="submit" disabled={guardando} className="btn-primary">
            {guardando ? 'Guardando...' : 'Guardar proyecto'}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ── Datos ── */}
      <section className="card space-y-5 p-5">
        <h3 className="text-sm font-bold text-brand-900">Datos del proyecto</h3>

        <div>
          <label htmlFor="title" className="label">
            Título del proyecto <span className="text-red-500">*</span>
          </label>
          <input id="title" required value={form.title} onChange={(e) => actualizar('title', e.target.value)} className="input" placeholder="Instalación del sistema de riego tecnificado en..." />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {campo('duration', 'Duración', '18 meses (marzo 2025 – agosto 2026)')}
          <div>
            <label htmlFor="status" className="label">Estado</label>
            <select id="status" value={form.status} onChange={(e) => actualizar('status', e.target.value as ProjectStatus)} className="input">
              {Object.entries(PROJECT_STATUS_LABELS).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>{etiqueta}</option>
              ))}
            </select>
          </div>
          {campo('capital', 'Capital', 'S/ 2 450 000')}
          {campo('area', 'Área que abarca', '320 hectáreas de cultivo')}
          {campo('community', 'Comunidad', 'Comunidad campesina ...')}
          {campo('implementingEntity', 'Entidad implementadora', 'Municipalidad distrital de ...')}
        </div>

        <div>
          <label htmlFor="objective" className="label">
            Objetivo del proyecto <span className="text-red-500">*</span>
          </label>
          <textarea id="objective" required rows={3} value={form.objective} onChange={(e) => actualizar('objective', e.target.value)} className="input" />
        </div>
      </section>

      {/* ── Avances y logros ── */}
      <section className="card p-5">
        <ListaEditable
          id="achievements"
          etiqueta="Avances y logros"
          items={form.achievements}
          onChange={(items) => actualizar('achievements', items)}
          placeholder="65 % de avance físico en canales y reservorios"
          ayuda="Agrega tantos como quieras. Enter crea el siguiente; las flechas cambian el orden."
        />
      </section>

      {/* ── Ubicación y mapa ── */}
      <section className="card space-y-5 p-5">
        <div>
          <h3 className="text-sm font-bold text-brand-900">Ubicación y mapa</h3>
          <p className="mt-1 text-xs text-slate-500">
            La región y las comunidades beneficiadas se suman en el mapa “Nuestra huella en el Perú”
            y en las cifras del hero de la página de inicio.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="region" className="label">
              Región <span className="text-red-500">*</span>
            </label>
            <select id="region" required value={form.region} onChange={(e) => actualizar('region', e.target.value)} className="input">
              <option value="" disabled>Elige una región</option>
              {PERU_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          {campo('location', 'Ubicación (distrito, provincia)', 'Distrito de Chaupimarca, provincia de Pasco')}
          <div>
            <label htmlFor="communitiesBenefited" className="label">Comunidades beneficiadas</label>
            <input id="communitiesBenefited" type="number" min={0} value={form.communitiesBenefited} onChange={(e) => actualizar('communitiesBenefited', Number(e.target.value))} className="input" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="latitude" className="label">Latitud del marcador</label>
            <input id="latitude" inputMode="decimal" value={form.latitude} onChange={(e) => actualizar('latitude', e.target.value)} onPaste={pegarCoordenadas} className="input font-mono" placeholder="-10.6864" />
          </div>
          <div>
            <label htmlFor="longitude" className="label">Longitud del marcador</label>
            <input id="longitude" inputMode="decimal" value={form.longitude} onChange={(e) => actualizar('longitude', e.target.value)} onPaste={pegarCoordenadas} className="input font-mono" placeholder="-76.2567" />
          </div>
          <p className="hint -mt-3 sm:col-span-2">
            En Google Maps haz clic derecho sobre el lugar y copia las coordenadas; pégalas aquí y se
            llenan los dos campos. Si las dejas vacías, el marcador va al centro de la región.
          </p>
        </div>
      </section>

      {/* ── Foto ── */}
      <section className="card space-y-4 p-5">
        <h3 className="text-sm font-bold text-brand-900">
          Foto de portada <span className="text-red-500">*</span>
        </h3>
        <FotoConAlt
          id="coverAlt"
          media={form.coverImage}
          alt={form.coverAlt ?? ''}
          onMedia={(m) => actualizar('coverImage', m)}
          onAlt={(alt) => actualizar('coverAlt', alt)}
          placeholder="Canal de riego construido en la ladera de la comunidad"
        />
      </section>

      {/* ── Orden y URL ── */}
      <section className="card grid gap-5 p-5 sm:grid-cols-2">
        <div>
          <label htmlFor="position" className="label">Orden en la web</label>
          <input id="position" type="number" min={0} value={form.position} onChange={(e) => actualizar('position', Number(e.target.value))} className="input" />
          <p className="hint">Los 4 primeros salen en las tarjetas giratorias del inicio.</p>
        </div>
        <div>
          <label htmlFor="slug" className="label">Identificador en la URL</label>
          <input id="slug" value={form.slug} onChange={(e) => actualizar('slug', e.target.value)} className="input font-mono" placeholder="se genera del título" />
          <p className="hint">/proyectos#{form.slug || 'titulo-del-proyecto'}</p>
        </div>
      </section>
    </form>
  );
}
