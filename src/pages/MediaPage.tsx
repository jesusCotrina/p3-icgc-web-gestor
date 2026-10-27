import { useCallback, useEffect, useState } from 'react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { mediaApi } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/format';
import type { MediaDTO, Paginated } from '@/lib/types';

/**
 * Biblioteca de archivos del servidor: todo lo que se subió desde el gestor.
 * Desde aquí se corrige el texto alternativo de las imágenes, que es un dato
 * de SEO, y se liberan archivos que ya no se usan.
 */
export function MediaPage() {
  const [datos, setDatos] = useState<Paginated<MediaDTO> | null>(null);
  const [filtro, setFiltro] = useState<'TODOS' | 'IMAGE' | 'VIDEO'>('TODOS');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState<MediaDTO | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [porEliminar, setPorEliminar] = useState<MediaDTO | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const result = await mediaApi.list({
        kind: filtro === 'TODOS' ? undefined : filtro,
        page: pagina,
        pageSize: 20,
      });
      setDatos(result);
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo cargar la biblioteca',
      });
    } finally {
      setCargando(false);
    }
  }, [filtro, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function eliminar(media: MediaDTO) {
    setEliminando(true);
    try {
      await mediaApi.remove(media.id);
      setPorEliminar(null);
      setSeleccionado(null);
      setAviso({ tipo: 'ok', texto: 'Archivo eliminado del servidor' });
      await cargar();
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo eliminar',
      });
      setPorEliminar(null);
    } finally {
      setEliminando(false);
    }
  }

  async function guardarTextos(media: MediaDTO, alt: string, caption: string) {
    try {
      await mediaApi.update(media.id, { alt: alt || null, caption: caption || null });
      setAviso({ tipo: 'ok', texto: 'Datos del archivo actualizados' });
      setSeleccionado(null);
      await cargar();
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo guardar',
      });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Imágenes y videos</h2>
          <p className="mt-0.5 text-sm text-slate-700">
            {datos ? `${datos.total} archivo(s), del más reciente al más antiguo` : '...'}
          </p>
        </div>

        <div className="flex gap-1.5">
          {(
            [
              { valor: 'TODOS', etiqueta: 'Todos' },
              { valor: 'IMAGE', etiqueta: 'Imágenes' },
              { valor: 'VIDEO', etiqueta: 'Videos' },
            ] as const
          ).map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => {
                setFiltro(f.valor);
                setPagina(1);
              }}
              aria-pressed={filtro === f.valor}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                filtro === f.valor ? 'bg-brand-600 text-white' : 'bg-white text-brand-700'
              }`}
            >
              {f.etiqueta}
            </button>
          ))}
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

      {cargando && !datos ? (
        <div className="card divide-y divide-silver-200">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse" />
          ))}
        </div>
      ) : datos && datos.items.length > 0 ? (
        <>
          {/* Lista liviana: cada fila carga una miniatura de ~15 KB, no la foto original */}
          <ul className="card divide-y divide-silver-200 overflow-hidden">
            {datos.items.map((media) => (
              <li key={media.id}>
                <button
                  type="button"
                  onClick={() => setSeleccionado(media)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-brand-50"
                >
                  <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-silver-100">
                    {media.kind === 'IMAGE' && media.thumbUrl ? (
                      <img
                        src={media.thumbUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={64}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-brand-900 text-white">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <polygon points="6 4 20 12 6 20 6 4" />
                        </svg>
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">
                      {media.originalName}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-700">
                      {media.kind === 'IMAGE' ? 'Imagen' : 'Video'} · {formatBytes(media.sizeBytes)}
                      {media.width && media.height ? ` · ${media.width}×${media.height}` : ''}
                    </span>
                  </span>

                  {media.kind === 'IMAGE' && !media.alt && (
                    <span className="badge hidden bg-amber-100 text-amber-900 sm:inline-flex">
                      Sin descripción
                    </span>
                  )}
                  <span className="hidden shrink-0 text-xs font-semibold text-slate-700 md:block">
                    Subido el {formatDate(media.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {datos.totalPages > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-center gap-2">
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
          <h3 className="text-lg font-bold">La biblioteca está vacía</h3>
          <p className="mt-2 text-sm text-slate-600">
            Los archivos que subas aquí o desde el editor aparecerán en esta sección.
          </p>
        </div>
      )}

      {seleccionado && (
        <DetalleArchivo
          media={seleccionado}
          onClose={() => setSeleccionado(null)}
          onSave={guardarTextos}
          onDelete={async (m) => setPorEliminar(m)}
        />
      )}

      <ConfirmModal
        abierto={porEliminar !== null}
        tono="peligro"
        titulo="¿Eliminar este archivo?"
        mensaje={
          <>
            <strong>{porEliminar?.originalName}</strong> se borrará del servidor. Si algún artículo,
            curso o proyecto lo usa, quedará sin ese archivo. <strong>No se puede deshacer.</strong>
          </>
        }
        textoConfirmar="Sí, eliminar"
        ocupado={eliminando}
        onConfirmar={() => porEliminar && void eliminar(porEliminar)}
        onCancelar={() => setPorEliminar(null)}
      />
    </div>
  );
}

function DetalleArchivo({
  media,
  onClose,
  onSave,
  onDelete,
}: {
  media: MediaDTO;
  onClose: () => void;
  onSave: (media: MediaDTO, alt: string, caption: string) => Promise<void>;
  onDelete: (media: MediaDTO) => Promise<void>;
}) {
  const [alt, setAlt] = useState(media.alt ?? '');
  const [caption, setCaption] = useState(media.caption ?? '');

  // Cerrar con Escape: estándar en cualquier modal
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-titulo"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white"
      >
        <header className="flex items-center justify-between border-b border-silver-200 px-5 py-4">
          <h3 id="detalle-titulo" className="truncate text-base font-bold text-brand-900">
            {media.originalName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg px-3 py-1 text-slate-700 hover:bg-silver-100"
          >
            ✕
          </button>
        </header>

        <div className="space-y-5 p-5">
          <div className="overflow-hidden rounded-lg bg-silver-100">
            {media.kind === 'IMAGE' ? (
              <img src={media.url} alt={alt} className="mx-auto max-h-80 object-contain" />
            ) : (
              <video src={media.url} controls preload="metadata" className="w-full bg-black" />
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Dato etiqueta="Tipo" valor={media.mimeType} />
            <Dato etiqueta="Tamaño" valor={formatBytes(media.sizeBytes)} />
            <Dato
              etiqueta="Dimensiones"
              valor={media.width && media.height ? `${media.width}×${media.height}` : '—'}
            />
            <Dato etiqueta="Subido" valor={formatDate(media.createdAt)} />
          </dl>

          {media.kind === 'IMAGE' && (
            <div>
              <label htmlFor="alt-media" className="label">
                Texto alternativo (alt)
              </label>
              <input
                id="alt-media"
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                className="input"
              />
              <p className="hint">
                Describe la imagen. Google lo usa para entenderla y para posicionarla en
                búsqueda de imágenes.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="caption-media" className="label">
              Descripción / pie
            </label>
            <input
              id="caption-media"
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="url-media" className="label">
              URL en el servidor
            </label>
            <input
              id="url-media"
              type="text"
              readOnly
              value={media.url}
              onFocus={(e) => e.currentTarget.select()}
              className="input font-mono text-xs"
            />
          </div>
        </div>

        <footer className="flex flex-wrap justify-between gap-3 border-t border-silver-200 px-5 py-4">
          <button
            type="button"
            onClick={() => void onDelete(media)}
            className="btn text-red-600 hover:bg-red-50"
          >
            Eliminar del servidor
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void onSave(media, alt, caption)}
              className="btn-primary"
            >
              Guardar cambios
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-700">{etiqueta}</dt>
      <dd className="mt-0.5 truncate text-brand-900" title={valor}>
        {valor}
      </dd>
    </div>
  );
}
