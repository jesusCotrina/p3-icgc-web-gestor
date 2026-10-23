import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

/** Nadie entra al gestor sin sesion valida. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-silver-100">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-slate-500">Verificando sesion...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Guardamos a donde queria ir, para volver ahi despues del login
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
