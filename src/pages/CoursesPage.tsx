import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BotonEditar, BotonEliminar, BotonVer, BotonVisibilidad } from '@/components/BotonesAccion';
import { ConfirmModal } from '@/components/ConfirmModal';
import { coursesApi } from '@/lib/api';
import type { CourseDTO } from '@/lib/types';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'http://localhost:3000';

type Accion = { tipo: 'publicar' | 'ocultar' | 'eliminar'; curso: CourseDTO };

/**
 * Listado de cursos. Lo que se publique aquí aparece en /cursos y en el
 * carrusel de la página de inicio, en el orden indicado.
 */
export function CoursesPage() {
  const [cursos, setCursos] = useState<CourseDTO[] | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCursos(await coursesApi.list());
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo cargar' });
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function confirmar() {
    if (!accion) return;
    const { tipo, curso } = accion;
    setProcesando(true);
    setAviso(null);
    try {
      if (tipo === 'eliminar') {
        await coursesApi.remove(curso.id);
        setAviso({ tipo: 'ok', texto: `Se eliminó "${curso.name}".` });
      } else {
        await coursesApi.update(curso.id, { isPublished: tipo === 'publicar' });
        setAviso({
          tipo: 'ok',
          texto:
            tipo === 'publicar'
              ? `"${curso.name}" ya se ve en la web.`
              : `"${curso.name}" ya no se ve en la web.`,
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-900">Cursos de capacitación</h2>
          <p className="mt-0.5 text-sm text-slate-700">
            {cursos ? `${cursos.length} curso(s) · se muestran en /cursos y en el inicio` : 'Cargando...'}
          </p>
        </div>
        <Link to="/cursos/nuevo" className="btn-primary">
          + Nuevo curso
        </Link>
      </div>

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

      {!cursos ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
      ) : cursos.length === 0 ? (
        <div className="card p-16 text-center">
          <h3 className="text-lg font-bold">Aún no hay cursos</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
            Crea el primero y aparecerá en la web con su foto, horas y contenido del programa.
          </p>
          <Link to="/cursos/nuevo" className="btn-primary mt-7">
            + Nuevo curso
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {cursos.map((curso) => (
            <li key={curso.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-silver-100">
                  {curso.coverImage ? (
                    <img src={curso.coverImage.thumbUrl ?? curso.coverImage.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[0.6rem] font-bold text-slate-600">
                      SIN FOTO
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`badge ${
                        curso.isPublished ? 'bg-green-50 text-green-700' : 'bg-silver-100 text-slate-600'
                      }`}
                    >
                      {curso.isPublished ? 'Publicado' : 'Oculto'}
                    </span>
                    <span className="badge bg-brand-50 text-brand-700">Orden {curso.position}</span>
                    {curso.comingSoon && (
                      <span className="badge bg-amber-100 text-amber-900">Próximamente</span>
                    )}
                  </div>
                  <h3 className="mt-1.5 truncate text-base font-bold text-brand-900">{curso.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-700">
                    {curso.lectiveHours} h lectivas · {curso.duration} · {curso.modality} ·{' '}
                    {curso.topics.length} tema(s)
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <BotonEditar to={`/cursos/${curso.id}`} etiqueta={`Editar "${curso.name}"`} />
                  {curso.isPublished && (
                    <BotonVer href={`${SITE_URL}/cursos/${curso.slug}`} etiqueta={`Ver "${curso.name}" en la web`} />
                  )}
                  <BotonVisibilidad
                    publicado={curso.isPublished}
                    etiqueta={curso.isPublished ? `Ocultar "${curso.name}"` : `Publicar "${curso.name}"`}
                    onClick={() => setAccion({ tipo: curso.isPublished ? 'ocultar' : 'publicar', curso })}
                  />
                  <BotonEliminar
                    etiqueta={`Eliminar "${curso.name}"`}
                    onClick={() => setAccion({ tipo: 'eliminar', curso })}
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
  const nombre = accion ? <strong className="text-slate-900">“{accion.curso.name}”</strong> : null;

  switch (accion?.tipo) {
    case 'publicar':
      return {
        tono: 'publicar' as const,
        titulo: '¿Publicar este curso?',
        textoConfirmar: 'Publicar',
        mensaje: <>{nombre} se verá en la página de cursos y en el inicio.</>,
      };
    case 'ocultar':
      return {
        tono: 'aviso' as const,
        titulo: '¿Ocultar este curso?',
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
        titulo: '¿Eliminar este curso?',
        textoConfirmar: 'Sí, eliminar',
        mensaje: (
          <>
            {nombre} y su foto se borrarán para siempre. <strong>Esto no se puede deshacer.</strong>
          </>
        ),
      };
  }
}
