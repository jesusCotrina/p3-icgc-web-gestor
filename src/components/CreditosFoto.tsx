import { useState } from 'react';
import { mediaApi } from '@/lib/api';
import type { MediaDTO } from '@/lib/types';

/**
 * Créditos de una foto ya subida: autor, fuente y enlace de la fuente.
 *
 * Se guardan en el archivo (Multimedia), no en el artículo: así valen para
 * cualquier artículo que use la misma foto. Se graban al salir de cada campo.
 * La web los muestra bajo la foto como "Foto: autor · Fuente: nombre".
 *
 * Usar con key={media.id} para que al subir otra foto se carguen sus datos.
 */
export function CreditosFoto({
  media,
  idBase,
  onChange,
}: {
  media: MediaDTO;
  /** Prefijo de los ids de los campos (varias fotos en la misma página) */
  idBase: string;
  onChange: (media: MediaDTO) => void;
}) {
  const [author, setAuthor] = useState(media.author ?? '');
  const [source, setSource] = useState(media.source ?? '');
  const [sourceUrl, setSourceUrl] = useState(media.sourceUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function guardar() {
    const datos = {
      author: author.trim() || null,
      source: source.trim() || null,
      sourceUrl: sourceUrl.trim() || null,
    };
    const sinCambios =
      datos.author === (media.author ?? null) &&
      datos.source === (media.source ?? null) &&
      datos.sourceUrl === (media.sourceUrl ?? null);
    if (sinCambios) return;

    setError(null);
    try {
      const actualizado = await mediaApi.update(media.id, datos);
      onChange(actualizado);
      setGuardado(true);
      window.setTimeout(() => setGuardado(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los créditos');
    }
  }

  return (
    <div>
      <p className="label">Créditos de la foto (opcional)</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${idBase}-autor`} className="sr-only">
            Autor de la foto
          </label>
          <input
            id={`${idBase}-autor`}
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            onBlur={() => void guardar()}
            placeholder="Autor: Equipo ICGC"
            maxLength={150}
            className="input"
          />
        </div>
        <div>
          <label htmlFor={`${idBase}-fuente`} className="sr-only">
            Fuente de la foto
          </label>
          <input
            id={`${idBase}-fuente`}
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onBlur={() => void guardar()}
            placeholder="Fuente: Wikimedia Commons"
            maxLength={150}
            className="input"
          />
        </div>
        <div>
          <label htmlFor={`${idBase}-enlace`} className="sr-only">
            Enlace de la fuente
          </label>
          <input
            id={`${idBase}-enlace`}
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            onBlur={() => void guardar()}
            placeholder="Enlace: https://..."
            maxLength={500}
            className="input"
          />
        </div>
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        <p className="hint">
          Se muestran bajo la foto en el blog como «Foto: autor · Fuente». Se guardan solos al
          salir de cada campo.{guardado && ' Guardado.'}
        </p>
      )}
    </div>
  );
}
