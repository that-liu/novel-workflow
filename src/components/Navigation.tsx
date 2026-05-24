'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('novelcraft-theme', next ? 'dark' : 'light');
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700">
          📖 NovelCraft
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex gap-6 text-sm">
            <Link href="/" className={`${pathname === '/' ? 'text-indigo-600 font-semibold' : 'text-gray-600 dark:text-gray-400'} hover:text-indigo-600`}>
              项目
            </Link>
            <Link href="/agents" className={`${pathname === '/agents' ? 'text-indigo-600 font-semibold' : 'text-gray-600 dark:text-gray-400'} hover:text-indigo-600`}>
              🤖 Agent
            </Link>
          </div>
          <button
            onClick={toggleDark}
            className="text-lg p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={dark ? '切换亮色模式' : '切换深色模式'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}
