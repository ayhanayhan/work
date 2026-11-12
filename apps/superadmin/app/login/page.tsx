'use client';
import {saText} from '../lib/text-i18n';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API='/api/v1';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(API + '/superadmin-auth/refresh', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', 'x-auth-client': 'superadmin' }, body: '{}' });
        if (r.ok) router.replace('/');
      } catch {}
    })();
  }, [router]);

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch(API + '/superadmin-auth/login', {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-auth-client': 'superadmin' },
        body: JSON.stringify({ email: String(f.get('email') || '').trim(), password: String(f.get('password') || '') }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.accessToken) throw new Error(saText('login.invalid'));
      router.replace('/');
    } catch (err: any) { setError(err?.message || saText('login.failed')); }
    finally { setBusy(false); }
  }

  return <div className="login"><form className="login-card" onSubmit={login} autoComplete="on">
    <h1>Super Admin</h1><p className="muted">{saText('login.platform')}</p>
    {error && <div className="error">{error}</div>}
    <label>{saText('login.email')}</label><input name="email" type="email" autoComplete="username" required maxLength={254} autoCapitalize="none" spellCheck={false}/>
    <label>{saText('login.password')}</label><input name="password" type="password" autoComplete="current-password" required maxLength={128}/>
    <button className="btn" style={{width:'100%'}} disabled={busy}>{busy?saText('login.checking'):saText('login.action')}</button>
  </form></div>;
}
