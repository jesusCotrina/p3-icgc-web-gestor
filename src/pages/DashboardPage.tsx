import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconoCalendario,
  IconoDisco,
  IconoDocumento,
  IconoImagen,
  IconoMemoria,
  IconoOjo,
  IconoProcesador,
  IconoServidor,
} from '@/components/Iconos';
import { API_URL, dashboardApi } from '@/lib/api';
import { formatBytes, formatNumber, formatUptime } from '@/lib/format';
import type { DashboardStatsDTO, ServerStatsDTO } from '@/lib/types';

/** Dominio donde vive el sistema (el de la API), sin "https://". */
const DOMINIO = (() => {
  try {
    return new URL(API_URL).host;
  } catch {
    return API_URL;
  }
})();

export function DashboardPage() {
  const [data, setData] = useState<DashboardStatsDTO | null>(null);
  const [server, setServer] = useState<ServerStatsDTO | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    try {
      const result = await dashboardApi.get();
      if (!montado.current) return;
      setData(result);
      setServer(result.server);
      setError('');
    } catch (err) {
      if (montado.current) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las estadísticas');
      }
    } finally {
      if (montado.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Las métricas del servidor se refrescan solas cada 10 s.
  // El resto (publicaciones, archivos) cambia poco: no vale la pena recargarlo.
  useEffect(() => {
    const controller = new AbortController();
    const id = window.setInterval(() => {
      dashboardApi
        .serverStats(controller.signal)
        .then((stats) => montado.current && setServer(stats))
        .catch(() => {
          // Un fallo puntual del sondeo no debe romper la pantalla
        });
    }, 10_000);

    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  if (cargando) return <SkeletonDashboard />;

  if (error || !data) {
    return (
      <div className="card p-10 text-center">
        <h2 className="text-lg font-bold">No se pudieron cargar las estadísticas</h2>
        <p className="mt-2 text-sm text-slate-800">{error}</p>
        <button type="button" onClick={() => void cargar()} className="btn-primary mt-6">
          Reintentar
        </button>
      </div>
    );
  }

  const { content } = data;
  const stats = server ?? data.server;
  const sistema = stats.os.isWindows ? 'Windows' : stats.os.isLinux ? 'Linux' : stats.os.platform;
  const hayDisco = stats.disk.totalBytes > 0;

  return (
    <div className="space-y-8">
      {/* ── Publicaciones ── */}
      <section aria-labelledby="resumen-contenido">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="resumen-contenido" className="text-lg font-extrabold text-slate-900">
            Publicaciones
          </h2>
          <Link to="/blogs/nuevo" className="btn-primary btn-sm">
            + Nuevo blog
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icono={<IconoDocumento />}
            etiqueta="Artículos"
            valor={formatNumber(content.totalPosts)}
            detalle={`${content.published} publicados · ${content.drafts} borradores`}
            tono="brand"
          />
          <StatCard
            icono={<IconoCalendario />}
            etiqueta="Publicados este mes"
            valor={formatNumber(content.publishedThisMonth)}
            detalle={`${content.categories} categorías`}
            tono="green"
          />
          <StatCard
            icono={<IconoOjo />}
            etiqueta="Visitas"
            valor={formatNumber(content.totalViews)}
            detalle="Lecturas de los artículos"
            tono="violet"
          />
          <StatCard
            icono={<IconoImagen />}
            etiqueta="Archivos subidos"
            valor={formatNumber(content.mediaCount)}
            detalle={`${content.imagesCount} imágenes · ${content.videosCount} videos`}
            tono="amber"
          />
        </div>
      </section>

      {/* ── Servidor: una sola tarjeta con secciones separadas ── */}
      <section aria-labelledby="estado-servidor">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="estado-servidor" className="text-lg font-extrabold text-slate-900">
            Estado del servidor
          </h2>
          <p className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            En línea
          </p>
        </div>

        <div className="card mt-4 grid divide-y divide-silver-200 md:grid-cols-2 md:divide-y-0 xl:grid-cols-4 xl:divide-x">
          <Bloque icono={<IconoServidor />} titulo="Sistema" tono="brand">
            <p className="text-2xl font-extrabold text-slate-900">{sistema}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Fila etiqueta="Dominio" valor={DOMINIO} />
              <Fila etiqueta="Encendido hace" valor={formatUptime(stats.os.uptimeSec)} />
            </dl>
          </Bloque>

          <Bloque
            icono={<IconoProcesador />}
            titulo="Procesador"
            tono="violet"
            porcentaje={stats.cpu.usagePercent}
            className="md:border-l md:border-silver-200 xl:border-l-0"
          >
            <p className="text-sm font-semibold text-slate-800">{stats.cpu.cores} núcleos</p>
          </Bloque>

          <Bloque
            icono={<IconoMemoria />}
            titulo="Memoria"
            tono="green"
            porcentaje={stats.memory.usedPercent}
            className="md:border-t md:border-silver-200 xl:border-t-0"
          >
            <p className="text-sm font-semibold text-slate-800">
              {formatBytes(stats.memory.usedBytes)} de {formatBytes(stats.memory.totalBytes)}
            </p>
          </Bloque>

          <Bloque
            icono={<IconoDisco />}
            titulo="Almacenamiento"
            tono="amber"
            porcentaje={hayDisco ? stats.disk.usedPercent : undefined}
            className="md:border-l md:border-t md:border-silver-200 xl:border-l-0 xl:border-t-0"
          >
            {hayDisco ? (
              <dl className="space-y-1.5 text-sm">
                <Fila etiqueta="Libre" valor={formatBytes(stats.disk.freeBytes)} />
                <Fila
                  etiqueta="Usado"
                  valor={`${formatBytes(stats.disk.usedBytes)} de ${formatBytes(stats.disk.totalBytes)}`}
                />
                <Fila etiqueta="Tus archivos" valor={formatBytes(content.uploadsSizeBytes)} />
              </dl>
            ) : (
              <p className="text-sm font-semibold text-slate-800">No disponible</p>
            )}
          </Bloque>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-700">Se actualiza cada 10 segundos.</p>
      </section>

    </div>
  );
}

// ───────────────────────────── Piezas ─────────────────────────────

const TONOS = {
  brand: { caja: 'bg-brand-100 text-brand-700', detalle: 'bg-brand-50 text-brand-800' },
  green: { caja: 'bg-green-100 text-green-700', detalle: 'bg-green-50 text-green-800' },
  violet: { caja: 'bg-violet-100 text-violet-700', detalle: 'bg-violet-50 text-violet-800' },
  amber: { caja: 'bg-amber-100 text-amber-700', detalle: 'bg-amber-50 text-amber-800' },
} as const;

type Tono = keyof typeof TONOS;

function StatCard({
  icono,
  etiqueta,
  valor,
  detalle,
  tono,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
  detalle: string;
  tono: Tono;
}) {
  return (
    <article className="card flex items-start gap-4 p-5">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONOS[tono].caja}`}
      >
        {icono}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800">{etiqueta}</p>
        <p className="mt-0.5 text-3xl font-extrabold text-slate-900">{valor}</p>
        <p
          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TONOS[tono].detalle}`}
        >
          {detalle}
        </p>
      </div>
    </article>
  );
}

/** Una sección de la tarjeta del servidor. Con porcentaje, muestra la barra de uso. */
function Bloque({
  icono,
  titulo,
  tono,
  porcentaje,
  className = '',
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  tono: Tono;
  porcentaje?: number;
  className?: string;
  children: React.ReactNode;
}) {
  // El color avisa cuando el recurso se está agotando
  const barra =
    porcentaje === undefined
      ? ''
      : porcentaje >= 90
        ? 'bg-red-500'
        : porcentaje >= 75
          ? 'bg-amber-500'
          : 'bg-brand-600';

  return (
    <article className={`p-5 ${className}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONOS[tono].caja}`}
        >
          {icono}
        </span>
        <h3 className="text-base font-extrabold text-slate-900">{titulo}</h3>
        {porcentaje !== undefined && (
          <span className="ml-auto text-2xl font-extrabold text-slate-900">
            {Math.round(porcentaje)}%
          </span>
        )}
      </div>

      {porcentaje !== undefined && (
        <div
          className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-silver-200"
          role="progressbar"
          aria-valuenow={Math.round(porcentaje)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Uso de ${titulo.toLowerCase()}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${barra}`}
            style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }}
          />
        </div>
      )}

      <div className="mt-3">{children}</div>
    </article>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-medium text-slate-700">{etiqueta}</dt>
      <dd className="truncate text-right font-bold text-slate-900" title={valor}>
        {valor}
      </dd>
    </div>
  );
}

export function EstadoBadge({ status }: { status: string }) {
  const mapa: Record<string, { texto: string; clase: string }> = {
    PUBLISHED: { texto: 'Publicado', clase: 'bg-green-100 text-green-800' },
    DRAFT: { texto: 'Borrador', clase: 'bg-amber-100 text-amber-800' },
    ARCHIVED: { texto: 'Archivado', clase: 'bg-silver-200 text-slate-800' },
  };
  const item = mapa[status] ?? mapa.DRAFT!;

  return <span className={`badge shrink-0 ${item.clase}`}>{item.texto}</span>;
}

function SkeletonDashboard() {
  return (
    <div className="space-y-8" role="status" aria-label="Cargando estadísticas">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-32 animate-pulse" />
        ))}
      </div>
      <div className="card h-44 animate-pulse" />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
