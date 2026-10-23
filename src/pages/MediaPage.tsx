import { useCallback, useEffect, useState } from 'react';
import { SubidorArchivo } from '@/components/BlockEditor';
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

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const result = await mediaApi.list({
        kind: filtro === 'TODOS' ? undefined : filtro,
        page: pagina,
        pageSize: 24,
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
    if (
      !window.confirm(
        `¿Eliminar "${media.originalName}"? Si algún artículo lo usa, quedará sin ese archivo.`,
      )
    ) {
      return;
    }

    try {
      await mediaApi.remove(media.id);
      setSeleccionado(null);
      setAviso({ tipo: 'ok', texto: 'Archivo eliminado del servidor' });
      await cargar();
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo eliminar',
      });
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

  const totalBytes = datos?.items.reduce((suma, m) => suma + m.sizeBytes, 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-900">Archivos del servidor</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {datos ? `${datos.total} archivo(s) · ${formatBytes(totalBytes)} en esta página` : '...'}
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

      {/* Subida suelta: útil para dejar archivos listos antes de escribir */}
      <section className="card p-5">
        <h3 className="mb-3 text-sm font-bold text-brand-900">Subir un archivo nuevo</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <SubidorArchivo
            kind="IMAGE"
            media={null}
            onUploaded={() => {
              setAviso({ tipo: 'ok', texto: 'Imagen subida' });
              void cargar();
            }}
            onClear={() => undefined}
          />
          <SubidorArchivo
            kind="VIDEO"
            media={null}
            onUploaded={() => {
              setAviso({ tipo: 'ok', texto: 'Video subido' });
              void cargar();
            }}
            onClear={() => undefined}
          />
        </div>
      </section>

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
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="card aspect-square animate-pulse" />
          ))}
        </div>
      ) : datos && datos.items.length > 0 ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {datos.items.map((media) => (
              <li key={media.id}>
                <button
                  type="button"
                  onClick={() => setSeleccionado(media)}
                  className="card group w-full overflow-hidden text-left transition-shadow hover:shadow-md"
                >
                  <div className="aspect-square bg-silver-100">
                    {media.kind === 'IMAGE' ? (
                      <img
                        src={media.url}
                        alt={media.alt ?? ''}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 bg-brand-900 text-white">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span className="text-[0.65rem] font-semibold">VIDEO</span>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5">
                    <p className="truncate text-xs font-semibold text-brand-900">
                      {media.originalName}
                    </p>
                    <p className="mt-0.5 text-[0.65rem] text-slate-500">
                      {formatBytes(media.sizeBytes)}
                    </p>
                    {media.kind === 'IMAGE' && !media.alt && (
                      <p className="mt-1 text-[0.65rem] font-semibold text-amber-600">Falta alt</p>
                    )}
                  </div>
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
          onDelete={eliminar}
        />
      )}
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
            className="rounded-lg px-3 py-1 text-slate-500 hover:bg-silver-100"
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
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{etiqueta}</dt>
      <dd className="mt-0.5 truncate text-brand-900" title={valor}>
        {valor}
      </dd>
    </div>
  );
}
