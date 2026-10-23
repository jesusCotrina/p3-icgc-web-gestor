import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BlockEditor, SubidorArchivo } from '@/components/BlockEditor';
import { SeoPanel } from '@/components/SeoPanel';
import { ApiError, categoriesApi, postsApi, type PostPayload } from '@/lib/api';
import { slugify } from '@/lib/format';
import type { CategoryDTO, DraftBlock, MediaDTO, PostDTO, SeoAudit } from '@/lib/types';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000';

type Formulario = {
  title: string;
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
  noindex: boolean;
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
  noindex: false,
};

export function PostEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const esNuevo = !id || id === 'nuevo';

  const [form, setForm] = useState<Formulario>(VACIO);
  const [blocks, setBlocks] = useState<DraftBlock[]>([]);
  const [categorias, setCategorias] = useState<CategoryDTO[]>([]);
  const [estado, setEstado] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [audit, setAudit] = useState<SeoAudit | null>(null);
  const [cargando, setCargando] = useState(!esNuevo);
  const [guardando, setGuardando] = useState(false);
  const [slugTocado, setSlugTocado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pestana, setPestana] = useState<'contenido' | 'seo'>('contenido');

  function actualizar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  // Categorías para el selector
  useEffect(() => {
    categoriesApi
      .list()
      .then(setCategorias)
      .catch(() => setCategorias([]));
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
        setSlugTocado(true);
      })
      .catch((err) =>
        setAviso({
          tipo: 'error',
          texto: err instanceof Error ? err.message : 'No se pudo cargar el artículo',
        }),
      )
      .finally(() => setCargando(false));
  }, [id, esNuevo]);

  // El slug se deriva del título mientras el admin no lo edite a mano.
  // Una vez publicado no se toca solo: cambiar la URL de un post indexado
  // borra su posicionamiento acumulado.
  useEffect(() => {
    if (slugTocado) return;
    setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
  }, [form.title, slugTocado]);

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
        noindex: form.noindex,
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
              ? 'Artículo publicado. Ya aparece en la web pública.'
              : 'Borrador guardado.',
        });

        // Al crear, pasamos a la URL de edición para no duplicar el artículo
        if (esNuevo) navigate(`/blogs/${resultado.id}`, { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.details) {
          const detalle = err.details as SeoAudit;
          setAudit(detalle);
          setPestana('seo');
          setAviso({
            tipo: 'error',
            texto: 'No se pudo publicar: revisa los puntos marcados en el panel de SEO.',
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

  return (
    <div className="space-y-5">
      {/* ── Barra de acciones ── */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <button type="button" onClick={() => navigate('/blogs')} className="btn-ghost btn-sm">
          ← Volver
        </button>

        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-brand-900">
            {esNuevo ? 'Nuevo blog' : form.title || 'Sin título'}
          </h2>
          <p className="text-xs text-slate-500">
            {estado === 'PUBLISHED' ? 'Publicado' : estado === 'DRAFT' ? 'Borrador' : 'Archivado'}
            {form.slug && ` · /blog/${form.slug}`}
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
            {estado === 'PUBLISHED' ? 'Actualizar publicación' : 'Publicar'}
          </button>
        </div>
      </div>

      {aviso && (
        <p
          role="alert"
          className={`rounded-lg px-4 py-3 text-sm ${
            aviso.tipo === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Columna principal ── */}
        <div className="space-y-5">
          {/* Pestañas (solo hasta xl; arriba de eso el panel SEO va al costado) */}
          <div className="flex gap-1.5 xl:hidden">
            {(['contenido', 'seo'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPestana(p)}
                aria-pressed={pestana === p}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  pestana === p ? 'bg-brand-600 text-white' : 'bg-white text-brand-700'
                }`}
              >
                {p === 'contenido' ? 'Contenido' : 'SEO'}
              </button>
            ))}
          </div>

          <div className={pestana === 'seo' ? 'hidden xl:block' : ''}>
            {/* ── Datos principales ── */}
            <section className="card space-y-5 p-5">
              <div>
                <label htmlFor="titulo" className="label">
                  Título del artículo <span className="text-red-500">*</span>
                </label>
                <input
                  id="titulo"
                  type="text"
                  value={form.title}
                  onChange={(e) => actualizar('title', e.target.value)}
                  placeholder="Qué es la gestión comunal y por qué importa"
                  className="input text-lg font-semibold"
                />
                <p className="hint">
                  Es el H1 de la página. Incluye la palabra clave principal lo más al inicio
                  posible.
                </p>
              </div>

              <div>
                <label htmlFor="subtitulo" className="label">
                  Subtítulo (opcional)
                </label>
                <input
                  id="subtitulo"
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => actualizar('subtitle', e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="slug" className="label">
                  URL del artículo
                </label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm text-slate-400">/blog/</span>
                  <input
                    id="slug"
                    type="text"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTocado(true);
                      actualizar('slug', slugify(e.target.value));
                    }}
                    className="input font-mono text-sm"
                  />
                </div>
                <p className="hint">
                  {estado === 'PUBLISHED'
                    ? 'Cuidado: este artículo ya está publicado. Cambiar la URL hace que Google pierda lo que tenía indexado.'
                    : 'Se genera sola a partir del título. Mantenla corta y con la palabra clave.'}
                </p>
              </div>

              <div>
                <label htmlFor="resumen" className="label">
                  Resumen <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="resumen"
                  rows={3}
                  value={form.excerpt}
                  onChange={(e) => actualizar('excerpt', e.target.value)}
                  placeholder="Dos o tres líneas que resuman el artículo."
                  className="input resize-y"
                />
                <p className="hint">
                  Se muestra en el listado del blog y al compartir el enlace en redes.
                </p>
              </div>
            </section>

            {/* ── Portada ── */}
            <section className="card mt-5 space-y-4 p-5">
              <h3 className="text-sm font-bold text-brand-900">
                Imagen de portada <span className="text-red-500">*</span>
              </h3>

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
                  Texto alternativo de la portada <span className="text-red-500">*</span>
                </label>
                <input
                  id="coverAlt"
                  type="text"
                  value={form.coverAlt}
                  onChange={(e) => actualizar('coverAlt', e.target.value)}
                  placeholder="Dirigentes comunales durante un taller de capacitación"
                  className="input"
                />
              </div>
            </section>

            {/* ── Contenido ── */}
            <section className="mt-5">
              <h3 className="mb-3 text-sm font-bold text-brand-900">Contenido del artículo</h3>
              <BlockEditor blocks={blocks} onChange={setBlocks} />
            </section>

            {/* ── Clasificación ── */}
            <section className="card mt-5 space-y-5 p-5">
              <h3 className="text-sm font-bold text-brand-900">Clasificación</h3>

              <div className="grid gap-5 sm:grid-cols-2">
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
                    Etiquetas
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
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => actualizar('featured', e.target.checked)}
                    className="h-4 w-4 rounded border-silver-300 text-brand-600"
                  />
                  Destacar en la página de inicio
                </label>

                <label className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.noindex}
                    onChange={(e) => actualizar('noindex', e.target.checked)}
                    className="h-4 w-4 rounded border-silver-300 text-brand-600"
                  />
                  No indexar en Google (noindex)
                </label>
              </div>
            </section>

            {/* ── Metadatos SEO ── */}
            <section className="card mt-5 space-y-5 p-5">
              <h3 className="text-sm font-bold text-brand-900">Metadatos para Google</h3>

              <div>
                <label htmlFor="focusKeyword" className="label">
                  Palabra clave objetivo
                </label>
                <input
                  id="focusKeyword"
                  type="text"
                  value={form.focusKeyword}
                  onChange={(e) => actualizar('focusKeyword', e.target.value)}
                  placeholder="gestión comunal"
                  className="input"
                />
                <p className="hint">
                  La búsqueda por la que quieres aparecer. Se revisa que esté en el título, la URL
                  y la descripción.
                </p>
              </div>

              <div>
                <label htmlFor="metaTitle" className="label">
                  Título SEO
                </label>
                <input
                  id="metaTitle"
                  type="text"
                  value={form.metaTitle}
                  onChange={(e) => actualizar('metaTitle', e.target.value)}
                  placeholder={form.title ? `${form.title} | ICGC` : 'Se usa el título del artículo'}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="metaDescription" className="label">
                  Meta descripción <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="metaDescription"
                  rows={3}
                  value={form.metaDescription}
                  onChange={(e) => actualizar('metaDescription', e.target.value)}
                  className="input resize-y"
                />
                <p className="hint">
                  Es el texto que aparece bajo el título en los resultados de Google. Escríbelo
                  para que inviten a hacer clic.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* ── Panel SEO ── */}
        <aside className={pestana === 'contenido' ? 'hidden xl:block' : ''}>
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
    noindex: post.noindex,
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
