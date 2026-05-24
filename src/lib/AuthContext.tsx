'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User { email: string; plan: 'free' | 'pro'; }
interface AuthCtx { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<string | null>; register: (email: string, password: string) => Promise<string | null>; logout: () => void; }
const Ctx = createContext<AuthCtx>({ user: null, loading: true, login: async () => null, register: async () => null, logout: () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function decodeJWT(token: string) {
    try { return JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); } catch { return null; }
  }
  useEffect(() => {
    const t = localStorage.getItem('nc_token');
    if (t) {
      const p = decodeJWT(t);
      if (p && p.exp > Date.now()) setUser({ email: p.email, plan: p.plan || 'free' });
      else localStorage.removeItem('nc_token');
    }
    setLoading(false);
  }, []);

  const loginFn = async (email: string, password: string) => {
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const d = await r.json();
    if (d.error) return d.error as string;
    localStorage.setItem('nc_token', d.token);
    setUser({ email, plan: d.plan });
    return null;
  };

  const regFn = async (email: string, password: string) => {
    const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const d = await r.json();
    if (d.error) return d.error as string;
    localStorage.setItem('nc_token', d.token);
    setUser({ email, plan: 'free' });
    return null;
  };

  return <Ctx.Provider value={{ user, loading, login: loginFn, register: regFn, logout: () => { localStorage.removeItem('nc_token'); setUser(null); } }}>{children}</Ctx.Provider>;
}
