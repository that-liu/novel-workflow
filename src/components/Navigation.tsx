'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700">
          📖 NovelCraft
        </Link>
        <div className="flex gap-6 text-sm">
          <Link href="/" className={`${pathname === '/' ? 'text-indigo-600 font-semibold' : 'text-gray-600'} hover:text-indigo-600`}>
            项目
          </Link>
        </div>
      </div>
    </nav>
  );
}
