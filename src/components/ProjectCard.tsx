'use client';
import Link from 'next/link';
import { Novel } from '@/lib/types';

export default function ProjectCard({ novel, onDelete }: { novel: Novel; onDelete: (id: string) => void }) {
  const totalWords = novel.chapters.reduce((sum, c) => sum + c.wordCount, 0);
  const doneChapters = novel.chapters.filter(c => c.status === 'done').length;
  const progress = novel.chapters.length > 0 ? Math.round((doneChapters / novel.chapters.length) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <Link href={`/project/${novel.id}`} className="text-lg font-semibold text-gray-900 hover:text-indigo-600">
          {novel.title || '未命名作品'}
        </Link>
        <button
          onClick={() => onDelete(novel.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
          title="删除项目"
        >
          ✕
        </button>
      </div>
      <div className="text-sm text-gray-500 mb-3">
        {novel.genre && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded mr-2">{novel.genre}</span>}
        {novel.description && <span className="line-clamp-1">{novel.description}</span>}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>{novel.chapters.length} 章</span>
        <span>{totalWords.toLocaleString()} 字</span>
        <span>{novel.characters.length} 个角色</span>
      </div>
      {novel.chapters.length > 0 && (
        <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
