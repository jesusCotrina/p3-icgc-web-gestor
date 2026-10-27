import { Link } from 'react-router-dom';
import {
  IconoBasura,
  IconoEnlaceExterno,
  IconoLapiz,
  IconoOjo,
  IconoOjoTachado,
} from './Iconos';

/**
 * Botones de acción de los listados (editar, ver, publicar/ocultar, eliminar)
 * como íconos con trazo grueso. El texto va en aria-label y en el globo que
 * aparece al pasar el mouse (title), así nadie se queda sin saber qué hace.
 */

const base =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';

const TONOS = {
  normal: 'border-silver-200 bg-white text-slate-900 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
  publicar: 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100',
  peligro: 'border-red-200 bg-white text-red-700 hover:bg-red-50',
} as const;

const GROSOR = 2.6;

export function BotonEditar({ to, etiqueta }: { to: string; etiqueta: string }) {
  return (
    <Link to={to} aria-label={etiqueta} title="Editar" className={`${base} ${TONOS.normal}`}>
      <IconoLapiz size={18} grosor={GROSOR} />
    </Link>
  );
}

export function BotonVer({ href, etiqueta }: { href: string; etiqueta: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={etiqueta}
      title="Ver en la web"
      className={`${base} ${TONOS.normal}`}
    >
      <IconoEnlaceExterno size={18} grosor={GROSOR} />
    </a>
  );
}

/** Publicado: ojo abierto (clic = ocultar). Oculto: ojo tachado en verde (clic = publicar). */
export function BotonVisibilidad({
  publicado,
  onClick,
  etiqueta,
}: {
  publicado: boolean;
  onClick: () => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={publicado ? 'Visible en la web · clic para ocultar' : 'Oculto · clic para publicar'}
      className={`${base} ${publicado ? TONOS.normal : TONOS.publicar}`}
    >
      {publicado ? (
        <IconoOjo size={18} grosor={GROSOR} />
      ) : (
        <IconoOjoTachado size={18} grosor={GROSOR} />
      )}
    </button>
  );
}

export function BotonEliminar({ onClick, etiqueta }: { onClick: () => void; etiqueta: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title="Eliminar"
      className={`${base} ${TONOS.peligro}`}
    >
      <IconoBasura size={18} grosor={GROSOR} />
    </button>
  );
}
