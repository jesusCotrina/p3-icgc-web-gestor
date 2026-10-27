import type { DraftBlock, SeoAudit, SeoIssue } from '@/lib/types';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000';

export const TITULO_MAX = 60;
export const DESC_MIN = 120;
export const DESC_MAX = 160;

type Props = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  excerpt: string;
  blocks: DraftBlock[];
  coverImageId: string | null;
  coverAlt: string;
  /** Lo que respondió el servidor al intentar publicar, si faltaba algo */
  audit: SeoAudit | null;
};

/** Título que verá Google: el escrito para Google o, si no hay, el del artículo. */
export function tituloParaGoogle(title: string, metaTitle: string): string {
  return (metaTitle || (title ? `${title} | ICGC` : '')).trim();
}

/** Texto bajo el título en Google: el escrito para Google, el resumen o el primer párrafo. */
export function textoParaGoogle(metaDescription: string, excerpt: string, blocks: DraftBlock[]) {
  const primerParrafo = blocks.find((b) => b.type === 'PARAGRAPH' && b.text.trim())?.text ?? '';
  const texto = (metaDescription || excerpt || primerParrafo).trim().replace(/\s+/g, ' ');
  return texto.length <= 200 ? texto : `${texto.slice(0, 197).trimEnd()}...`;
}

/**
 * Panel lateral: qué tan listo está el artículo para que lo encuentren en
 * Google y qué le falta, en palabras sencillas. Los avisos son inmediatos
 * (mientras se escribe); al publicar, el servidor hace la revisión final.
 */
export function SeoPanel({
  title,
  slug,
  metaTitle,
  metaDescription,
  focusKeyword,
  excerpt,
  blocks,
  coverImageId,
  coverAlt,
  audit,
}: Props) {
  const tituloFinal = tituloParaGoogle(title, metaTitle);
  const descFinal = textoParaGoogle(metaDescription, excerpt, blocks);

  const palabras = contarPalabras(blocks, title);
  const avisos = revisarEnVivo({
    title,
    slug,
    tituloFinal,
    descFinal,
    focusKeyword,
    blocks,
    coverImageId,
    coverAlt,
    palabras,
  });

  return (
    <SaludSeo
      avisos={avisos}
      audit={audit}
      detalle={
        <>
          Tiene <strong>{palabras}</strong> palabras.
        </>
      }
      textoListo="¡Todo listo! El artículo está perfecto para publicarse."
    />
  );
}

/**
 * Puntaje y revisión en palabras sencillas. Lo usan el blog, los cursos y los
 * proyectos: cada editor arma sus avisos con sus propias reglas.
 */
export function SaludSeo({
  avisos,
  audit = null,
  detalle,
  textoListo,
}: {
  avisos: SeoIssue[];
  /** Lo que respondió el servidor al intentar publicar, si faltaba algo */
  audit?: SeoAudit | null;
  /** Dato extra bajo el puntaje (palabras, letras, etc.) */
  detalle?: React.ReactNode;
  textoListo: string;
}) {
  const errores = avisos.filter((a) => a.level === 'error');
  const consejos = avisos.filter((a) => a.level === 'warning');
  const puntaje = Math.max(0, 100 - errores.length * 20 - consejos.length * 5);
  const nivel =
    puntaje >= 80
      ? { texto: '¡Muy bien!', color: 'text-green-700', barra: 'bg-green-500' }
      : puntaje >= 50
        ? { texto: 'Va bien, se puede mejorar', color: 'text-amber-700', barra: 'bg-amber-500' }
        : { texto: 'Le falta trabajo', color: 'text-red-700', barra: 'bg-red-500' };

  return (
    <div className="space-y-4">
      {/* ── Puntaje ── */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">Salud SEO</h3>
          <span className={`text-3xl font-extrabold ${nivel.color}`}>{puntaje}</span>
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-silver-200">
          <div
            className={`h-full rounded-full transition-all ${nivel.barra}`}
            style={{ width: `${puntaje}%` }}
          />
        </div>

        <p className={`mt-3 text-sm font-bold ${nivel.color}`}>{nivel.texto}</p>
        <p className="mt-1 text-sm text-slate-800">
          {errores.length === 0
            ? 'Ya se puede publicar.'
            : `Faltan ${errores.length} ${errores.length === 1 ? 'cosa' : 'cosas'} para poder publicar.`}{' '}
          {detalle}
        </p>
      </section>

      {/* ── Revisión ── */}
      <section className="card p-5">
        <h3 className="text-base font-extrabold text-slate-900">Revisión</h3>

        {avisos.length === 0 ? (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2.5 text-sm font-medium text-green-900">
            {textoListo}
          </p>
        ) : (
          <>
            {errores.length > 0 && (
              <>
                <p className="mt-3 text-sm font-bold text-red-700">Para publicar, falta:</p>
                <ul className="mt-2 space-y-2">
                  {errores.map((issue, i) => (
                    <Aviso key={`e${i}`} issue={issue} />
                  ))}
                </ul>
              </>
            )}
            {consejos.length > 0 && (
              <>
                <p className="mt-4 text-sm font-bold text-amber-800">
                  Consejos para que más gente lo encuentre:
                </p>
                <ul className="mt-2 space-y-2">
                  {consejos.map((issue, i) => (
                    <Aviso key={`w${i}`} issue={issue} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {/* Si el servidor no dejó publicar, mostramos lo que dijo */}
        {audit && audit.errors.length > 0 && (
          <div className="mt-4 border-t border-silver-200 pt-4">
            <p className="text-sm font-bold text-red-700">No se pudo publicar porque:</p>
            <ul className="mt-2 space-y-2">
              {audit.errors.map((issue, i) => (
                <Aviso key={`s${i}`} issue={issue} />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Vista previa de cómo sale el artículo en Google, imitando la página de
 * resultados: barra de búsqueda con lo que escribiría la gente y el ícono
 * del sitio al lado del nombre, como hace Google.
 */
export function VistaGoogle({
  titulo,
  descripcion,
  slug,
  busqueda,
  nombreSitio,
  logoUrl,
  ruta = 'blog',
}: {
  titulo: string;
  descripcion: string;
  slug: string;
  busqueda: string;
  nombreSitio: string;
  logoUrl: string | null;
  /** Sección de la web: blog, cursos... */
  ruta?: string;
}) {
  const dominio = SITE_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  return (
    <div className="overflow-hidden rounded-xl border border-silver-300 bg-white">
      {/* Cabecera de Google */}
      <div className="flex items-center gap-3 border-b border-silver-200 px-4 py-3">
        <span className="text-xl font-semibold tracking-tight" aria-label="Google">
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#EA4335]">o</span>
          <span className="text-[#FBBC05]">o</span>
          <span className="text-[#4285F4]">g</span>
          <span className="text-[#34A853]">l</span>
          <span className="text-[#EA4335]">e</span>
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-silver-300 px-3.5 py-1.5 shadow-sm">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4d5156"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="truncate text-sm text-[#202124]">
            {busqueda || 'cómo te buscaría la gente'}
          </span>
        </div>
      </div>

      {/* Resultado */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-silver-200 bg-white">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-[0.55rem] font-black text-brand-700">ICGC</span>
            )}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm text-[#202124]">{nombreSitio}</p>
            <p className="truncate text-xs text-[#4d5156]">
              https://{dominio} › {ruta} › {slug || '...'}
            </p>
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-xl leading-snug text-[#1a0dab]">
          {titulo || 'El título que verá la gente'}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#4d5156]">
          {descripcion || 'Aquí aparecerá el texto que la gente lee antes de entrar.'}
        </p>
      </div>
    </div>
  );
}

/** Contador de letras: verde si está bien, ámbar si es corto, rojo si se pasa. */
export function Contador({ actual, min, max }: { actual: number; min?: number; max: number }) {
  const corto = min !== undefined && actual > 0 && actual < min;
  const largo = actual > max;
  const color =
    actual === 0
      ? 'text-slate-700'
      : largo
        ? 'text-red-700'
        : corto
          ? 'text-amber-700'
          : 'text-green-700';
  return (
    <span className={`text-xs font-bold ${color}`}>
      {actual} / {max} letras
    </span>
  );
}

function Aviso({ issue }: { issue: SeoIssue }) {
  const esError = issue.level === 'error';
  return (
    <li
      className={`flex gap-2 rounded-lg px-3 py-2 text-sm leading-relaxed ${
        esError ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'
      }`}
    >
      <span aria-hidden="true" className="font-extrabold">
        {esError ? '•' : '→'}
      </span>
      {issue.message}
    </li>
  );
}

// ───────────────────────── Reglas en vivo ─────────────────────────

function contarPalabras(blocks: DraftBlock[], title: string): number {
  const texto = [title, ...blocks.map((b) => `${b.text} ${b.caption}`)].join(' ');
  return texto.split(/\s+/).filter(Boolean).length;
}

const varias = (n: number, una: string, muchas: string) =>
  n === 1 ? `1 ${una}` : `${n} ${muchas}`;

/**
 * Espejo de backend/src/services/seo.service.ts (mismas reglas y mismos
 * mensajes). Se duplica a propósito: el editor avisa mientras escribes, sin
 * esperar al servidor. La revisión final al publicar la hace el backend.
 */
function revisarEnVivo(data: {
  title: string;
  slug: string;
  tituloFinal: string;
  descFinal: string;
  focusKeyword: string;
  blocks: DraftBlock[];
  coverImageId: string | null;
  coverAlt: string;
  palabras: number;
}): SeoIssue[] {
  const avisos: SeoIssue[] = [];
  const kw = data.focusKeyword.trim().toLowerCase();
  const error = (field: string, message: string) => avisos.push({ field, message, level: 'error' });
  const consejo = (field: string, message: string) =>
    avisos.push({ field, message, level: 'warning' });

  if (!data.title.trim()) error('title', 'Ponle un título al artículo');
  if (!data.descFinal) {
    error(
      'metaDescription',
      'Escribe un resumen o el primer párrafo: es lo que la gente ve antes de abrir el artículo',
    );
  } else if (data.descFinal.length < 50) {
    error(
      'metaDescription',
      `El texto para Google es muy corto (${data.descFinal.length} letras). Escribe al menos 50`,
    );
  }
  if (!data.coverImageId) {
    error(
      'coverImage',
      'Sube una imagen de portada: sin ella el artículo se ve vacío al compartirlo',
    );
  } else if (!data.coverAlt.trim()) {
    error('coverAlt', 'Describe en una frase qué se ve en la imagen de portada');
  }

  const sinAlt = data.blocks.filter((b) => b.type === 'IMAGE' && !b.alt.trim()).length;
  if (sinAlt > 0) {
    error('blocks', `Describe qué se ve en ${varias(sinAlt, 'imagen', 'imágenes')} del artículo`);
  }

  const sinArchivo = data.blocks.filter(
    (b) => (b.type === 'IMAGE' || b.type === 'VIDEO') && !b.mediaId,
  ).length;
  if (sinArchivo > 0) {
    error(
      'blocks',
      `Sube el archivo de ${varias(sinArchivo, 'imagen o video', 'imágenes o videos')}`,
    );
  }

  const vacios = data.blocks.filter(
    (b) => ['PARAGRAPH', 'HEADING', 'QUOTE', 'LIST'].includes(b.type) && !b.text.trim(),
  ).length;
  if (vacios > 0) {
    error(
      'blocks',
      `Hay ${varias(vacios, 'bloque vacío', 'bloques vacíos')}: escríbelos o bórralos`,
    );
  }

  // ── Consejos ──
  if (data.tituloFinal.length > TITULO_MAX) {
    consejo(
      'metaTitle',
      `El título para Google es largo (${data.tituloFinal.length} letras): Google corta cerca de ${TITULO_MAX}`,
    );
  }
  if (data.descFinal.length > DESC_MAX) {
    consejo(
      'metaDescription',
      `El texto para Google es largo (${data.descFinal.length} letras): Google corta cerca de ${DESC_MAX}`,
    );
  }
  if (data.palabras < 300) {
    consejo(
      'content',
      `El artículo tiene ${data.palabras} palabras. Con más de 300 Google lo valora más`,
    );
  }
  if (!data.blocks.some((b) => b.type === 'HEADING')) {
    consejo('blocks', 'Agrega algún subtítulo: separa el texto y se lee mejor');
  }

  if (!kw) {
    consejo(
      'focusKeyword',
      'Escribe cómo te buscaría la gente en Google (por ejemplo: gestión comunal)',
    );
  } else {
    if (!data.title.toLowerCase().includes(kw)) consejo('title', `Usa "${kw}" en el título`);
    if (!data.descFinal.toLowerCase().includes(kw)) {
      consejo('metaDescription', `Usa "${kw}" en el texto para Google`);
    }
  }

  const videosSinTexto = data.blocks.filter((b) => b.type === 'VIDEO' && !b.caption.trim()).length;
  if (videosSinTexto > 0) {
    consejo(
      'blocks',
      `Agrega una descripción a ${varias(videosSinTexto, 'video', 'videos')}: Google no puede ver el video, solo leer el texto`,
    );
  }

  return avisos;
}
