'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');
    const fn = authMode === 'login' ? (await import('@/lib/AuthContext')).useAuth().login : (await import('@/lib/AuthContext')).useAuth().register;
    if (authMode === 'login') {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      localStorage.setItem('nc_token', d.token);
    } else {
      const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      localStorage.setItem('nc_token', d.token);
    }
    window.location.reload();
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700">📖 NovelCraft Pro</Link>
            <div className="flex gap-6 text-sm">
              <Link href="/" className={`${pathname === '/' ? 'text-indigo-600 font-semibold' : 'text-gray-600'} hover:text-indigo-600`}>项目</Link>
              <Link href="/pricing" className={`${pathname === '/pricing' ? 'text-indigo-600 font-semibold' : 'text-gray-600'} hover:text-indigo-600`}>💰 定价</Link>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.plan === 'pro' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {user.plan === 'pro' ? '⚡ Pro' : '免费版'}
                </span>
                <span className="text-gray-600">{user.email}</span>
                <button onClick={logout} className="text-gray-400 hover:text-red-500">退出</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowAuth(true); setAuthMode('login'); }} className="text-gray-600 hover:text-indigo-600">登录</button>
                <button onClick={() => { setShowAuth(true); setAuthMode('register'); }} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700">免费注册</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showAuth && !user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setShowAuth(false); }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{authMode === 'login' ? '登录' : '注册'} NovelCraft Pro</h2>
            <div className="space-y-4">
              <div><label className="text-sm text-gray-500">邮箱</label><input value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm" placeholder="your@email.com" /></div>
              <div><label className="text-sm text-gray-500">密码</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm" placeholder="••••••" /></div>
              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</div>}
              <button onClick={handleAuth} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700">{authMode === 'login' ? '登录' : '创建账号'}</button>
              <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full text-sm text-gray-500 hover:text-indigo-600">
                {authMode === 'login' ? '没有账号？免费注册' : '已有账号？登录'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
