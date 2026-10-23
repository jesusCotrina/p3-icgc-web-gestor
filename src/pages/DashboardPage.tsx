import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@/lib/api';
import { formatBytes, formatDateTime, formatNumber, formatUptime } from '@/lib/format';
import type { DashboardStatsDTO, ServerStatsDTO } from '@/lib/types';

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
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <button type="button" onClick={() => void cargar()} className="btn-primary mt-6">
          Reintentar
        </button>
      </div>
    );
  }

  const { content, recentPosts } = data;
  const stats = server ?? data.server;

  return (
    <div className="space-y-8">
      {/* ── Publicaciones ── */}
      <section aria-labelledby="resumen-contenido">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="resumen-contenido" className="text-base font-bold text-brand-900">
            Publicaciones
          </h2>
          <Link to="/blogs/nuevo" className="btn-primary btn-sm">
            + Nuevo blog
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            etiqueta="Publicaciones totales"
            valor={formatNumber(content.totalPosts)}
            detalle={`${content.published} publicadas · ${content.drafts} borradores`}
            tono="brand"
          />
          <StatCard
            etiqueta="Publicadas este mes"
            valor={formatNumber(content.publishedThisMonth)}
            detalle={`${content.categories} categorías · ${content.tags} etiquetas`}
            tono="green"
          />
          <StatCard
            etiqueta="Visitas acumuladas"
            valor={formatNumber(content.totalViews)}
            detalle="Lecturas de artículos en la web"
            tono="brand"
          />
          <StatCard
            etiqueta="Archivos subidos"
            valor={formatNumber(content.mediaCount)}
            detalle={`${content.imagesCount} imágenes · ${content.videosCount} videos`}
            tono="amber"
          />
        </div>
      </section>

      {/* ── Servidor ── */}
      <section aria-labelledby="estado-servidor">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="estado-servidor" className="text-base font-bold text-brand-900">
            Estado del servidor
          </h2>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
            Se actualiza cada 10 segundos
          </p>
        </div>

        {/* Sistema operativo detectado: lo decide el backend según process.platform */}
        <div className="card mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 p-5 text-sm">
          <span className="badge bg-brand-50 text-brand-700">
            {stats.os.isWindows ? 'Windows' : stats.os.isLinux ? 'Linux' : stats.os.platform}
          </span>
          <Dato etiqueta="Sistema" valor={stats.os.prettyName} />
          <Dato etiqueta="Equipo" valor={stats.os.hostname} />
          <Dato etiqueta="Arquitectura" valor={stats.os.arch} />
          <Dato etiqueta="Encendido hace" valor={formatUptime(stats.os.uptimeSec)} />
          <Dato etiqueta="Node" valor={stats.runtime.node} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* CPU */}
          <GaugeCard
            titulo="Procesador"
            porcentaje={stats.cpu.usagePercent}
            principal={`${stats.cpu.cores} núcleos`}
            lineas={[
              stats.cpu.model,
              `${(stats.cpu.speedMhz / 1000).toFixed(2)} GHz`,
              stats.cpu.loadAvg
                ? `Carga media: ${stats.cpu.loadAvg.map((n) => n.toFixed(2)).join(' · ')}`
                : 'Carga media: no disponible en Windows',
            ]}
          />

          {/* RAM */}
          <GaugeCard
            titulo="Memoria RAM"
            porcentaje={stats.memory.usedPercent}
            principal={`${formatBytes(stats.memory.usedBytes)} / ${formatBytes(stats.memory.totalBytes)}`}
            lineas={[
              `Libre: ${formatBytes(stats.memory.freeBytes)}`,
              `Proceso del backend: ${formatBytes(stats.runtime.processMemoryBytes)}`,
            ]}
          />

          {/* Disco */}
          <GaugeCard
            titulo="Almacenamiento"
            porcentaje={stats.disk.usedPercent}
            principal={
              stats.disk.totalBytes > 0
                ? `${formatBytes(stats.disk.freeBytes)} disponibles`
                : 'No disponible'
            }
            lineas={[
              stats.disk.totalBytes > 0
                ? `${formatBytes(stats.disk.usedBytes)} usados de ${formatBytes(stats.disk.totalBytes)}`
                : 'El servidor no reportó el espacio en disco',
              `Ruta medida: ${stats.disk.path}`,
              `Archivos subidos: ${formatBytes(content.uploadsSizeBytes)}`,
            ]}
          />
        </div>
      </section>

      {/* ── Últimos artículos ── */}
      <section aria-labelledby="ultimos">
        <div className="flex items-center justify-between gap-3">
          <h2 id="ultimos" className="text-base font-bold text-brand-900">
            Últimos artículos editados
          </h2>
          <Link to="/blogs" className="text-sm font-semibold text-brand-600 hover:text-brand-800">
            Ver todos
          </Link>
        </div>

        <div className="card mt-4 divide-y divide-silver-200">
          {recentPosts.length > 0 ? (
            recentPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blogs/${post.id}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-brand-50/60"
              >
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-silver-100">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage.url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[0.6rem] font-bold text-slate-400">
                      SIN PORTADA
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-brand-900">{post.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Editado el {formatDateTime(post.updatedAt)}
                  </p>
                </div>

                <EstadoBadge status={post.status} />
              </Link>
            ))
          ) : (
            <div className="p-10 text-center">
              <p className="text-slate-600">Todavía no hay artículos.</p>
              <Link to="/blogs/nuevo" className="btn-primary mt-5">
                Crear el primer blog
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ───────────────────────────── Piezas ─────────────────────────────

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <span className="text-slate-600">
      <span className="font-semibold text-brand-800">{etiqueta}:</span> {valor}
    </span>
  );
}

const TONOS = {
  brand: 'bg-brand-50 text-brand-700',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
} as const;

function StatCard({
  etiqueta,
  valor,
  detalle,
  tono,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  tono: keyof typeof TONOS;
}) {
  return (
    <article className="card p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{etiqueta}</p>
      <p className="mt-2 text-3xl font-extrabold text-brand-900">{valor}</p>
      <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${TONOS[tono]}`}>
        {detalle}
      </p>
    </article>
  );
}

/** Tarjeta con barra de uso. El color avisa cuando el recurso se está agotando. */
function GaugeCard({
  titulo,
  porcentaje,
  principal,
  lineas,
}: {
  titulo: string;
  porcentaje: number;
  principal: string;
  lineas: string[];
}) {
  const color =
    porcentaje >= 90 ? 'bg-red-500' : porcentaje >= 75 ? 'bg-amber-500' : 'bg-brand-500';

  return (
    <article className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-brand-900">{titulo}</h3>
        <span className="text-lg font-extrabold text-brand-700">{porcentaje.toFixed(1)}%</span>
      </div>

      <p className="mt-1 text-sm font-semibold text-slate-700">{principal}</p>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-silver-200"
        role="progressbar"
        aria-valuenow={Math.round(porcentaje)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Uso de ${titulo.toLowerCase()}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }}
        />
      </div>

      <ul className="mt-3 space-y-1 text-xs leading-relaxed text-slate-500">
        {lineas.map((linea) => (
          <li key={linea} className="truncate" title={linea}>
            {linea}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function EstadoBadge({ status }: { status: string }) {
  const mapa: Record<string, { texto: string; clase: string }> = {
    PUBLISHED: { texto: 'Publicado', clase: 'bg-green-50 text-green-700' },
    DRAFT: { texto: 'Borrador', clase: 'bg-amber-50 text-amber-700' },
    ARCHIVED: { texto: 'Archivado', clase: 'bg-silver-200 text-slate-600' },
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
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-44 animate-pulse" />
        ))}
      </div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
