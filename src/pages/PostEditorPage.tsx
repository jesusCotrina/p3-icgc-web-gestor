import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BlockEditor, SubidorArchivo } from '@/components/BlockEditor';
import {
  Contador,
  DESC_MAX,
  DESC_MIN,
  SeoPanel,
  TITULO_MAX,
  VistaGoogle,
  textoParaGoogle,
  tituloParaGoogle,
} from '@/components/SeoPanel';
import { ApiError, categoriesApi, postsApi, settingsApi, type PostPayload } from '@/lib/api';
import { EncabezadoPaso, Paso } from '@/components/Paso';
import { slugify } from '@/lib/format';
import type { CategoryDTO, DraftBlock, MediaDTO, PostDTO, SeoAudit } from '@/lib/types';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000';

type Formulario = {
  title: string;
  /** Ya no se edita, pero se conserva si un artículo viejo lo tenía */
  subtitle: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  coverImageId: string | null;
  coverImage: MediaDTO | null;
  coverAlt: string;
  categoryId: string;
  tags: string;
  featured: boolean;
};

const VACIO: Formulario = {
  title: '',
  subtitle: '',
  slug: '',
  excerpt: '',
  metaTitle: '',
  metaDescription: '',
  focusKeyword: '',
  coverImageId: null,
  coverImage: null,
  coverAlt: '',
  categoryId: '',
  tags: '',
  featured: false,
};

/**
 * Editor de artículos pensado para quien no sabe de programación ni de SEO:
 * primero los datos generales, luego cómo se verá en Google y al final el
 * artículo, sin nada que interrumpa la escritura. La dirección (URL) se
 * arma sola con el título y todos los artículos se muestran en Google.
 */
export function PostEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const esNuevo = !id || id === 'nuevo';

  const [form, setForm] = useState<Formulario>(VACIO);
  const [blocks, setBlocks] = useState<DraftBlock[]>([]);
  const [categorias, setCategorias] = useState<CategoryDTO[]>([]);
  const [sitio, setSitio] = useState<{ nombre: string; logo: string | null }>({
    nombre: 'ICGC',
    logo: null,
  });
  const [estado, setEstado] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [audit, setAudit] = useState<SeoAudit | null>(null);
  const [cargando, setCargando] = useState(!esNuevo);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pestana, setPestana] = useState<'articulo' | 'revision'>('articulo');

  function actualizar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  // Categorías para el selector y el logo para la vista previa de Google
  useEffect(() => {
    categoriesApi
      .list()
      .then(setCategorias)
      .catch(() => setCategorias([]));
    settingsApi
      .get()
      .then((s) => setSitio({ nombre: s.siteName, logo: s.logo?.url ?? null }))
      .catch(() => {
        // Sin ajustes, la vista previa usa las iniciales
      });
  }, []);

  // Carga del artículo existente
  useEffect(() => {
    if (esNuevo) return;

    postsApi
      .get(id!)
      .then((post) => {
        setForm(aFormulario(post));
        setBlocks(aBloques(post));
        setEstado(post.status);
        setAudit(post.seo);
      })
      .catch((err) =>
        setAviso({
          tipo: 'error',
          texto: err instanceof Error ? err.message : 'No se pudo cargar el artículo',
        }),
      )
      .finally(() => setCargando(false));
  }, [id, esNuevo]);

  // La dirección se arma sola con el título. Una vez publicado ya no cambia:
  // cambiar la URL de un artículo que Google ya conoce le hace perder visitas.
  useEffect(() => {
    if (estado === 'PUBLISHED') return;
    setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
  }, [form.title, estado]);

  const guardar = useCallback(
    async (nuevoEstado: 'DRAFT' | 'PUBLISHED') => {
      setGuardando(true);
      setAviso(null);

      const payload: PostPayload = {
        title: form.title,
        subtitle: form.subtitle || null,
        slug: form.slug || undefined,
        excerpt: form.excerpt,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        focusKeyword: form.focusKeyword || null,
        coverImageId: form.coverImageId,
        coverAlt: form.coverAlt || null,
        categoryId: form.categoryId || null,
        featured: form.featured,
        // Todos los artículos se muestran en Google
        noindex: false,
        status: nuevoEstado,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        blocks: blocks.map((b) => ({
          type: b.type,
          text: b.text || null,
          level: b.type === 'HEADING' ? b.level : null,
          listStyle: b.type === 'LIST' ? b.listStyle : null,
          mediaId: b.mediaId,
          alt: b.alt || null,
          caption: b.caption || null,
          embedUrl: b.embedUrl || null,
        })),
      };

      try {
        const resultado = esNuevo
          ? await postsApi.create(payload)
          : await postsApi.update(id!, payload);

        setEstado(resultado.status);
        setAudit(null);
        setAviso({
          tipo: 'ok',
          texto:
            nuevoEstado === 'PUBLISHED'
              ? '¡Listo! El artículo ya se ve en la web.'
              : 'Borrador guardado. Todavía no se ve en la web.',
        });

        // Al crear, pasamos a la URL de edición para no duplicar el artículo
        if (esNuevo) navigate(`/blogs/${resultado.id}`, { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.details) {
          setAudit(err.details as SeoAudit);
          setPestana('revision');
          setAviso({
            tipo: 'error',
            texto: 'Todavía no se puede publicar: en "Revisión" te decimos qué falta.',
          });
        } else {
          setAviso({
            tipo: 'error',
            texto: err instanceof Error ? err.message : 'No se pudo guardar',
          });
        }
      } finally {
        setGuardando(false);
      }
    },
    [form, blocks, esNuevo, id, navigate],
  );

  if (cargando) {
    return (
      <div className="space-y-4" role="status" aria-label="Cargando artículo">
        <div className="card h-24 animate-pulse" />
        <div className="card h-96 animate-pulse" />
      </div>
    );
  }

  const dominio = SITE_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const tituloGoogle = tituloParaGoogle(form.title, form.metaTitle);
  const textoGoogle = textoParaGoogle(form.metaDescription, form.excerpt, blocks);

  return (
    <div className="space-y-5">
      {/* ── Barra de acciones ── */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <button type="button" onClick={() => navigate('/blogs')} className="btn-ghost btn-sm">
          ← Volver
        </button>

        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold text-slate-900">
            {esNuevo ? 'Nuevo blog' : form.title || 'Sin título'}
          </h2>
          <p className="text-sm font-semibold text-slate-800">
            {estado === 'PUBLISHED'
              ? 'Publicado: se ve en la web'
              : estado === 'DRAFT'
                ? 'Borrador: todavía no se ve en la web'
                : 'Archivado'}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!esNuevo && estado === 'PUBLISHED' && (
            <a
              href={`${SITE_URL}/blog/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm"
            >
              Ver en la web ↗
            </a>
          )}
          <button
            type="button"
            disabled={guardando || !form.title.trim()}
            onClick={() => void guardar('DRAFT')}
            className="btn-secondary"
          >
            {guardando ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            disabled={guardando || !form.title.trim()}
            onClick={() => void guardar('PUBLISHED')}
            className="btn-primary"
          >
            {estado === 'PUBLISHED' ? 'Guardar cambios' : 'Publicar'}
          </button>
        </div>
      </div>

      {aviso && (
        <p
          role="alert"
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            aviso.tipo === 'ok' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-800'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Columna principal ── */}
        <div className="min-w-0 space-y-5">
          {/* Pestañas (solo hasta xl; arriba de eso la revisión va al costado) */}
          <div className="flex gap-1.5 xl:hidden">
            {(['articulo', 'revision'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPestana(p)}
                aria-pressed={pestana === p}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${
                  pestana === p ? 'bg-brand-600 text-white' : 'bg-white text-slate-900'
                }`}
              >
                {p === 'articulo' ? 'Artículo' : 'Revisión'}
              </button>
            ))}
          </div>

          <div className={`space-y-5 ${pestana === 'revision' ? 'hidden xl:block' : ''}`}>
            {/* ── Paso 1: datos generales ── */}
            <Paso numero={1} titulo="Datos generales">
              <div>
                <label htmlFor="titulo" className="label">
                  Título del artículo <span className="text-red-600">*</span>
                </label>
                <input
                  id="titulo"
                  type="text"
                  value={form.title}
                  onChange={(e) => actualizar('title', e.target.value)}
                  placeholder="Qué es la gestión comunal y por qué importa"
                  className="input text-lg font-bold"
                />
                {form.slug && (
                  <p className="hint">
                    Dirección en la web:{' '}
                    <span className="font-semibold text-slate-900">
                      {dominio}/blog/{form.slug}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="resumen" className="label">
                  Resumen <span className="font-medium text-slate-700">(opcional)</span>
                </label>
                <textarea
                  id="resumen"
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => actualizar('excerpt', e.target.value)}
                  placeholder="Dos o tres líneas que cuenten de qué trata el artículo."
                  className="input resize-y"
                />
                <p className="hint">
                  Se ve en la lista del blog y al compartir el enlace. Si lo dejas vacío, usamos el
                  primer párrafo.
                </p>
              </div>

              {/* Portada con su descripción justo debajo; al lado, la clasificación */}
              <div className="grid gap-5 rounded-xl border border-silver-200 bg-silver-100/60 p-4 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="label">
                    Imagen de portada <span className="text-red-600">*</span>
                  </p>
                  <SubidorArchivo
                    kind="IMAGE"
                    media={form.coverImage}
                    onUploaded={(media) =>
                      setForm((prev) => ({
                        ...prev,
                        coverImage: media,
                        coverImageId: media.id,
                        coverAlt: prev.coverAlt || media.alt || '',
                      }))
                    }
                    onClear={() =>
                      setForm((prev) => ({ ...prev, coverImage: null, coverImageId: null }))
                    }
                  />
                  <div>
                    <label htmlFor="coverAlt" className="label">
                      ¿Qué se ve en la imagen? <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="coverAlt"
                      type="text"
                      value={form.coverAlt}
                      onChange={(e) => actualizar('coverAlt', e.target.value)}
                      placeholder="Dirigentes comunales durante un taller"
                      className="input"
                    />
                    <p className="hint">
                      Una frase corta. Google la lee porque no puede ver fotos.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="categoria" className="label">
                      Categoría
                    </label>
                    <select
                      id="categoria"
                      value={form.categoryId}
                      onChange={(e) => actualizar('categoryId', e.target.value)}
                      className="input"
                    >
                      <option value="">Sin categoría</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="etiquetas" className="label">
                      Etiquetas <span className="font-medium text-slate-700">(opcional)</span>
                    </label>
                    <input
                      id="etiquetas"
                      type="text"
                      value={form.tags}
                      onChange={(e) => actualizar('tags', e.target.value)}
                      placeholder="asamblea, libro de actas, padrón"
                      className="input"
                    />
                    <p className="hint">Separadas por comas.</p>
                  </div>

                  <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => actualizar('featured', e.target.checked)}
                      className="h-4 w-4 rounded border-silver-300 text-brand-600"
                    />
                    Destacar en la página de inicio
                  </label>
                </div>
              </div>
            </Paso>

            {/* ── Paso 2: cómo se verá en Google ── */}
            <Paso
              numero={2}
              titulo="Cómo aparecerá en Google"
              descripcion="Todo es opcional: si lo dejas vacío, usamos el título y el resumen."
            >
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="focusKeyword" className="label">
                      ¿Cómo te buscaría la gente?
                    </label>
                    <input
                      id="focusKeyword"
                      type="text"
                      value={form.focusKeyword}
                      onChange={(e) => actualizar('focusKeyword', e.target.value)}
                      placeholder="gestión comunal"
                      className="input"
                    />
                    <p className="hint">Las palabras que escribirían en Google para encontrarte.</p>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <label htmlFor="metaTitle" className="label">
                        Título en Google
                      </label>
                      <Contador actual={tituloGoogle.length} max={TITULO_MAX} />
                    </div>
                    <input
                      id="metaTitle"
                      type="text"
                      value={form.metaTitle}
                      onChange={(e) => actualizar('metaTitle', e.target.value)}
                      placeholder={
                        form.title ? `${form.title} | ICGC` : 'Se usa el título del artículo'
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <label htmlFor="metaDescription" className="label">
                        Texto debajo del título
                      </label>
                      <Contador actual={textoGoogle.length} min={DESC_MIN} max={DESC_MAX} />
                    </div>
                    <textarea
                      id="metaDescription"
                      rows={3}
                      value={form.metaDescription}
                      onChange={(e) => actualizar('metaDescription', e.target.value)}
                      placeholder={form.excerpt || 'Se usa el resumen del artículo'}
                      className="input resize-y"
                    />
                    <p className="hint">Escríbelo para que den ganas de hacer clic.</p>
                  </div>
                </div>

                <div>
                  <p className="label">Así se vería en Google</p>
                  <VistaGoogle
                    titulo={tituloGoogle}
                    descripcion={textoGoogle}
                    slug={form.slug}
                    busqueda={form.focusKeyword}
                    nombreSitio={sitio.nombre}
                    logoUrl={sitio.logo}
                  />
                </div>
              </div>
            </Paso>

            {/* ── Paso 3: el artículo, sin interrupciones ── */}
            <section>
              <EncabezadoPaso numero={3} titulo="Escribe el artículo" />
              <div className="mt-3">
                <BlockEditor blocks={blocks} onChange={setBlocks} />
              </div>
            </section>
          </div>
        </div>

        {/* ── Revisión ── */}
        <aside className={pestana === 'articulo' ? 'hidden xl:block' : ''}>
          <div className="xl:sticky xl:top-20">
            <SeoPanel
              title={form.title}
              slug={form.slug}
              metaTitle={form.metaTitle}
              metaDescription={form.metaDescription}
              focusKeyword={form.focusKeyword}
              excerpt={form.excerpt}
              blocks={blocks}
              coverImageId={form.coverImageId}
              coverAlt={form.coverAlt}
              audit={audit}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

// ───────────────────────── Conversiones ─────────────────────────

function aFormulario(post: PostDTO): Formulario {
  return {
    title: post.title,
    subtitle: post.subtitle ?? '',
    slug: post.slug,
    excerpt: post.excerpt,
    metaTitle: post.metaTitle ?? '',
    metaDescription: post.metaDescription ?? '',
    focusKeyword: post.focusKeyword ?? '',
    coverImageId: post.coverImage?.id ?? null,
    coverImage: post.coverImage,
    coverAlt: post.coverAlt ?? '',
    categoryId: post.category?.id ?? '',
    tags: post.tags.map((t) => t.name).join(', '),
    featured: post.featured,
  };
}

function aBloques(post: PostDTO): DraftBlock[] {
  return post.blocks.map((b) => ({
    key: b.id,
    type: b.type,
    text: b.text ?? '',
    level: b.level ?? 2,
    listStyle: (b.listStyle === 'number' ? 'number' : 'bullet') as 'bullet' | 'number',
    mediaId: b.media?.id ?? null,
    media: b.media,
    alt: b.alt ?? '',
    caption: b.caption ?? '',
    embedUrl: b.embedUrl ?? '',
  }));
}
