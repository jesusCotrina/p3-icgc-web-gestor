import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BotonEditar, BotonEliminar, BotonVer, BotonVisibilidad } from '@/components/BotonesAccion';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ApiError, postsApi } from '@/lib/api';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { Paginated, PostSummaryDTO, SeoAudit } from '@/lib/types';
import { EstadoBadge } from './DashboardPage';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000';

/** Artículos por página: pocos, para que la lista se lea de un vistazo. */
const POR_PAGINA = 8;

const FILTROS = [
  { valor: 'ALL', etiqueta: 'Todos' },
  { valor: 'PUBLISHED', etiqueta: 'Publicados' },
  { valor: 'DRAFT', etiqueta: 'Borradores' },
  { valor: 'ARCHIVED', etiqueta: 'Archivados' },
] as const;

type Accion = { tipo: 'publicar' | 'despublicar' | 'eliminar'; post: PostSummaryDTO };

/**
 * Listado de blogs, del más nuevo al más viejo, con el botón de "Nuevo blog"
 * siempre a la vista. Publicar, despublicar y eliminar piden confirmación.
 */
export function PostsPage() {
  const [datos, setDatos] = useState<Paginated<PostSummaryDTO> | null>(null);
  const [estado, setEstado] = useState<string>('ALL');
  const [busqueda, setBusqueda] = useState('');
  const [consulta, setConsulta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const result = await postsApi.list({
        status: estado,
        q: consulta || undefined,
        page: pagina,
        pageSize: POR_PAGINA,
        // Por fecha de creación: editar un artículo no lo cambia de lugar
        sort: 'newest',
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

  async function confirmar() {
    if (!accion) return;
    const { tipo, post } = accion;
    setProcesando(true);
    setAviso(null);

    try {
      if (tipo === 'eliminar') {
        await postsApi.remove(post.id);
        setAviso({ tipo: 'ok', texto: `Se eliminó "${post.title}".` });
        // Si era el último de la página, volvemos a la anterior
        if (datos && datos.items.length === 1 && pagina > 1) setPagina((p) => p - 1);
      } else {
        await postsApi.changeStatus(post.id, tipo === 'publicar' ? 'PUBLISHED' : 'DRAFT');
        setAviso({
          tipo: 'ok',
          texto:
            tipo === 'publicar'
              ? `"${post.title}" ya está publicado en la web.`
              : `"${post.title}" ya no se ve en la web. Quedó como borrador.`,
        });
      }
      setAccion(null);
      await cargar();
    } catch (err) {
      setAccion(null);
      // Si le falta algo para publicarse, el backend devuelve qué es
      if (err instanceof ApiError && err.details) {
        const audit = err.details as SeoAudit;
        setAviso({
          tipo: 'error',
          texto: `Todavía no se puede publicar: ${audit.errors.map((e) => e.message).join(' · ')}. Ábrelo con "Editar" para completarlo.`,
        });
        return;
      }
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo completar la acción',
      });
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Barra superior ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Blogs del sitio</h2>
          <p className="mt-0.5 text-sm font-medium text-slate-800">
            {datos
              ? `${formatNumber(datos.total)} ${datos.total === 1 ? 'artículo' : 'artículos'} · del más nuevo al más antiguo`
              : 'Cargando...'}
          </p>
        </div>

        <Link to="/blogs/nuevo" className="btn-primary">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
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
              className={`rounded-lg px-3.5 py-2 text-sm font-bold transition-colors ${
                estado === f.valor ? 'bg-brand-600 text-white' : 'text-slate-800 hover:bg-brand-50'
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
            placeholder="Buscar por título..."
            className="input"
          />
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

      {/* ── Listado ── */}
      {cargando && !datos ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
      ) : datos && datos.items.length > 0 ? (
        <>
          <ul className={`space-y-3 transition-opacity ${cargando ? 'opacity-60' : ''}`}>
            {datos.items.map((post) => (
              <li key={post.id} className="card p-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-silver-100">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage.thumbUrl ?? post.coverImage.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[0.6rem] font-bold text-slate-600">
                        SIN PORTADA
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <EstadoBadge status={post.status} />
                      {post.featured && (
                        <span className="badge bg-brand-100 text-brand-800">Destacado</span>
                      )}
                      {post.category && (
                        <span className="badge bg-silver-200 text-slate-800">
                          {post.category.name}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 truncate text-base font-extrabold text-slate-900">
                      {post.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-800">
                      <span className="font-semibold">
                        Creado el {formatDateTime(post.createdAt)}
                      </span>
                      {' · '}
                      {post.wordCount} palabras · {formatNumber(post.views)} visitas
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <BotonEditar to={`/blogs/${post.id}`} etiqueta={`Editar "${post.title}"`} />
                    {post.status === 'PUBLISHED' && (
                      <BotonVer href={`${SITE_URL}/blog/${post.slug}`} etiqueta={`Ver "${post.title}" en la web`} />
                    )}
                    <BotonVisibilidad
                      publicado={post.status === 'PUBLISHED'}
                      etiqueta={post.status === 'PUBLISHED' ? `Despublicar "${post.title}"` : `Publicar "${post.title}"`}
                      onClick={() =>
                        setAccion({ tipo: post.status === 'PUBLISHED' ? 'despublicar' : 'publicar', post })
                      }
                    />
                    <BotonEliminar
                      etiqueta={`Eliminar "${post.title}"`}
                      onClick={() => setAccion({ tipo: 'eliminar', post })}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {datos.totalPages > 1 && (
            <Paginacion pagina={datos.page} total={datos.totalPages} onCambiar={setPagina} />
          )}
        </>
      ) : (
        <div className="card p-16 text-center">
          <h3 className="text-lg font-extrabold text-slate-900">
            {consulta ? 'Sin resultados' : 'Aún no hay blogs'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-800">
            {consulta
              ? `No encontramos artículos que coincidan con "${consulta}".`
              : 'Crea tu primer artículo y aparecerá en la web.'}
          </p>
          <Link to="/blogs/nuevo" className="btn-primary mt-7">
            + Nuevo blog
          </Link>
        </div>
      )}

      <ConfirmModal
        abierto={accion !== null}
        ocupado={procesando}
        onCancelar={() => setAccion(null)}
        onConfirmar={() => void confirmar()}
        {...textosDelModal(accion)}
      />
    </div>
  );
}

function textosDelModal(accion: Accion | null) {
  const titulo = accion ? <strong className="text-slate-900">“{accion.post.title}”</strong> : null;

  switch (accion?.tipo) {
    case 'publicar':
      return {
        tono: 'publicar' as const,
        titulo: '¿Publicar este artículo?',
        textoConfirmar: 'Publicar',
        mensaje: <>{titulo} se verá en la web y cualquier persona podrá leerlo.</>,
      };
    case 'despublicar':
      return {
        tono: 'aviso' as const,
        titulo: '¿Despublicar este artículo?',
        textoConfirmar: 'Despublicar',
        mensaje: (
          <>
            {titulo} dejará de verse en la web. No se borra: queda como borrador y puedes volver a
            publicarlo cuando quieras.
          </>
        ),
      };
    default:
      return {
        tono: 'peligro' as const,
        titulo: '¿Eliminar este artículo?',
        textoConfirmar: 'Sí, eliminar',
        mensaje: (
          <>
            {titulo} se borrará para siempre. <strong>Esto no se puede deshacer.</strong>
          </>
        ),
      };
  }
}

/** Anterior · 1 2 3 … · Siguiente */
function Paginacion({
  pagina,
  total,
  onCambiar,
}: {
  pagina: number;
  total: number;
  onCambiar: (p: number) => void;
}) {
  // Páginas visibles: primera, última y las vecinas de la actual
  const numeros = Array.from({ length: total }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === total || Math.abs(n - pagina) <= 1,
  );

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-center gap-1.5 pt-2"
    >
      <button
        type="button"
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
        className="btn-secondary btn-sm"
      >
        ← Anterior
      </button>
      {numeros.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - numeros[i - 1]! > 1 && (
            <span className="px-1 font-bold text-slate-700" aria-hidden="true">
              …
            </span>
          )}
          <button
            type="button"
            onClick={() => onCambiar(n)}
            aria-current={n === pagina ? 'page' : undefined}
            className={`h-9 min-w-9 rounded-lg px-2 text-sm font-bold transition-colors ${
              n === pagina
                ? 'bg-brand-600 text-white'
                : 'border border-silver-300 bg-white text-slate-900 hover:bg-brand-50'
            }`}
          >
            {n}
          </button>
        </span>
      ))}
      <button
        type="button"
        disabled={pagina >= total}
        onClick={() => onCambiar(pagina + 1)}
        className="btn-secondary btn-sm"
      >
        Siguiente →
      </button>
    </nav>
  );
}
