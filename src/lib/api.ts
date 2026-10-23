import type {
  CategoryDTO,
  ContactMessageDTO,
  CourseDTO,
  DashboardStatsDTO,
  LoginResponseDTO,
  MediaDTO,
  Paginated,
  PostDTO,
  PostSummaryDTO,
  ProjectDTO,
  SeoAudit,
  ServerStatsDTO,
  SiteSettingsDTO,
} from './types';

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

const TOKEN_KEY = 'icgc_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Cuerpo del error: trae la auditoría SEO cuando falla una publicación */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const token = tokenStore.get();

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal,
  });

  // Sesión vencida: limpiamos y mandamos al login
  if (res.status === 401) {
    tokenStore.clear();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError('Sesión expirada', 401);
  }

  const payload: unknown = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const info = payload as { message?: string; details?: unknown } | null;
    throw new ApiError(info?.message ?? `Error ${res.status}`, res.status, info?.details);
  }

  return payload as T;
}

// ───────────────────────────── Auth ─────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponseDTO>('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request<LoginResponseDTO['user']>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
};

// ───────────────────────────── Dashboard ─────────────────────────────

export const dashboardApi = {
  get: () => request<DashboardStatsDTO>('/admin/dashboard'),
  serverStats: (signal?: AbortSignal) => request<ServerStatsDTO>('/admin/server-stats', { signal }),
};

// ───────────────────────────── Posts ─────────────────────────────

export type PostPayload = {
  title: string;
  subtitle?: string | null;
  slug?: string;
  excerpt?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  coverImageId?: string | null;
  coverAlt?: string | null;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured?: boolean;
  categoryId?: string | null;
  tags?: string[];
  blocks?: {
    type: string;
    text?: string | null;
    level?: number | null;
    listStyle?: string | null;
    mediaId?: string | null;
    alt?: string | null;
    caption?: string | null;
    embedUrl?: string | null;
  }[];
};

export type PostListParams = {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
};

export const postsApi = {
  list: (params: PostListParams = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') search.set(key, String(value));
    }
    const query = search.toString();
    return request<Paginated<PostSummaryDTO>>(`/admin/posts${query ? `?${query}` : ''}`);
  },
  get: (id: string) => request<PostDTO & { seo: SeoAudit }>(`/admin/posts/${id}`),
  create: (payload: PostPayload) => request<PostDTO>('/admin/posts', { method: 'POST', body: payload }),
  update: (id: string, payload: PostPayload) =>
    request<PostDTO>(`/admin/posts/${id}`, { method: 'PUT', body: payload }),
  changeStatus: (id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') =>
    request<PostDTO>(`/admin/posts/${id}/status`, { method: 'PATCH', body: { status } }),
  seo: (id: string) => request<SeoAudit>(`/admin/posts/${id}/seo`),
  remove: (id: string) => request<{ ok: boolean }>(`/admin/posts/${id}`, { method: 'DELETE' }),
};

export const categoriesApi = {
  list: () => request<CategoryDTO[]>('/admin/categories'),
  create: (name: string, description?: string) =>
    request<CategoryDTO>('/admin/categories', { method: 'POST', body: { name, description } }),
  remove: (id: string) => request<{ ok: boolean }>(`/admin/categories/${id}`, { method: 'DELETE' }),
};

// ───────────────────────────── Media ─────────────────────────────

export const mediaApi = {
  list: (params: { kind?: 'IMAGE' | 'VIDEO'; page?: number; pageSize?: number } = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    const query = search.toString();
    return request<Paginated<MediaDTO>>(`/admin/media${query ? `?${query}` : ''}`);
  },
  update: (id: string, data: { alt?: string | null; caption?: string | null }) =>
    request<MediaDTO>(`/admin/media/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => request<{ ok: boolean }>(`/admin/media/${id}`, { method: 'DELETE' }),
};

export type UploadProgress = { loaded: number; total: number; percent: number };

/**
 * Subida con barra de progreso.
 *
 * Usa XMLHttpRequest a propósito: fetch() todavía no reporta el progreso de
 * subida, y un video de 500 MB sin barra parece un cuelgue.
 */
export function uploadFile(
  endpoint: '/admin/media/images' | '/admin/media/videos' | '/admin/settings/logo',
  file: File,
  extra: Record<string, string> = {},
  onProgress?: (progress: UploadProgress) => void,
): { promise: Promise<MediaDTO>; abort: () => void } {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<MediaDTO>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    for (const [key, value] of Object.entries(extra)) form.append(key, value);

    xhr.open('POST', `${API_URL}/api${endpoint}`);

    const token = tokenStore.get();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    });

    xhr.addEventListener('load', () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        // El endpoint del logo devuelve { logo, settings }
        const body = data as MediaDTO & { logo?: MediaDTO };
        resolve(body.logo ?? body);
        return;
      }

      const info = data as { message?: string } | null;
      reject(new ApiError(info?.message ?? `Error ${xhr.status} al subir el archivo`, xhr.status));
    });

    xhr.addEventListener('error', () =>
      reject(new ApiError('No se pudo conectar con el servidor', 0)),
    );
    xhr.addEventListener('abort', () => reject(new ApiError('Subida cancelada', 0)));

    xhr.send(form);
  });

  return { promise, abort: () => xhr.abort() };
}

// ───────────────────────────── Ajustes ─────────────────────────────

export const settingsApi = {
  get: () => request<SiteSettingsDTO>('/admin/settings'),
  // La foto del líder viaja como id: el archivo ya se subió a Multimedia
  update: (data: Partial<SiteSettingsDTO> & { leaderPhotoMediaId?: string | null }) =>
    request<SiteSettingsDTO>('/admin/settings', { method: 'PUT', body: data }),
};

// ───────────────────────────── Mensajes ─────────────────────────────

export const contactMessagesApi = {
  list: () => request<ContactMessageDTO[]>('/admin/contact-messages'),
  mark: (id: string, read: boolean) =>
    request<ContactMessageDTO>(`/admin/contact-messages/${id}`, { method: 'PATCH', body: { read } }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/admin/contact-messages/${id}`, { method: 'DELETE' }),
};

// ───────────────────────────── Cursos ─────────────────────────────

export type CoursePayload = Omit<CourseDTO, 'id' | 'coverImage' | 'createdAt' | 'updatedAt'> & {
  coverImageId: string | null;
};

export const coursesApi = {
  list: () => request<CourseDTO[]>('/admin/courses'),
  get: (id: string) => request<CourseDTO>(`/admin/courses/${id}`),
  create: (payload: CoursePayload) =>
    request<CourseDTO>('/admin/courses', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<CoursePayload>) =>
    request<CourseDTO>(`/admin/courses/${id}`, { method: 'PUT', body: payload }),
  remove: (id: string) => request<{ ok: boolean }>(`/admin/courses/${id}`, { method: 'DELETE' }),
};

// ───────────────────────────── Proyectos ─────────────────────────────

export type ProjectPayload = Omit<ProjectDTO, 'id' | 'coverImage' | 'createdAt' | 'updatedAt'> & {
  coverImageId: string | null;
};

export const projectsApi = {
  list: () => request<ProjectDTO[]>('/admin/projects'),
  get: (id: string) => request<ProjectDTO>(`/admin/projects/${id}`),
  create: (payload: ProjectPayload) =>
    request<ProjectDTO>('/admin/projects', { method: 'POST', body: payload }),
  update: (id: string, payload: Partial<ProjectPayload>) =>
    request<ProjectDTO>(`/admin/projects/${id}`, { method: 'PUT', body: payload }),
  remove: (id: string) => request<{ ok: boolean }>(`/admin/projects/${id}`, { method: 'DELETE' }),
};
