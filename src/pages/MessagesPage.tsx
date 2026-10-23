import { useCallback, useEffect, useState } from 'react';
import { contactMessagesApi } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { ContactMessageDTO } from '@/lib/types';

/**
 * Mensajes del formulario de contacto de /nosotros, del más nuevo al más
 * antiguo. Los no leídos van resaltados; al abrir el correo o el WhatsApp
 * de un mensaje se marca como leído.
 */
export function MessagesPage() {
  const [mensajes, setMensajes] = useState<ContactMessageDTO[] | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    try {
      setMensajes(await contactMessagesApi.list());
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo cargar' });
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function marcar(mensaje: ContactMessageDTO, leido: boolean) {
    try {
      const actualizado = await contactMessagesApi.mark(mensaje.id, leido);
      setMensajes((prev) => prev?.map((m) => (m.id === actualizado.id ? actualizado : m)) ?? prev);
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo cambiar' });
    }
  }

  async function eliminar(mensaje: ContactMessageDTO) {
    if (!window.confirm(`¿Eliminar definitivamente el mensaje de ${mensaje.firstName} ${mensaje.lastName}?`)) return;
    try {
      await contactMessagesApi.remove(mensaje.id);
      setMensajes((prev) => prev?.filter((m) => m.id !== mensaje.id) ?? prev);
      setAviso({ tipo: 'ok', texto: 'Mensaje eliminado' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo eliminar' });
    }
  }

  const sinLeer = mensajes?.filter((m) => !m.readAt).length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-brand-900">Mensajes de contacto</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {mensajes
            ? `${mensajes.length} mensaje(s) · ${sinLeer} sin leer · llegan desde el formulario de /nosotros`
            : 'Cargando...'}
        </p>
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

      {!mensajes ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
      ) : mensajes.length === 0 ? (
        <div className="card p-16 text-center">
          <h3 className="text-lg font-bold">Aún no hay mensajes</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
            Cuando alguien complete el formulario de contacto de la página Nosotros, sus datos
            aparecerán aquí.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {mensajes.map((m) => {
            const telefono = m.phone.replace(/\D/g, '');
            // Números peruanos de 9 dígitos: se les antepone el código de país
            const whatsapp = telefono.length === 9 ? `51${telefono}` : telefono;
            return (
              <li
                key={m.id}
                className={`card p-4 ${m.readAt ? '' : 'border-brand-300 bg-brand-50/40'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {!m.readAt && <span className="badge bg-brand-600 text-white">Nuevo</span>}
                      <span className="text-xs text-slate-500">{formatDateTime(m.createdAt)}</span>
                    </div>
                    <h3 className="mt-1.5 text-base font-bold text-brand-900">
                      {m.firstName} {m.lastName}
                    </h3>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <a
                        href={`mailto:${m.email}`}
                        onClick={() => !m.readAt && void marcar(m, true)}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {m.email}
                      </a>
                      <a
                        href={`https://wa.me/${whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => !m.readAt && void marcar(m, true)}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {m.phone}
                      </a>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => void marcar(m, !m.readAt)} className="btn-secondary px-3 py-1.5 text-xs">
                      {m.readAt ? 'Marcar como no leído' : 'Marcar como leído'}
                    </button>
                    <button type="button" onClick={() => void eliminar(m)} className="btn-secondary px-3 py-1.5 text-xs text-red-600">
                      Eliminar
                    </button>
                  </div>
                </div>

                {m.message && (
                  <p className="mt-3 whitespace-pre-line rounded-lg bg-white p-3 text-sm leading-relaxed text-slate-700 ring-1 ring-silver-200">
                    {m.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
