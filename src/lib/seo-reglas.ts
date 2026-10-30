import { DESC_MAX, TITULO_MAX } from '@/components/SeoPanel';
import type { SeoIssue } from './types';

/**
 * Reglas de "Salud SEO" para cursos y proyectos. Se revisan en vivo mientras
 * se escribe, igual que en el blog; los mensajes van en palabras sencillas.
 */

type Avisos = {
  lista: SeoIssue[];
  error: (field: string, message: string) => void;
  consejo: (field: string, message: string) => void;
};

function crearAvisos(): Avisos {
  const lista: SeoIssue[] = [];
  return {
    lista,
    error: (field, message) => lista.push({ field, message, level: 'error' }),
    consejo: (field, message) => lista.push({ field, message, level: 'warning' }),
  };
}

const unir = (texto: string) => texto.trim().replace(/\s+/g, ' ');

/** Lo que Google corta al mostrarlo: "..." al final, como en los resultados. */
const recortar = (texto: string, max: number) =>
  texto.length <= max ? texto : `${texto.slice(0, max - 3).trimEnd()}...`;

// ───────────────────────────── Cursos ─────────────────────────────

/**
 * Espejo de frontend-web/src/app/cursos/[slug]/page.tsx: el título y la
 * descripción de la página del curso se arman solos con estos datos.
 */
export function tituloCurso(nombre: string): string {
  const completo = `${nombre.trim()} | Curso ICGC`;
  return completo.length <= TITULO_MAX ? completo : nombre.trim();
}

export function descripcionCurso(c: { summary: string; lectiveHours: number; modality: string }) {
  if (!c.summary.trim()) return '';
  const texto = unir(
    `${c.summary} ${c.lectiveHours} horas lectivas, ${c.modality.toLowerCase()}, con certificado.`,
  );
  return recortar(texto, DESC_MAX);
}

export function revisarCurso(c: {
  name: string;
  summary: string;
  coverImage: unknown;
  coverAlt: string;
  topics: string[];
  objective: string;
  audience: string;
  price: string;
}): SeoIssue[] {
  const { lista, error, consejo } = crearAvisos();
  const resumen = unir(c.summary);
  const temas = c.topics.filter((t) => t.trim()).length;

  if (!c.name.trim()) error('name', 'Ponle un nombre al curso');
  if (resumen.length < 20) {
    error('summary', 'Escribe la descripción del curso (al menos 20 letras): es lo que Google muestra');
  }
  if (!c.coverImage) error('coverImage', 'Sube la foto del curso');
  else if (!c.coverAlt.trim()) error('coverAlt', 'Escribe qué se ve en la foto del curso');
  if (temas === 0) error('topics', 'Agrega al menos un tema al contenido del programa');
  if (!(Number(c.price.replace(',', '.')) > 0)) error('price', 'Indica el precio del curso');

  // ── Consejos ──
  if (`${c.name.trim()} | Curso ICGC`.length > TITULO_MAX) {
    consejo(
      'name',
      `El nombre es largo (${c.name.trim().length} letras): en Google saldrá sin "| Curso ICGC"`,
    );
  }
  if (resumen.length >= 20 && resumen.length < 80) {
    consejo('summary', `La descripción es corta (${resumen.length} letras). Con 80 a 130 letras se entiende mejor en Google`);
  }
  if (resumen.length > 130) {
    consejo('summary', 'La descripción es larga: Google la corta, pon lo más importante al inicio');
  }
  if (c.coverAlt.trim() && c.coverAlt.trim().length < 15) {
    consejo('coverAlt', 'Describe la foto con un poco más de detalle (por ejemplo, quién aparece y qué hacen)');
  }
  if (!c.objective.trim()) {
    consejo('objective', 'Escribe "¿Para qué le sirve al alumno?": más texto útil para que Google entienda el curso');
  }
  if (temas > 0 && temas < 3) {
    consejo('topics', 'Agrega más temas al programa: Google valora una página de curso completa');
  }
  if (c.audience.trim() && c.audience.trim().length < 15) {
    consejo('audience', 'Cuenta con más detalle a quién va dirigido el curso');
  }
  return lista;
}

// ──────────────────────────── Proyectos ────────────────────────────

export function revisarProyecto(p: {
  title: string;
  objective: string;
  coverImage: unknown;
  coverAlt: string;
  items: { title: string; description: string }[];
  company: string;
  community: string;
  location: string;
  region: string;
}): SeoIssue[] {
  const { lista, error, consejo } = crearAvisos();
  const objetivo = unir(p.objective);
  const trabajos = p.items.filter((i) => i.title.trim()).length;

  if (!p.title.trim()) error('title', 'Ponle un título al proyecto');
  if (!objetivo) error('objective', 'Escribe la descripción del proyecto');
  if (!p.company.trim()) error('company', 'Escribe la empresa con la que se trabajó');
  if (!p.community.trim()) error('community', 'Escribe la comunidad o empresa comunal');
  if (!p.location.trim()) error('location', 'Escribe la ubicación (distrito y provincia)');
  if (p.items.some((i) => !i.title.trim() && i.description.trim())) {
    error('items', 'Hay un trabajo con descripción pero sin título');
  }
  if (!p.coverImage) error('coverImage', 'Sube la foto del proyecto');
  else if (!p.coverAlt.trim()) error('coverAlt', 'Escribe qué se ve en la foto del proyecto');
  if (!p.region) error('region', 'Elige la región del proyecto');

  // ── Consejos ──
  if (p.title.trim().length > 90) {
    consejo('title', 'El título es muy largo: con menos de 90 letras se lee mejor en la tarjeta');
  }
  if (objetivo && objetivo.length < 80) {
    consejo('objective', `La descripción es corta (${objetivo.length} letras). Cuenta un poco más: qué se hizo y para quién`);
  }
  // Nombres propios del lugar (sin "comunidad", "distrito"...) que convendría ver en el título
  const comunes = new Set(['comunidad', 'campesina', 'nativa', 'distrito', 'provincia', 'región', 'region', 'ejemplo']);
  const lugares = `${p.community} ${p.location}`
    .toLowerCase()
    .split(/[\s,()]+/)
    .filter((w) => w.length >= 4 && !comunes.has(w));
  const titulo = p.title.toLowerCase();
  if (titulo.trim() && lugares.length > 0 && !lugares.some((w) => titulo.includes(w))) {
    consejo('title', 'Menciona la comunidad o el lugar en el título: la gente busca proyectos por su zona');
  }
  if (p.coverAlt.trim() && p.coverAlt.trim().length < 15) {
    consejo('coverAlt', 'Describe la foto con un poco más de detalle (qué obra o actividad se ve)');
  }
  if (trabajos === 0) {
    consejo('items', 'Agrega los trabajos realizados: muestran la experiencia y suman texto útil para Google');
  }
  return lista;
}
