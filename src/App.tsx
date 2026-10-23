import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from '@/lib/auth';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PostsPage } from '@/pages/PostsPage';
import { PostEditorPage } from '@/pages/PostEditorPage';
import { MediaPage } from '@/pages/MediaPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CoursesPage } from '@/pages/CoursesPage';
import { CourseEditorPage } from '@/pages/CourseEditorPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectEditorPage } from '@/pages/ProjectEditorPage';
import { MessagesPage } from '@/pages/MessagesPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="blogs" element={<PostsPage />} />
            {/* "nuevo" es un id reservado: el editor distingue crear de editar */}
            <Route path="blogs/nuevo" element={<PostEditorPage />} />
            <Route path="blogs/:id" element={<PostEditorPage />} />
            <Route path="cursos" element={<CoursesPage />} />
            <Route path="cursos/nuevo" element={<CourseEditorPage />} />
            <Route path="cursos/:id" element={<CourseEditorPage />} />
            <Route path="proyectos" element={<ProjectsPage />} />
            <Route path="proyectos/nuevo" element={<ProjectEditorPage />} />
            <Route path="proyectos/:id" element={<ProjectEditorPage />} />
            <Route path="mensajes" element={<MessagesPage />} />
            <Route path="multimedia" element={<MediaPage />} />
            <Route path="ajustes" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
