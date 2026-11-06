'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

const API = '/api/v1';

export type MasterLocale = {locale: string; label: string; isDefault: boolean};

type Ctx = {
  locales: MasterLocale[];
  localesLoading: boolean;
  localesError: string | null;
  reloadLocales: () => Promise<void>;
  token: string;
  restoring: boolean;
  request: (path: string, init?: RequestInit) => Promise<any>;
  logout: () => Promise<void>;
};

const MasterSessionContext = createContext<Ctx | null>(null);

export function MasterSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [restoring, setRestoring] = useState(true);
  const [locales, setLocales] = useState<MasterLocale[]>([]);
  const [localesLoading, setLocalesLoading] = useState(true);
  const [localesError, setLocalesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const r = await fetch(API + '/superadmin-auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/json',
            'x-auth-client': 'superadmin',
          },
          body: '{}',
        });

        const j = await r.json().catch(() => ({}));

        if (active && r.ok && j?.accessToken) {
          setToken(j.accessToken);
        }
      } finally {
        if (active) setRestoring(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const request = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const isForm =
        typeof FormData !== 'undefined' && init.body instanceof FormData;

      const headers: any = {
        ...(init.headers || {}),
      };

      if (token) {
        headers.authorization = `Bearer ${token}`;
      }

      if (!isForm) {
        headers['content-type'] = 'application/json';
      }

      let r = await fetch(API + path, {
        ...init,
        credentials: 'include',
        headers,
      });

      if (r.status === 401) {
        const rr = await fetch(API + '/superadmin-auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/json',
            'x-auth-client': 'superadmin',
          },
          body: '{}',
        });

        const x = await rr.json().catch(() => ({}));

        if (rr.ok && x?.accessToken) {
          setToken(x.accessToken);
          headers.authorization = `Bearer ${x.accessToken}`;

          r = await fetch(API + path, {
            ...init,
            credentials: 'include',
            headers,
          });
        } else {
          setToken('');
          router.replace('/login');
          throw new Error('Oturum süresi doldu.');
        }
      }

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(
          Array.isArray(j?.message)
            ? j.message.join(', ')
            : j?.message || 'İşlem başarısız.',
        );
      }

      return j;
    },
    [token, router],
  );

  const reloadLocales = useCallback(async () => {
    if (restoring || !token) {
      setLocalesLoading(false);
      return;
    }
    setLocalesLoading(true);
    setLocalesError(null);
    try {
      const rows = await request('/superadmin/platform-locales');
      if (!Array.isArray(rows)) throw new Error('Aktif diller alınamadı.');
      const seen = new Set<string>();
      const normalized = rows.map((x: any) => ({
        locale: String(x.locale || '').toLowerCase(),
        label: String(x.label || x.locale || ''),
        isDefault: x.isDefault === true,
      })).filter((x: MasterLocale) => {
        if (!x.locale || seen.has(x.locale)) return false;
        seen.add(x.locale);
        return true;
      });
      if (!normalized.length) throw new Error('Sitede aktif dil bulunamadı.');
      setLocales(normalized);
    } catch (error: any) {
      setLocalesError(error?.message || 'Aktif diller yüklenemedi.');
    } finally {
      setLocalesLoading(false);
    }
  }, [request, restoring, token]);

  useEffect(() => { void reloadLocales(); }, [reloadLocales]);

  const logout = useCallback(async () => {
    try {
      await fetch(API + '/superadmin-auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-auth-client': 'superadmin',
        },
        body: '{}',
      });
    } finally {
      setToken('');
      router.replace('/login');
    }
  }, [router]);

  const value = useMemo(
    () => ({
      token,
      restoring,
      request,
      logout,
      locales,
      localesLoading,
      localesError,
      reloadLocales,
    }),
    [token, restoring, request, logout, locales, localesLoading, localesError, reloadLocales],
  );

  return (
    <MasterSessionContext.Provider value={value}>
      {children}
    </MasterSessionContext.Provider>
  );
}

export function useMasterSession() {
  const value = useContext(MasterSessionContext);

  if (!value) {
    throw new Error(
      'useMasterSession must be used inside MasterSessionProvider',
    );
  }

  return value;
}
