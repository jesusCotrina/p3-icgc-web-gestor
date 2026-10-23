import type { DraftBlock, SeoAudit, SeoIssue } from '@/lib/types';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000';

const TITULO_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 160;

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
  /** Auditoría devuelta por el backend, si ya se guardó el artículo */
  audit: SeoAudit | null;
};

/**
 * Panel lateral de SEO.
 *
 * Muestra cómo se verá el artículo en Google y qué le falta para posicionar.
 * Los avisos locales son inmediatos (mientras se escribe); la auditoría del
 * backend es la que manda a la hora de publicar.
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
  const tituloFinal = (metaTitle || `${title} | ICGC`).trim();
  const descFinal = (metaDescription || excerpt).trim();

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

  const errores = avisos.filter((a) => a.level === 'error');
  const advertencias = avisos.filter((a) => a.level === 'warning');
  const puntaje = Math.max(0, 100 - errores.length * 20 - advertencias.length * 5);

  return (
    <div className="space-y-4">
      {/* ── Puntaje ── */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-brand-900">Salud SEO</h3>
          <span
            className={`text-2xl font-extrabold ${
              puntaje >= 80 ? 'text-green-600' : puntaje >= 50 ? 'text-amber-600' : 'text-red-600'
            }`}
          >
            {puntaje}
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-silver-200">
          <div
            className={`h-full rounded-full transition-all ${
              puntaje >= 80 ? 'bg-green-500' : puntaje >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${puntaje}%` }}
          />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {errores.length === 0
            ? 'El artículo cumple los requisitos mínimos para publicarse.'
            : `Faltan ${errores.length} requisito(s) obligatorio(s) para poder publicar.`}
        </p>
      </section>

      {/* ── Vista previa en Google ── */}
      <section className="card p-5">
        <h3 className="text-sm font-bold text-brand-900">Así se vería en Google</h3>

        <div className="mt-4 rounded-lg border border-silver-200 p-3.5">
          <p className="truncate text-xs text-[#202124]">
            {SITE_URL.replace(/^https?:\/\//, '')} › blog › {slug || 'url-del-articulo'}
          </p>
          <p className="mt-1 line-clamp-2 text-[1.0625rem] leading-snug text-[#1a0dab]">
            {tituloFinal || 'Título del artículo'}
          </p>
          <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-[#4d5156]">
            {descFinal || 'La meta descripción aparecerá aquí.'}
          </p>
        </div>

        <ul className="mt-4 space-y-2 text-xs">
          <Contador
            etiqueta="Título SEO"
            actual={tituloFinal.length}
            max={TITULO_MAX}
            consejo={`Google corta cerca de ${TITULO_MAX} caracteres`}
          />
          <Contador
            etiqueta="Meta descripción"
            actual={descFinal.length}
            min={DESC_MIN}
            max={DESC_MAX}
            consejo={`Lo ideal son ${DESC_MIN}-${DESC_MAX} caracteres`}
          />
          <li className="flex items-center justify-between gap-2 text-slate-600">
            <span>Palabras del artículo</span>
            <span className={palabras >= 300 ? 'font-semibold text-green-600' : 'font-semibold text-amber-600'}>
              {palabras}
            </span>
          </li>
        </ul>
      </section>

      {/* ── Lista de revisión ── */}
      <section className="card p-5">
        <h3 className="text-sm font-bold text-brand-900">Revisión</h3>

        {avisos.length === 0 ? (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2.5 text-xs text-green-800">
            Todo en orden. El artículo está listo para publicarse.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {errores.map((issue, i) => (
              <Aviso key={`e${i}`} issue={issue} />
            ))}
            {advertencias.map((issue, i) => (
              <Aviso key={`w${i}`} issue={issue} />
            ))}
          </ul>
        )}

        {/* Si el backend rechazó la publicación, mostramos sus motivos */}
        {audit && audit.errors.length > 0 && (
          <div className="mt-4 border-t border-silver-200 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">
              Bloqueos del servidor
            </p>
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

function Aviso({ issue }: { issue: SeoIssue }) {
  const esError = issue.level === 'error';
  return (
    <li
      className={`flex gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed ${
        esError ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
      }`}
    >
      <span aria-hidden="true" className="font-bold">
        {esError ? '!' : '?'}
      </span>
      {issue.message}
    </li>
  );
}

function Contador({
  etiqueta,
  actual,
  min,
  max,
  consejo,
}: {
  etiqueta: string;
  actual: number;
  min?: number;
  max: number;
  consejo: string;
}) {
  const corto = min !== undefined && actual > 0 && actual < min;
  const largo = actual > max;
  const color = largo ? 'text-red-600' : corto ? 'text-amber-600' : 'text-green-600';

  return (
    <li className="flex items-center justify-between gap-2 text-slate-600">
      <span title={consejo}>{etiqueta}</span>
      <span className={`font-semibold ${actual === 0 ? 'text-slate-400' : color}`}>
        {actual} / {max}
      </span>
    </li>
  );
}

// ───────────────────────── Reglas en vivo ─────────────────────────

function contarPalabras(blocks: DraftBlock[], title: string): number {
  const texto = [title, ...blocks.map((b) => `${b.text} ${b.caption}`)].join(' ');
  return texto.split(/\s+/).filter(Boolean).length;
}

/**
 * Espejo de backend/src/services/seo.service.ts.
 * Se duplica a propósito: el editor avisa mientras escribes, sin esperar al
 * servidor. La fuente de verdad al publicar sigue siendo el backend.
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

  if (!data.title.trim()) {
    avisos.push({ field: 'title', message: 'Falta el título del artículo', level: 'error' });
  }
  if (!data.descFinal) {
    avisos.push({
      field: 'metaDescription',
      message: 'Falta la meta descripción: es el texto que Google muestra bajo el título',
      level: 'error',
    });
  } else if (data.descFinal.length < 50) {
    avisos.push({
      field: 'metaDescription',
      message: `La meta descripción es muy corta (${data.descFinal.length} caracteres, mínimo 50)`,
      level: 'error',
    });
  }
  if (!data.coverImageId) {
    avisos.push({
      field: 'coverImage',
      message: 'Falta la imagen de portada',
      level: 'error',
    });
  } else if (!data.coverAlt.trim()) {
    avisos.push({
      field: 'coverAlt',
      message: 'La imagen de portada necesita texto alternativo (alt)',
      level: 'error',
    });
  }

  const sinAlt = data.blocks.filter((b) => b.type === 'IMAGE' && !b.alt.trim()).length;
  if (sinAlt > 0) {
    avisos.push({
      field: 'blocks',
      message: `${sinAlt} imagen(es) sin texto alternativo (alt)`,
      level: 'error',
    });
  }

  const sinArchivo = data.blocks.filter(
    (b) => (b.type === 'IMAGE' || b.type === 'VIDEO') && !b.mediaId,
  ).length;
  if (sinArchivo > 0) {
    avisos.push({
      field: 'blocks',
      message: `${sinArchivo} bloque(s) multimedia sin archivo subido`,
      level: 'error',
    });
  }

  const vacios = data.blocks.filter(
    (b) => ['PARAGRAPH', 'HEADING', 'QUOTE', 'LIST'].includes(b.type) && !b.text.trim(),
  ).length;
  if (vacios > 0) {
    avisos.push({
      field: 'blocks',
      message: `Hay ${vacios} bloque(s) de texto vacíos`,
      level: 'error',
    });
  }

  // ── Avisos ──
  if (data.tituloFinal.length > TITULO_MAX) {
    avisos.push({
      field: 'metaTitle',
      message: `El título SEO tiene ${data.tituloFinal.length} caracteres y Google corta cerca de ${TITULO_MAX}`,
      level: 'warning',
    });
  }
  if (data.descFinal.length > DESC_MAX) {
    avisos.push({
      field: 'metaDescription',
      message: `La meta descripción supera los ${DESC_MAX} caracteres recomendados`,
      level: 'warning',
    });
  }
  if (data.palabras < 300) {
    avisos.push({
      field: 'content',
      message: `El artículo tiene ${data.palabras} palabras; por debajo de 300 suele verse superficial`,
      level: 'warning',
    });
  }
  if (!data.blocks.some((b) => b.type === 'HEADING')) {
    avisos.push({
      field: 'blocks',
      message: 'No hay subtítulos (H2). Dividir el texto ayuda al lector y a Google',
      level: 'warning',
    });
  }

  if (!kw) {
    avisos.push({
      field: 'focusKeyword',
      message: 'Define una palabra clave objetivo para poder revisar su uso',
      level: 'warning',
    });
  } else {
    if (!data.title.toLowerCase().includes(kw)) {
      avisos.push({
        field: 'title',
        message: `La palabra clave "${kw}" no aparece en el título`,
        level: 'warning',
      });
    }
    if (!data.slug.includes(kw.replace(/\s+/g, '-'))) {
      avisos.push({
        field: 'slug',
        message: `La palabra clave "${kw}" no aparece en la URL`,
        level: 'warning',
      });
    }
    if (!data.descFinal.toLowerCase().includes(kw)) {
      avisos.push({
        field: 'metaDescription',
        message: `La palabra clave "${kw}" no aparece en la meta descripción`,
        level: 'warning',
      });
    }
  }

  const videosSinTexto = data.blocks.filter(
    (b) => b.type === 'VIDEO' && !b.caption.trim(),
  ).length;
  if (videosSinTexto > 0) {
    avisos.push({
      field: 'blocks',
      message: `${videosSinTexto} video(s) sin descripción`,
      level: 'warning',
    });
  }

  return avisos;
}
