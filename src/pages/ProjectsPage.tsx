import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BotonEditar, BotonEliminar, BotonVer, BotonVisibilidad } from '@/components/BotonesAccion';
import { ConfirmModal } from '@/components/ConfirmModal';
import { projectsApi } from '@/lib/api';
import { PERU_REGIONS, PROJECT_STATUS_LABELS, type ProjectDTO } from '@/lib/types';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000';

type Accion = { tipo: 'publicar' | 'ocultar' | 'eliminar'; proyecto: ProjectDTO };

const nombreRegion = (id: string) => PERU_REGIONS.find((r) => r.id === id)?.name ?? id;

/**
 * Listado de proyectos. Los publicados alimentan /proyectos, las tarjetas del
 * inicio, el mapa "Nuestra huella en el Perú" y las cifras del hero.
 */
export function ProjectsPage() {
  const [proyectos, setProyectos] = useState<ProjectDTO[] | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setProyectos(await projectsApi.list());
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo cargar' });
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function confirmar() {
    if (!accion) return;
    const { tipo, proyecto } = accion;
    setProcesando(true);
    setAviso(null);
    try {
      if (tipo === 'eliminar') {
        await projectsApi.remove(proyecto.id);
        setAviso({ tipo: 'ok', texto: `Se eliminó "${proyecto.title}".` });
      } else {
        await projectsApi.update(proyecto.id, { isPublished: tipo === 'publicar' });
        setAviso({
          tipo: 'ok',
          texto:
            tipo === 'publicar'
              ? `"${proyecto.title}" ya se ve en la web.`
              : `"${proyecto.title}" ya no se ve en la web.`,
        });
      }
      await cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo completar' });
    } finally {
      setAccion(null);
      setProcesando(false);
    }
  }

  // Las mismas cifras que verá la web (solo cuentan los publicados)
  const publicados = proyectos?.filter((p) => p.isPublished) ?? [];
  const regiones = new Set(publicados.map((p) => p.region)).size;
  const comunidades = publicados.reduce((t, p) => t + p.communitiesBenefited, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-900">Proyectos</h2>
          <p className="mt-0.5 text-sm text-slate-700">
            {proyectos ? `${proyectos.length} proyecto(s)` : 'Cargando...'}
          </p>
        </div>
        <Link to="/proyectos/nuevo" className="btn-primary">
          + Nuevo proyecto
        </Link>
      </div>

      {proyectos && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { valor: publicados.length, etiqueta: 'proyectos publicados' },
            { valor: regiones, etiqueta: 'regiones' },
            { valor: comunidades, etiqueta: 'comunidades beneficiadas' },
          ].map((c) => (
            <div key={c.etiqueta} className="card p-4">
              <p className="text-2xl font-black text-brand-700">{c.valor}</p>
              <p className="text-xs text-slate-700">{c.etiqueta}</p>
            </div>
          ))}
          <p className="text-xs text-slate-700 sm:col-span-3">
            Estas cifras se muestran en el hero de la página de inicio y en el mapa “Nuestra huella
            en el Perú”. Se calculan solas a partir de los proyectos publicados.
          </p>
        </div>
      )}

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

      {!proyectos ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
      ) : proyectos.length === 0 ? (
        <div className="card p-16 text-center">
          <h3 className="text-lg font-bold">Aún no hay proyectos</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
            Crea el primero: aparecerá en /proyectos, en el inicio y como marcador en el mapa.
          </p>
          <Link to="/proyectos/nuevo" className="btn-primary mt-7">
            + Nuevo proyecto
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {proyectos.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-silver-100">
                  {p.coverImage ? (
                    <img src={p.coverImage.thumbUrl ?? p.coverImage.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[0.6rem] font-bold text-slate-600">
                      SIN FOTO
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${p.isPublished ? 'bg-green-50 text-green-700' : 'bg-silver-100 text-slate-600'}`}>
                      {p.isPublished ? 'Publicado' : 'Oculto'}
                    </span>
                    <span className="badge bg-amber-50 text-amber-800">{PROJECT_STATUS_LABELS[p.status]}</span>
                    <span className="badge bg-brand-50 text-brand-700">{nombreRegion(p.region)}</span>
                  </div>
                  <h3 className="mt-1.5 truncate text-base font-bold text-brand-900">{p.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-700">
                    {p.communitiesBenefited} comunidad(es) · {p.achievements.length} logro(s) · orden {p.position}
                    {p.latitude == null && ' · sin coordenadas (marcador en el centro de la región)'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <BotonEditar to={`/proyectos/${p.id}`} etiqueta={`Editar "${p.title}"`} />
                  {p.isPublished && (
                    <BotonVer href={`${SITE_URL}/proyectos#${p.slug}`} etiqueta={`Ver "${p.title}" en la web`} />
                  )}
                  <BotonVisibilidad
                    publicado={p.isPublished}
                    etiqueta={p.isPublished ? `Ocultar "${p.title}"` : `Publicar "${p.title}"`}
                    onClick={() => setAccion({ tipo: p.isPublished ? 'ocultar' : 'publicar', proyecto: p })}
                  />
                  <BotonEliminar
                    etiqueta={`Eliminar "${p.title}"`}
                    onClick={() => setAccion({ tipo: 'eliminar', proyecto: p })}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmModal
        abierto={accion !== null}
        ocupado={procesando}
        onCancelar={() => setAccion(null)}
        onConfirmar={() => void confirmar()}
        {...textosDelModal(accion)}
      />
    </div>
  );
}

function textosDelModal(accion: Accion | null) {
  const nombre = accion ? <strong className="text-slate-900">“{accion.proyecto.title}”</strong> : null;

  switch (accion?.tipo) {
    case 'publicar':
      return {
        tono: 'publicar' as const,
        titulo: '¿Publicar este proyecto?',
        textoConfirmar: 'Publicar',
        mensaje: <>{nombre} se verá en la página de proyectos, en el mapa y en el inicio.</>,
      };
    case 'ocultar':
      return {
        tono: 'aviso' as const,
        titulo: '¿Ocultar este proyecto?',
        textoConfirmar: 'Ocultar',
        mensaje: (
          <>
            {nombre} dejará de verse en la web. No se borra: puedes volver a publicarlo cuando
            quieras.
          </>
        ),
      };
    default:
      return {
        tono: 'peligro' as const,
        titulo: '¿Eliminar este proyecto?',
        textoConfirmar: 'Sí, eliminar',
        mensaje: (
          <>
            {nombre} y su foto se borrarán para siempre. <strong>Esto no se puede deshacer.</strong>
          </>
        ),
      };
  }
}
