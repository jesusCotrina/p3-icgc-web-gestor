import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi, projectsApi, settingsApi, uploadFile, type UploadProgress } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import { FotoConAlt } from '@/components/FotoConAlt';
import type { CareerItem, SiteSettingsDTO } from '@/lib/types';

/**
 * Ajustes del sitio: logo, datos de la organización y metadatos globales.
 *
 * Casi todo lo de esta pantalla termina en el SEO de la web pública: el logo
 * va al schema Organization, los datos de contacto al ContactPoint y la
 * descripción por defecto a las páginas que no tienen una propia.
 */
export function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettingsDTO | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [progreso, setProgreso] = useState<UploadProgress | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const inputLogo = useRef<HTMLInputElement>(null);
  const [cifras, setCifras] = useState<{ proyectos: number; regiones: number } | null>(null);

  // Mismo cálculo que hace la web: solo cuentan los proyectos publicados
  useEffect(() => {
    projectsApi
      .list()
      .then((lista) => {
        const publicados = lista.filter((p) => p.isPublished);
        setCifras({
          proyectos: publicados.length,
          regiones: new Set(publicados.map((p) => p.region)).size,
        });
      })
      .catch(() => setCifras(null));
  }, []);

  useEffect(() => {
    settingsApi
      .get()
      .then(setSettings)
      .catch((err) =>
        setAviso({
          tipo: 'error',
          texto: err instanceof Error ? err.message : 'No se pudieron cargar los ajustes',
        }),
      )
      .finally(() => setCargando(false));
  }, []);

  function actualizar<K extends keyof SiteSettingsDTO>(campo: K, valor: SiteSettingsDTO[K]) {
    setSettings((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;

    setGuardando(true);
    setAviso(null);

    try {
      // Enviamos solo lo editable: logo y ogImage se cambian por su propio flujo
      const actualizado = await settingsApi.update({
        siteName: settings.siteName,
        tagline: settings.tagline,
        defaultMetaDescription: settings.defaultMetaDescription,
        siteUrl: settings.siteUrl,
        logoAlt: settings.logoAlt,
        email: settings.email,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        address: settings.address,
        city: settings.city,
        country: settings.country,
        facebookUrl: settings.facebookUrl,
        instagramUrl: settings.instagramUrl,
        youtubeUrl: settings.youtubeUrl,
        linkedinUrl: settings.linkedinUrl,
        tiktokUrl: settings.tiktokUrl,
        googleAnalyticsId: settings.googleAnalyticsId,
        googleSiteVerification: settings.googleSiteVerification,
        yearsExperience: settings.yearsExperience,
        leaderName: settings.leaderName?.trim() || null,
        leaderRole: settings.leaderRole?.trim() || null,
        leaderHeadline: settings.leaderHeadline?.trim() || null,
        leaderBio: settings.leaderBio?.trim() || null,
        leaderPhotoMediaId: settings.leaderPhoto?.id ?? null,
        leaderPhotoAlt: settings.leaderPhotoAlt?.trim() || null,
        leaderCareer: settings.leaderCareer.filter((paso) => paso.period.trim() || paso.text.trim()),
      });

      setSettings(actualizado);
      setAviso({ tipo: 'ok', texto: 'Ajustes guardados. La web pública los tomará en 1 minuto.' });
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudieron guardar los ajustes',
      });
    } finally {
      setGuardando(false);
    }
  }

  async function subirLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setAviso({
        tipo: 'error',
        texto: `El logo pesa ${formatBytes(file.size)} y el máximo son 10 MB.`,
      });
      return;
    }

    setProgreso({ loaded: 0, total: file.size, percent: 0 });

    try {
      const { promise } = uploadFile(
        '/admin/settings/logo',
        file,
        { alt: settings?.logoAlt ?? '' },
        setProgreso,
      );
      await promise;

      // Recargamos los ajustes para quedarnos con el logo activo
      const frescos = await settingsApi.get();
      setSettings(frescos);
      setAviso({ tipo: 'ok', texto: 'Logo actualizado en la web pública.' });
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo subir el logo',
      });
    } finally {
      setProgreso(null);
      if (inputLogo.current) inputLogo.current.value = '';
    }
  }

  if (cargando) {
    return (
      <div className="space-y-4" role="status" aria-label="Cargando ajustes">
        <div className="card h-40 animate-pulse" />
        <div className="card h-80 animate-pulse" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-600">{aviso?.texto ?? 'No se pudieron cargar los ajustes.'}</p>
      </div>
    );
  }

  return (
    <form onSubmit={guardar} className="max-w-4xl space-y-5">
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

      {/* ── Logo ── */}
      <section className="card p-5">
        <h2 className="text-sm font-bold text-brand-900">Logo de la empresa</h2>
        <p className="mt-1 text-xs text-slate-500">
          Se usa en la cabecera, el pie, el icono del navegador y las tarjetas que se ven al
          compartir el sitio en redes.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-5">
          <img
            src={settings.logo?.url ?? '/logo-icgc.png'}
            alt={settings.logoAlt}
            className="h-24 w-24 rounded-full border border-silver-200 bg-white object-contain p-1"
          />

          <div className="min-w-0 flex-1">
            {progreso ? (
              <div>
                <p className="text-sm font-semibold text-brand-800">
                  Subiendo... {progreso.percent}%
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-silver-200">
                  <div
                    className="h-full bg-brand-600 transition-all"
                    style={{ width: `${progreso.percent}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <label className="btn-secondary cursor-pointer">
                  Cambiar logo
                  <input
                    ref={inputLogo}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={subirLogo}
                    className="sr-only"
                  />
                </label>
                {settings.logo && (
                  <p className="mt-2 text-xs text-slate-500">
                    {settings.logo.originalName} · {formatBytes(settings.logo.sizeBytes)}
                    {settings.logo.width && ` · ${settings.logo.width}×${settings.logo.height} px`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="logoAlt" className="label">
            Texto alternativo del logo
          </label>
          <input
            id="logoAlt"
            type="text"
            value={settings.logoAlt}
            onChange={(e) => actualizar('logoAlt', e.target.value)}
            className="input"
          />
        </div>
      </section>

      {/* ── Identidad y SEO global ── */}
      <section className="card space-y-5 p-5">
        <h2 className="text-sm font-bold text-brand-900">Identidad del sitio</h2>

        <Campo
          id="siteName"
          etiqueta="Nombre del sitio"
          valor={settings.siteName}
          onChange={(v) => actualizar('siteName', v)}
          ayuda="Aparece en el título de las páginas y en el schema Organization."
        />

        <Campo
          id="tagline"
          etiqueta="Lema"
          valor={settings.tagline}
          onChange={(v) => actualizar('tagline', v)}
        />

        <div>
          <label htmlFor="defaultMetaDescription" className="label">
            Meta descripción por defecto
          </label>
          <textarea
            id="defaultMetaDescription"
            rows={3}
            value={settings.defaultMetaDescription}
            onChange={(e) => actualizar('defaultMetaDescription', e.target.value)}
            className="input resize-y"
          />
          <p className="hint">
            {settings.defaultMetaDescription.length} caracteres. Lo ideal son 120-160. Es lo que
            Google muestra en las páginas que no tienen descripción propia.
          </p>
        </div>

        <Campo
          id="siteUrl"
          etiqueta="URL pública del sitio"
          valor={settings.siteUrl}
          onChange={(v) => actualizar('siteUrl', v)}
          ayuda="Debe ser el dominio final (https://...). Se usa en las URLs canónicas y el sitemap."
        />
      </section>

      {/* ── Contacto ── */}
      <section className="card space-y-5 p-5">
        <h2 className="text-sm font-bold text-brand-900">Datos de contacto</h2>
        <p className="-mt-3 text-xs text-slate-500">
          Alimentan el bloque de contacto de Nosotros, el pie del sitio y los datos estructurados que Google
          puede mostrar en el panel de conocimiento.
        </p>

        {!settings.whatsapp?.trim() && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            <strong>Falta el número de WhatsApp.</strong> Mientras esté vacío, los botones
            &quot;Solicitar información&quot;, &quot;Ver cursos&quot; y &quot;Quiero asesoría&quot;
            de la web llevan al formulario de contacto en lugar de abrir WhatsApp.
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="email" etiqueta="Correo" valor={settings.email ?? ''} onChange={(v) => actualizar('email', v || null)} tipo="email" />
          <Campo id="phone" etiqueta="Teléfono" valor={settings.phone ?? ''} onChange={(v) => actualizar('phone', v || null)} />
          <Campo id="whatsapp" etiqueta="WhatsApp" valor={settings.whatsapp ?? ''} onChange={(v) => actualizar('whatsapp', v || null)} ayuda="Con código de país y sin espacios, p. ej. 51987654321. Es el número al que llevan todos los botones de la web." />
          <Campo id="address" etiqueta="Dirección" valor={settings.address ?? ''} onChange={(v) => actualizar('address', v || null)} />
          <Campo id="city" etiqueta="Ciudad" valor={settings.city ?? ''} onChange={(v) => actualizar('city', v || null)} />
          <Campo id="country" etiqueta="País" valor={settings.country ?? ''} onChange={(v) => actualizar('country', v || null)} />
        </div>
      </section>

      {/* ── Redes ── */}
      <section className="card space-y-5 p-5">
        <h2 className="text-sm font-bold text-brand-900">Redes sociales</h2>
        <p className="-mt-3 text-xs text-slate-500">
          Se publican como <code className="rounded bg-silver-100 px-1">sameAs</code> en el schema
          Organization: así Google confirma que esos perfiles son del instituto.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="facebookUrl" etiqueta="Facebook" valor={settings.facebookUrl ?? ''} onChange={(v) => actualizar('facebookUrl', v || null)} tipo="url" />
          <Campo id="instagramUrl" etiqueta="Instagram" valor={settings.instagramUrl ?? ''} onChange={(v) => actualizar('instagramUrl', v || null)} tipo="url" />
          <Campo id="youtubeUrl" etiqueta="YouTube" valor={settings.youtubeUrl ?? ''} onChange={(v) => actualizar('youtubeUrl', v || null)} tipo="url" />
          <Campo id="linkedinUrl" etiqueta="LinkedIn" valor={settings.linkedinUrl ?? ''} onChange={(v) => actualizar('linkedinUrl', v || null)} tipo="url" />
          <Campo id="tiktokUrl" etiqueta="TikTok" valor={settings.tiktokUrl ?? ''} onChange={(v) => actualizar('tiktokUrl', v || null)} tipo="url" />
        </div>
      </section>

      {/* ── Cifras del hero ── */}
      <section className="card space-y-5 p-5">
        <h2 className="text-sm font-bold text-brand-900">Cifras de la página de inicio</h2>
        <p className="-mt-3 text-xs text-slate-500">
          Son los tres números que se animan en la portada. Los años se escriben aquí; los
          proyectos y las regiones se cuentan solos desde la sección{' '}
          <Link to="/proyectos" className="font-semibold text-brand-600 hover:underline">Proyectos</Link>{' '}
          y son los mismos que muestra el mapa “Nuestra huella en el Perú”.
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          <CampoNumero
            id="yearsExperience"
            etiqueta="Años de experiencia"
            valor={settings.yearsExperience}
            onChange={(v) => actualizar('yearsExperience', v)}
            vistaPrevia={`${settings.yearsExperience}`}
          />
          {/* Calculadas desde Proyectos: así coinciden con el mapa de la web */}
          <CifraCalculada etiqueta="Proyectos asesorados" valor={cifras?.proyectos} />
          <CifraCalculada etiqueta="Regiones atendidas" valor={cifras?.regiones} />
        </div>
      </section>

      {/* ── Líder / gerente general ── */}
      <section className="card space-y-5 p-5">
        <h2 className="text-sm font-bold text-brand-900">Líder o gerente general</h2>
        <p className="-mt-3 text-xs text-slate-500">
          Arma la franja “Sobre el líder” y su trayectoria en la página Nosotros. Si dejas el
          nombre vacío, la franja no se muestra. Google lo lee como la persona a cargo del
          instituto (schema Person).
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="leaderName" etiqueta="Nombre completo" valor={settings.leaderName ?? ''} onChange={(v) => actualizar('leaderName', v)} />
          <Campo id="leaderRole" etiqueta="Cargo" valor={settings.leaderRole ?? ''} onChange={(v) => actualizar('leaderRole', v)} ayuda="Por ejemplo: Gerente general" />
        </div>

        <Campo
          id="leaderHeadline"
          etiqueta="Título de la franja"
          valor={settings.leaderHeadline ?? ''}
          onChange={(v) => actualizar('leaderHeadline', v)}
          ayuda="Una frase corta. Si lo dejas vacío, el título es el nombre."
        />

        <div>
          <label htmlFor="leaderBio" className="label">Descripción</label>
          <textarea
            id="leaderBio"
            rows={5}
            value={settings.leaderBio ?? ''}
            onChange={(e) => actualizar('leaderBio', e.target.value)}
            className="input resize-y"
          />
          <p className="hint">Deja una línea en blanco para separar párrafos.</p>
        </div>

        <div>
          <p className="label">Foto</p>
          <FotoConAlt
            id="leaderPhotoAlt"
            media={settings.leaderPhoto}
            alt={settings.leaderPhotoAlt ?? ''}
            onMedia={(m) => actualizar('leaderPhoto', m)}
            onAlt={(alt) => actualizar('leaderPhotoAlt', alt)}
            placeholder="Retrato de ... , gerente general del ICGC"
          />
        </div>

        <Trayectoria pasos={settings.leaderCareer} onChange={(pasos) => actualizar('leaderCareer', pasos)} />
      </section>

      {/* ── Google ── */}
      <section className="card space-y-5 p-5">
        <h2 className="text-sm font-bold text-brand-900">Google</h2>

        <Campo
          id="googleSiteVerification"
          etiqueta="Código de verificación de Search Console"
          valor={settings.googleSiteVerification ?? ''}
          onChange={(v) => actualizar('googleSiteVerification', v || null)}
          ayuda="El valor del meta google-site-verification. Se inserta solo en el <head> de la web."
        />

        <Campo
          id="googleAnalyticsId"
          etiqueta="ID de Google Analytics"
          valor={settings.googleAnalyticsId ?? ''}
          onChange={(v) => actualizar('googleAnalyticsId', v || null)}
          ayuda="Formato G-XXXXXXXXXX."
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={guardando} className="btn-primary">
          {guardando ? 'Guardando...' : 'Guardar ajustes'}
        </button>
        <CambiarContrasena />
      </div>
    </form>
  );
}

function Campo({
  id,
  etiqueta,
  valor,
  onChange,
  ayuda,
  tipo = 'text',
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  ayuda?: string;
  tipo?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {etiqueta}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
      {ayuda && <p className="hint">{ayuda}</p>}
    </div>
  );
}

/** Lista editable de la trayectoria: periodo + descripción por fila. */
function Trayectoria({ pasos, onChange }: { pasos: CareerItem[]; onChange: (pasos: CareerItem[]) => void }) {
  const cambiar = (i: number, campo: keyof CareerItem, valor: string) =>
    onChange(pasos.map((paso, j) => (j === i ? { ...paso, [campo]: valor } : paso)));
  const mover = (i: number, delta: number) => {
    const destino = i + delta;
    if (destino < 0 || destino >= pasos.length) return;
    const copia = [...pasos];
    [copia[i], copia[destino]] = [copia[destino]!, copia[i]!];
    onChange(copia);
  };

  return (
    <div>
      <p className="label">Trayectoria</p>
      <p className="hint -mt-1 mb-3">Cada fila es un paso: el periodo y lo que hizo. Se muestran en este orden.</p>

      <ol className="space-y-3">
        {pasos.map((paso, i) => (
          <li key={i} className="grid gap-2 rounded-lg border border-silver-200 p-3 sm:grid-cols-[10rem_1fr_auto]">
            <input
              aria-label={`Periodo del paso ${i + 1}`}
              value={paso.period}
              onChange={(e) => cambiar(i, 'period', e.target.value)}
              className="input"
              placeholder="2015 – 2020"
            />
            <textarea
              aria-label={`Descripción del paso ${i + 1}`}
              rows={2}
              value={paso.text}
              onChange={(e) => cambiar(i, 'text', e.target.value)}
              className="input resize-y"
              placeholder="Cargo, institución y lo que logró"
            />
            <div className="flex items-start gap-1">
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir" className="btn-secondary px-2.5 py-2 disabled:opacity-40">↑</button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === pasos.length - 1} aria-label="Bajar" className="btn-secondary px-2.5 py-2 disabled:opacity-40">↓</button>
              <button type="button" onClick={() => onChange(pasos.filter((_, j) => j !== i))} aria-label={`Quitar el paso ${i + 1}`} className="btn-secondary px-2.5 py-2 text-red-600">✕</button>
            </div>
          </li>
        ))}
      </ol>

      <button type="button" onClick={() => onChange([...pasos, { period: '', text: '' }])} className="btn-secondary mt-3">
        + Agregar paso
      </button>
    </div>
  );
}

function CifraCalculada({ etiqueta, valor }: { etiqueta: string; valor: number | undefined }) {
  return (
    <div>
      <p className="label">{etiqueta}</p>
      <p className="input bg-silver-100 font-bold text-brand-700">{valor ?? '…'}</p>
      <p className="hint">Automático, según los proyectos publicados.</p>
    </div>
  );
}

function CampoNumero({
  id,
  etiqueta,
  valor,
  onChange,
  vistaPrevia,
}: {
  id: string;
  etiqueta: string;
  valor: number;
  onChange: (valor: number) => void;
  /** Como se vera el numero en la web, con su prefijo */
  vistaPrevia: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {etiqueta}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        value={Number.isFinite(valor) ? valor : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input"
      />
      <p className="hint">
        En la web se verá: <strong className="text-brand-700">{vistaPrevia}</strong>
      </p>
    </div>
  );
}

function CambiarContrasena() {
  const [abierto, setAbierto] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function cambiar(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    setMensaje('');

    try {
      await authApi.changePassword(actual, nueva);
      setMensaje('Contraseña actualizada.');
      setActual('');
      setNueva('');
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña');
    }
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="btn-secondary">
        Cambiar mi contraseña
      </button>
    );
  }

  return (
    <div className="card w-full space-y-4 p-5">
      <h3 className="text-sm font-bold text-brand-900">Cambiar contraseña</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="actual" className="label">
            Contraseña actual
          </label>
          <input
            id="actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="nueva" className="label">
            Nueva contraseña
          </label>
          <input
            id="nueva"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            className="input"
          />
          <p className="hint">Mínimo 8 caracteres, con letras y números.</p>
        </div>
      </div>

      {mensaje && <p className="text-sm text-brand-700">{mensaje}</p>}

      <div className="flex gap-2">
        {/* type="button" + onClick: este formulario vive dentro del de ajustes */}
        <button type="button" onClick={cambiar} className="btn-primary">
          Actualizar contraseña
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </div>
  );
}
