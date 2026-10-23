import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, postsApi } from '@/lib/api';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { Paginated, PostSummaryDTO, SeoAudit } from '@/lib/types';
import { EstadoBadge } from './DashboardPage';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000';

const FILTROS = [
  { valor: 'ALL', etiqueta: 'Todos' },
  { valor: 'PUBLISHED', etiqueta: 'Publicados' },
  { valor: 'DRAFT', etiqueta: 'Borradores' },
  { valor: 'ARCHIVED', etiqueta: 'Archivados' },
] as const;

/**
 * Listado de blogs: lo primero que ve el admin al entrar a la sección,
 * con el botón de "Nuevo blog" siempre a la vista.
 */
export function PostsPage() {
  const [datos, setDatos] = useState<Paginated<PostSummaryDTO> | null>(null);
  const [estado, setEstado] = useState<string>('ALL');
  const [busqueda, setBusqueda] = useState('');
  const [consulta, setConsulta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const result = await postsApi.list({
        status: estado,
        q: consulta || undefined,
        page: pagina,
        pageSize: 10,
      });
      setDatos(result);
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo cargar el listado',
      });
    } finally {
      setCargando(false);
    }
  }, [estado, consulta, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Búsqueda con retardo: no disparamos una petición por cada tecla
  useEffect(() => {
    const id = window.setTimeout(() => {
      setConsulta(busqueda.trim());
      setPagina(1);
    }, 400);
    return () => window.clearTimeout(id);
  }, [busqueda]);

  async function cambiarEstado(post: PostSummaryDTO, nuevo: 'PUBLISHED' | 'DRAFT') {
    setAviso(null);
    try {
      await postsApi.changeStatus(post.id, nuevo);
      setAviso({
        tipo: 'ok',
        texto: nuevo === 'PUBLISHED' ? 'Artículo publicado' : 'Artículo pasado a borrador',
      });
      await cargar();
    } catch (err) {
      // Si no pasa la auditoría SEO, el backend devuelve los motivos concretos
      if (err instanceof ApiError && err.details) {
        const audit = err.details as SeoAudit;
        setAviso({
          tipo: 'error',
          texto: `No se puede publicar: ${audit.errors.map((e) => e.message).join(' · ')}`,
        });
        return;
      }
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo cambiar el estado',
      });
    }
  }

  async function eliminar(post: PostSummaryDTO) {
    // confirm() del navegador: suficiente para una acción puntual del admin
    if (!window.confirm(`¿Eliminar definitivamente "${post.title}"?`)) return;

    try {
      await postsApi.remove(post.id);
      setAviso({ tipo: 'ok', texto: 'Artículo eliminado' });
      await cargar();
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo eliminar',
      });
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Barra superior ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-900">Blogs del sitio</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {datos ? `${formatNumber(datos.total)} artículo(s)` : 'Cargando...'}
          </p>
        </div>

        <Link to="/blogs/nuevo" className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo blog
        </Link>
      </div>

      {/* ── Filtros ── */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => {
                setEstado(f.valor);
                setPagina(1);
              }}
              aria-pressed={estado === f.valor}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                estado === f.valor
                  ? 'bg-brand-600 text-white'
                  : 'text-brand-700 hover:bg-brand-50'
              }`}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>

        <div className="ml-auto w-full sm:w-72">
          <label htmlFor="buscar" className="sr-only">
            Buscar artículos
          </label>
          <input
            id="buscar"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título o URL..."
            className="input"
          />
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

      {/* ── Listado ── */}
      {cargando && !datos ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
      ) : datos && datos.items.length > 0 ? (
        <>
          <ul className="space-y-3">
            {datos.items.map((post) => (
              <li key={post.id} className="card p-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-silver-100">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[0.6rem] font-bold text-slate-400">
                        SIN PORTADA
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <EstadoBadge status={post.status} />
                      {post.featured && (
                        <span className="badge bg-brand-50 text-brand-700">Destacado</span>
                      )}
                      {post.category && (
                        <span className="badge bg-silver-100 text-slate-600">
                          {post.category.name}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 truncate text-base font-bold text-brand-900">
                      {post.title}
                    </h3>
                    <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                      /blog/{post.slug}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Editado el {formatDateTime(post.updatedAt)} · {post.wordCount} palabras ·{' '}
                      {formatNumber(post.views)} visitas
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link to={`/blogs/${post.id}`} className="btn-secondary btn-sm">
                      Editar
                    </Link>

                    {post.status === 'PUBLISHED' ? (
                      <>
                        <a
                          href={`${SITE_URL}/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost btn-sm"
                        >
                          Ver ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => void cambiarEstado(post, 'DRAFT')}
                          className="btn-ghost btn-sm"
                        >
                          Despublicar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void cambiarEstado(post, 'PUBLISHED')}
                        className="btn-primary btn-sm"
                      >
                        Publicar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void eliminar(post)}
                      className="btn-sm btn text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {datos.totalPages > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
                className="btn-secondary btn-sm"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-600">
                Página {datos.page} de {datos.totalPages}
              </span>
              <button
                type="button"
                disabled={pagina >= datos.totalPages}
                onClick={() => setPagina((p) => p + 1)}
                className="btn-secondary btn-sm"
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className="card p-16 text-center">
          <h3 className="text-lg font-bold">
            {consulta ? 'Sin resultados' : 'Aún no hay blogs'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
            {consulta
              ? `No encontramos artículos que coincidan con "${consulta}".`
              : 'Crea tu primer artículo y aparecerá automáticamente en la web pública.'}
          </p>
          <Link to="/blogs/nuevo" className="btn-primary mt-7">
            + Nuevo blog
          </Link>
        </div>
      )}
    </div>
  );
}
