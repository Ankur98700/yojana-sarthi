import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setStoredToken } from '../lib/api.ts';
import type { CitizenProfile, EligibilityCheckResponse, UserAccount } from '../types.ts';

const COMPARE_KEY = 'yojana_sarthi_compare_ids';
const GUEST_PROFILE_KEY = 'yojana_sarthi_guest_profile';
const LAST_ELIGIBILITY_KEY = 'yojana_sarthi_last_eligibility';

interface ToastMessage {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'error';
}

interface AppContextValue {
  pathname: string;
  navigate: (to: string) => void;
  user: UserAccount | null;
  authLoading: boolean;
  setUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  savedIds: number[];
  toggleSaveScheme: (schemeId: number) => Promise<void>;
  compareIds: number[];
  toggleCompareScheme: (schemeId: number) => void;
  removeCompareScheme: (schemeId: number) => void;
  clearCompare: () => void;
  guestProfile: CitizenProfile;
  setGuestProfile: (profile: CitizenProfile) => void;
  lastEligibility: EligibilityCheckResponse | null;
  setLastEligibility: (res: EligibilityCheckResponse | null) => void;
  notify: (text: string, tone?: 'info' | 'success' | 'error') => void;
  toast: ToastMessage | null;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname || '/');
  const [user, setUser] = useState<UserAccount | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [compareIds, setCompareIds] = useState<number[]>(() => loadJson<number[]>(COMPARE_KEY, []));
  const [guestProfile, setGuestProfileState] = useState<CitizenProfile>(() =>
    loadJson<CitizenProfile>(GUEST_PROFILE_KEY, {})
  );
  const [lastEligibility, setLastEligibilityState] = useState<EligibilityCheckResponse | null>(() =>
    loadJson<EligibilityCheckResponse | null>(LAST_ELIGIBILITY_KEY, null)
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((text: string, tone: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now();
    setToast({ id, text, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev && prev.id === id ? null : prev));
    }, 3600);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname + window.location.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', to);
    setPathname(new URL(to, window.location.origin).pathname);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const refreshSaved = useCallback(async (loggedInUser: UserAccount | null) => {
    if (!loggedInUser) {
      setSavedIds([]);
      return;
    }
    try {
      const res = await api.getSavedSchemes();
      setSavedIds(res.saved.map((s) => s.scheme.id));
    } catch {
      setSavedIds([]);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.me();
      setUser(res.user);
      await refreshSaved(res.user);
    } catch {
      setUser(null);
      setSavedIds([]);
    } finally {
      setAuthLoading(false);
    }
  }, [refreshSaved]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network error on logout
    }
    setStoredToken(null);
    setUser(null);
    setSavedIds([]);
    notify('You have been logged out safely.', 'info');
    navigate('/');
  }, [navigate, notify]);

  const toggleSaveScheme = useCallback(
    async (schemeId: number) => {
      if (!user) {
        notify('Please log in or create a free account to save schemes to your dashboard.', 'info');
        navigate('/login');
        return;
      }
      const alreadySaved = savedIds.includes(schemeId);
      try {
        if (alreadySaved) {
          await api.unsaveScheme(schemeId);
          setSavedIds((prev) => prev.filter((id) => id !== schemeId));
          notify('Removed scheme from your saved list.', 'info');
        } else {
          await api.saveScheme(schemeId);
          setSavedIds((prev) => [...prev, schemeId]);
          notify('Scheme saved to your dashboard.', 'success');
        }
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Unable to update saved schemes.', 'error');
      }
    },
    [navigate, notify, savedIds, user]
  );

  const toggleCompareScheme = useCallback(
    (schemeId: number) => {
      setCompareIds((prev) => {
        if (prev.includes(schemeId)) {
          const next = prev.filter((id) => id !== schemeId);
          localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
          notify('Removed scheme from comparison.', 'info');
          return next;
        }
        if (prev.length >= 3) {
          notify('You can compare up to 3 schemes at a time. Remove one first.', 'error');
          return prev;
        }
        const next = [...prev, schemeId];
        localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
        notify(`Added to comparison (${next.length}/3).`, 'success');
        return next;
      });
    },
    [notify]
  );

  const removeCompareScheme = useCallback((schemeId: number) => {
    setCompareIds((prev) => {
      const next = prev.filter((id) => id !== schemeId);
      localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    localStorage.removeItem(COMPARE_KEY);
  }, []);

  const setGuestProfile = useCallback((profile: CitizenProfile) => {
    setGuestProfileState(profile);
    try {
      localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, []);

  const setLastEligibility = useCallback((res: EligibilityCheckResponse | null) => {
    setLastEligibilityState(res);
    try {
      if (res) localStorage.setItem(LAST_ELIGIBILITY_KEY, JSON.stringify(res));
      else localStorage.removeItem(LAST_ELIGIBILITY_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        pathname,
        navigate,
        user,
        authLoading,
        setUser,
        refreshUser,
        logout,
        savedIds,
        toggleSaveScheme,
        compareIds,
        toggleCompareScheme,
        removeCompareScheme,
        clearCompare,
        guestProfile,
        setGuestProfile,
        lastEligibility,
        setLastEligibility,
        notify,
        toast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
