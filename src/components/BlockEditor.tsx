import { useRef, useState } from 'react';
import { uploadFile, type UploadProgress } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import type { BlockType, DraftBlock, MediaDTO } from '@/lib/types';

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 500;

export function nuevoBloque(type: BlockType): DraftBlock {
  return {
    key: crypto.randomUUID(),
    type,
    text: '',
    level: 2,
    listStyle: 'bullet',
    mediaId: null,
    media: null,
    alt: '',
    caption: '',
    embedUrl: '',
  };
}

const TIPOS: { type: BlockType; etiqueta: string; descripcion: string }[] = [
  { type: 'PARAGRAPH', etiqueta: 'Párrafo', descripcion: 'Texto del artículo' },
  { type: 'HEADING', etiqueta: 'Subtítulo', descripcion: 'Para separar el texto por temas' },
  { type: 'IMAGE', etiqueta: 'Imagen', descripcion: `Hasta ${MAX_IMAGE_MB} MB` },
  { type: 'VIDEO', etiqueta: 'Video', descripcion: `Hasta ${MAX_VIDEO_MB} MB` },
  { type: 'LIST', etiqueta: 'Lista', descripcion: 'Viñetas o numerada' },
  { type: 'QUOTE', etiqueta: 'Cita', descripcion: 'Texto destacado' },
  { type: 'EMBED', etiqueta: 'YouTube / Vimeo', descripcion: 'Video por enlace' },
  { type: 'DIVIDER', etiqueta: 'Separador', descripcion: 'Línea divisoria' },
];

const NOMBRES: Record<BlockType, string> = {
  PARAGRAPH: 'Párrafo',
  HEADING: 'Subtítulo',
  IMAGE: 'Imagen',
  VIDEO: 'Video',
  LIST: 'Lista',
  QUOTE: 'Cita',
  EMBED: 'Video incrustado',
  DIVIDER: 'Separador',
};

/**
 * Editor del cuerpo del artículo.
 *
 * El contenido se guarda como bloques tipados, no como HTML: así la web
 * pública puede renderizar <h2>, <figure> y <video> semánticos, que es lo que
 * Google necesita para entender el artículo. Por eso cada imagen exige su alt.
 */
export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: DraftBlock[];
  onChange: (blocks: DraftBlock[]) => void;
}) {
  function actualizar(key: string, cambios: Partial<DraftBlock>) {
    onChange(blocks.map((b) => (b.key === key ? { ...b, ...cambios } : b)));
  }

  function agregar(type: BlockType) {
    onChange([...blocks, nuevoBloque(type)]);
  }

  function eliminar(key: string) {
    onChange(blocks.filter((b) => b.key !== key));
  }

  function mover(index: number, direccion: -1 | 1) {
    const destino = index + direccion;
    if (destino < 0 || destino >= blocks.length) return;

    const copia = [...blocks];
    const actual = copia[index]!;
    copia[index] = copia[destino]!;
    copia[destino] = actual;
    onChange(copia);
  }

  return (
    <div className="space-y-4">
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-silver-300 p-10 text-center text-sm text-slate-700">
          El artículo está vacío. Agrega el primer bloque con los botones de abajo.
        </p>
      )}

      {blocks.map((block, index) => (
        <article key={block.key} className="rounded-xl border border-silver-200 bg-white">
          <header className="flex items-center gap-2 border-b border-silver-200 bg-silver-100/70 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
              {index + 1}. {NOMBRES[block.type]}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => mover(index, -1)}
                disabled={index === 0}
                aria-label="Mover bloque hacia arriba"
                className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-silver-200 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => mover(index, 1)}
                disabled={index === blocks.length - 1}
                aria-label="Mover bloque hacia abajo"
                className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-silver-200 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => eliminar(block.key)}
                aria-label={`Eliminar el bloque ${index + 1}`}
                className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          </header>

          <div className="p-4">
            <CuerpoBloque block={block} onChange={(c) => actualizar(block.key, c)} />
          </div>
        </article>
      ))}

      {/* ── Paleta de bloques ── */}
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-700">
          Agregar bloque
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TIPOS.map((tipo) => (
            <button
              key={tipo.type}
              type="button"
              onClick={() => agregar(tipo.type)}
              className="rounded-lg border border-silver-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50"
            >
              <span className="block text-sm font-semibold text-brand-800">{tipo.etiqueta}</span>
              <span className="mt-0.5 block text-xs text-slate-700">{tipo.descripcion}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Cuerpo según el tipo ─────────────────────────

function CuerpoBloque({
  block,
  onChange,
}: {
  block: DraftBlock;
  onChange: (cambios: Partial<DraftBlock>) => void;
}) {
  switch (block.type) {
    case 'PARAGRAPH':
      return (
        <div>
          <textarea
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={5}
            placeholder="Escribe el párrafo..."
            className="input resize-y"
          />
          {/* Enlazado interno: reparte autoridad entre artículos, cursos y proyectos */}
          <p className="hint">
            Para enlazar, escribe <code>[texto del enlace](/blog/otro-articulo)</code>. Usa un texto
            que describa el destino, nunca &quot;clic aquí&quot;.
          </p>
        </div>
      );

    case 'HEADING':
      return (
        <div className="flex flex-wrap gap-3">
          <select
            value={block.level}
            onChange={(e) => onChange({ level: Number(e.target.value) })}
            aria-label="Tamaño del subtítulo"
            className="input w-32 shrink-0"
          >
            <option value={2}>Grande</option>
            <option value={3}>Mediano</option>
          </select>
          <input
            type="text"
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Texto del subtítulo"
            className="input min-w-0 flex-1"
          />
          <p className="hint w-full">
            Usa "Grande" para cada tema nuevo y "Mediano" para dividir un tema en partes.
          </p>
        </div>
      );

    case 'QUOTE':
      return (
        <div className="space-y-3">
          <textarea
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={3}
            placeholder="Texto de la cita..."
            className="input resize-y"
          />
          <input
            type="text"
            value={block.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="Autor de la cita (opcional)"
            className="input"
          />
        </div>
      );

    case 'LIST':
      return (
        <div className="space-y-3">
          <select
            value={block.listStyle}
            onChange={(e) => onChange({ listStyle: e.target.value as 'bullet' | 'number' })}
            aria-label="Estilo de la lista"
            className="input w-44"
          >
            <option value="bullet">Viñetas</option>
            <option value="number">Numerada</option>
          </select>
          <textarea
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={5}
            placeholder={'Un elemento por línea:\nPrimer punto\nSegundo punto'}
            className="input resize-y font-mono text-sm"
          />
          <p className="hint">Cada línea se convierte en un elemento de la lista.</p>
        </div>
      );

    case 'IMAGE':
      return (
        <div className="space-y-3">
          <SubidorArchivo
            kind="IMAGE"
            media={block.media}
            onUploaded={(media) => onChange({ media, mediaId: media.id })}
            onClear={() => onChange({ media: null, mediaId: null })}
          />
          <div>
            <label className="label">
              Texto alternativo (alt) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={block.alt}
              onChange={(e) => onChange({ alt: e.target.value })}
              placeholder="Describe la imagen: qué se ve y por qué importa"
              className="input"
            />
            <p className="hint">
              Obligatorio. Es lo que leen Google y los lectores de pantalla; sin él no se puede
              publicar el artículo.
            </p>
          </div>
          <div>
            <label className="label">Pie de foto (opcional)</label>
            <input
              type="text"
              value={block.caption}
              onChange={(e) => onChange({ caption: e.target.value })}
              className="input"
            />
          </div>
        </div>
      );

    case 'VIDEO':
      return (
        <div className="space-y-3">
          <SubidorArchivo
            kind="VIDEO"
            media={block.media}
            onUploaded={(media) => onChange({ media, mediaId: media.id })}
            onClear={() => onChange({ media: null, mediaId: null })}
          />
          <div>
            <label className="label">Descripción del video</label>
            <input
              type="text"
              value={block.caption}
              onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="De qué trata el video"
              className="input"
            />
            <p className="hint">
              Google no puede ver el video: este texto es lo único que le dice de qué trata.
            </p>
          </div>
        </div>
      );

    case 'EMBED':
      return (
        <div className="space-y-3">
          <div>
            <label className="label">Enlace de YouTube o Vimeo</label>
            <input
              type="url"
              value={block.embedUrl}
              onChange={(e) => onChange({ embedUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              className="input"
            />
          </div>
          <input
            type="text"
            value={block.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="Descripción del video (opcional)"
            className="input"
          />
        </div>
      );

    case 'DIVIDER':
      return (
        <div className="flex items-center gap-3 py-2">
          <hr className="flex-1 border-silver-300" />
          <span className="text-xs text-slate-600">Separador visual</span>
          <hr className="flex-1 border-silver-300" />
        </div>
      );

    default:
      return null;
  }
}

// ───────────────────────── Subida de archivos ─────────────────────────

/**
 * Sube la imagen o el video al servidor y devuelve el registro creado.
 * Muestra barra de progreso porque un video de 500 MB tarda, y sin
 * retroalimentación el admin cree que se colgó.
 */
export function SubidorArchivo({
  kind,
  media,
  onUploaded,
  onClear,
}: {
  kind: 'IMAGE' | 'VIDEO';
  media: MediaDTO | null;
  onUploaded: (media: MediaDTO) => void;
  onClear: () => void;
}) {
  const [progreso, setProgreso] = useState<UploadProgress | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxMb = kind === 'IMAGE' ? MAX_IMAGE_MB : MAX_VIDEO_MB;
  const endpoint = kind === 'IMAGE' ? '/admin/media/images' : '/admin/media/videos';
  const accept = kind === 'IMAGE' ? 'image/*' : 'video/mp4,video/webm,video/ogg,video/quicktime';

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    // Validamos antes de subir: así no esperamos 500 MB para recibir un 413
    if (file.size > maxMb * 1024 * 1024) {
      setError(`El archivo pesa ${formatBytes(file.size)} y el máximo es ${maxMb} MB.`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setProgreso({ loaded: 0, total: file.size, percent: 0 });

    const { promise, abort } = uploadFile(endpoint, file, {}, setProgreso);
    abortRef.current = abort;

    try {
      const subido = await promise;
      onUploaded(subido);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo');
    } finally {
      setProgreso(null);
      abortRef.current = null;
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  if (media) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-silver-200 bg-silver-100/60 p-3">
        {media.kind === 'IMAGE' ? (
          <img
            src={media.url}
            alt=""
            className="h-24 w-32 rounded-lg border border-silver-200 object-cover"
          />
        ) : (
          <video
            src={media.url}
            controls
            preload="metadata"
            className="h-24 w-40 rounded-lg border border-silver-200 bg-black"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brand-900">{media.originalName}</p>
          <p className="mt-0.5 text-xs text-slate-700">
            {formatBytes(media.sizeBytes)}
            {media.width && media.height ? ` · ${media.width}×${media.height} px` : ''}
          </p>
        </div>

        <button type="button" onClick={onClear} className="btn-secondary btn-sm">
          Cambiar archivo
        </button>
      </div>
    );
  }

  return (
    <div>
      {progreso ? (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-brand-800">
            <span>Subiendo... {progreso.percent}%</span>
            <button
              type="button"
              onClick={() => abortRef.current?.()}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Cancelar
            </button>
          </div>

          <div
            className="mt-2.5 h-2 overflow-hidden rounded-full bg-brand-200"
            role="progressbar"
            aria-valuenow={progreso.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${progreso.percent}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-brand-700">
            {formatBytes(progreso.loaded)} de {formatBytes(progreso.total)}
          </p>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-silver-300 bg-silver-100/50 px-4 py-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50">
          <span className="text-sm font-semibold text-brand-700">
            {kind === 'IMAGE' ? 'Seleccionar imagen' : 'Seleccionar video'}
          </span>
          <span className="mt-1 text-xs text-slate-700">
            {kind === 'IMAGE' ? 'JPG, PNG, WebP o AVIF' : 'MP4, WebM o MOV'} · máximo {maxMb} MB
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFile}
            className="sr-only"
          />
        </label>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
