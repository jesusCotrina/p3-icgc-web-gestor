import type { MediaDTO } from '@/lib/types';
import { SubidorArchivo } from './BlockEditor';

/**
 * Foto de portada + su texto alternativo, que es obligatorio para publicar.
 * El archivo se sube al servidor (backend/uploads); al guardar con otra foto,
 * el backend borra la anterior si nadie más la usa.
 */
export function FotoConAlt({
  id,
  media,
  alt,
  onMedia,
  onAlt,
  placeholder,
}: {
  id: string;
  media: MediaDTO | null;
  alt: string;
  onMedia: (media: MediaDTO | null) => void;
  onAlt: (alt: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-4">
      <SubidorArchivo
        kind="IMAGE"
        media={media}
        onUploaded={(subida) => {
          onMedia(subida);
          if (!alt.trim() && subida.alt) onAlt(subida.alt);
        }}
        onClear={() => onMedia(null)}
      />

      <div>
        <label htmlFor={id} className="label">
          Texto alternativo de la foto <span className="text-red-500">*</span>
        </label>
        <input
          id={id}
          type="text"
          value={alt}
          onChange={(e) => onAlt(e.target.value)}
          placeholder={placeholder}
          maxLength={300}
          className="input"
        />
        <p className="hint">
          Describe lo que se ve en la foto. Google lo usa para entender la imagen y los lectores de
          pantalla lo leen en voz alta.
        </p>
      </div>
    </div>
  );
}
