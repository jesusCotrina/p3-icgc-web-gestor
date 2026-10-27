import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Sesion activa: no tiene sentido mostrar el formulario
  if (!loading && user) {
    const destino = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={destino} replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setEnviando(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-gradient px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/logo-icgc.png"
            alt="Logo del Instituto de Capacitacion en Gestion Comunal"
            width={88}
            height={88}
            className="mx-auto h-22 w-22 object-contain drop-shadow-lg"
          />
          <h1 className="mt-5 text-2xl font-bold text-white">Gestor ICGC</h1>
          <p className="mt-1.5 text-sm text-brand-200">Panel de administracion del sitio</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5 p-7">
          <div>
            <label htmlFor="email" className="label">
              Correo electronico
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@icgc.edu.pe"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={enviando} className="btn-primary w-full">
            {enviando ? 'Ingresando...' : 'Iniciar sesion'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-brand-300">
          Acceso exclusivo para administradores del instituto.
        </p>
      </div>
    </div>
  );
}
