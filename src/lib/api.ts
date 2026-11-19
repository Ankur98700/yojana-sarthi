import type {
  AdminAuditLog,
  ChatMessage,
  CitizenProfile,
  EligibilityCheckResponse,
  EligibilityHistoryRecord,
  RecommendationItem,
  Scheme,
  UserAccount,
} from '../types.ts';

const TOKEN_KEY = 'yojana_sarthi_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage restriction in private browsing
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    throw new ApiError(
      typeof data.error === 'string' ? data.error : `Request failed (${res.status})`,
      res.status
    );
  }

  return data as T;
}

export interface SchemesMetaResponse {
  totalVerifiedSchemes: number;
  centralSchemesCount: number;
  stateSchemesCount: number;
  categories: string[];
  statesWithDedicatedSchemes: string[];
}

export interface SchemesListResponse {
  items: Scheme[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardResponse {
  user: UserAccount;
  profileCompletion: { percentage: number; missingFields: string[] };
  eligibilitySummary: EligibilityCheckResponse | null;
  recommendations: RecommendationItem[];
  savedSchemes: Array<{ scheme: Scheme; savedAt: string }>;
  recentlyViewed: Array<{ scheme: Scheme; viewedAt: string }>;
  recentChecks: EligibilityHistoryRecord[];
  documentChecklist: Array<{ document: string; schemes: string[] }>;
}

export const api = {
  // Auth
  me: () => request<{ user: UserAccount | null }>('/api/auth/me'),
  register: (body: { name: string; email: string; password: string }) =>
    request<{ user: UserAccount; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ user: UserAccount; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string) =>
    request<{ message: string; devResetCode?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (resetCode: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetCode, newPassword }),
    }),

  // Profile
  getProfile: () =>
    request<{ profile: CitizenProfile; completion: { percentage: number; missingFields: string[] } }>(
      '/api/profile'
    ),
  updateProfile: (profile: CitizenProfile) =>
    request<{
      profile: CitizenProfile;
      name: string;
      completion: { percentage: number; missingFields: string[] };
    }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  // Schemes
  getSchemesMeta: () => request<SchemesMetaResponse>('/api/schemes/meta'),
  listSchemes: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '' && v !== 'all') qs.set(k, String(v));
    }
    const query = qs.toString();
    return request<SchemesListResponse>(`/api/schemes${query ? `?${query}` : ''}`);
  },
  getScheme: (idOrSlug: string | number) => request<{ scheme: Scheme }>(`/api/schemes/${idOrSlug}`),

  // Eligibility & Recommendations
  checkEligibility: (body: {
    profile: CitizenProfile;
    schemeId?: number;
    saveToProfile?: boolean;
  }) =>
    request<EligibilityCheckResponse>('/api/eligibility/check', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getEligibilityHistory: () => request<{ history: EligibilityHistoryRecord[] }>('/api/eligibility/history'),
  getRecommendations: (body: { profile?: CitizenProfile; preferredCategories?: string[] }) =>
    request<{
      totalRecommended: number;
      usedProfile: boolean;
      recommendations: RecommendationItem[];
    }>('/api/recommendations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Compare
  compareSchemes: (ids: number[]) =>
    request<{ schemes: Scheme[] }>(`/api/compare?ids=${ids.join(',')}`),

  // Saved
  getSavedSchemes: () => request<{ saved: Array<{ scheme: Scheme; savedAt: string }> }>('/api/saved'),
  saveScheme: (schemeId: number) =>
    request<{ saved: boolean; schemeId: number }>(`/api/saved/${schemeId}`, { method: 'POST' }),
  unsaveScheme: (schemeId: number) =>
    request<{ saved: boolean; schemeId: number }>(`/api/saved/${schemeId}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => request<DashboardResponse>('/api/dashboard'),

  // Chat
  getChatHistory: (sessionKey?: string) =>
    request<{ messages: ChatMessage[] }>(
      `/api/chat/history${sessionKey ? `?sessionKey=${encodeURIComponent(sessionKey)}` : ''}`
    ),
  sendChatMessage: (body: {
    message: string;
    sessionKey?: string;
    includeProfileContext?: boolean;
    guestProfile?: CitizenProfile;
  }) =>
    request<{ sessionKey: string; message: ChatMessage }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  clearChatHistory: (sessionKey?: string) =>
    request<{ cleared: boolean }>(
      `/api/chat/history${sessionKey ? `?sessionKey=${encodeURIComponent(sessionKey)}` : ''}`,
      { method: 'DELETE' }
    ),

  // Contact
  submitContact: (body: { name: string; email: string; subject: string; message: string }) =>
    request<{ message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Admin
  adminGetSchemes: () => request<{ schemes: Scheme[] }>('/api/admin/schemes'),
  adminCreateScheme: (payload: Record<string, unknown>) =>
    request<{ scheme: Scheme }>('/api/admin/schemes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminUpdateScheme: (id: number, payload: Record<string, unknown>) =>
    request<{ scheme: Scheme }>(`/api/admin/schemes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  adminVerifyScheme: (id: number, verificationStatus: 'verified' | 'unverified', lastVerifiedDate?: string) =>
    request<{ scheme: Scheme }>(`/api/admin/schemes/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ verificationStatus, lastVerifiedDate }),
    }),
  adminDeleteScheme: (id: number) =>
    request<{ deleted: boolean }>(`/api/admin/schemes/${id}`, { method: 'DELETE' }),
  adminGetCategories: () =>
    request<{ categories: Array<{ id: number; name: string; createdAt: string }> }>('/api/admin/categories'),
  adminCreateCategory: (name: string) =>
    request<{ id: number; name: string }>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  adminDeleteCategory: (id: number) =>
    request<{ deleted: boolean }>(`/api/admin/categories/${id}`, { method: 'DELETE' }),
  adminGetAuditLogs: () => request<{ logs: AdminAuditLog[] }>('/api/admin/audit-logs'),
};
