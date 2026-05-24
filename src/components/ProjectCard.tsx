'use client';
import Link from 'next/link';
import { Novel } from '@/lib/types';

export default function ProjectCard({ novel, onDelete }: { novel: Novel; onDelete: (id: string) => void }) {
  const totalWords = novel.chapters.reduce((sum, c) => sum + c.wordCount, 0);
  const doneChapters = novel.chapters.filter(c => c.status === 'done').length;
  const writingChap = [...novel.chapters].sort((a, b) => a.order - b.order).find(c => c.status === 'writing' || c.status === 'draft');
  const progress = novel.chapters.length > 0 ? Math.round((doneChapters / novel.chapters.length) * 100) : 0;
  const timeAgo = getTimeAgo(new Date(novel.updatedAt));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-3">
        <Link href={`/project/${novel.id}`} className="text-lg font-semibold text-gray-900 hover:text-indigo-600">
          {novel.title || '未命名作品'}
        </Link>
        <button onClick={() => onDelete(novel.id)} className="text-gray-400 hover:text-red-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity" title="删除">✕</button>
      </div>
      <div className="text-sm text-gray-500 mb-3">
        {novel.genre ? <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded mr-2">{novel.genre}</span> : null}
        {novel.description && <span className="line-clamp-1">{novel.description}</span>}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
        <span>{novel.chapters.length} 章</span>
        <span>{totalWords.toLocaleString()} 字</span>
        <span>{novel.characters.length} 个角色</span>
        <span className="ml-auto">{timeAgo}</span>
      </div>
      {novel.chapters.length > 0 && (
        <div className="mb-3 w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex gap-2">
        {writingChap ? (
          <Link href={`/project/${novel.id}/write?chapter=${writingChap.id}`} className="flex-1 text-center text-xs bg-indigo-600 text-white py-1.5 rounded-lg hover:bg-indigo-700 font-medium">
            ✍️ 继续写作
          </Link>
        ) : novel.chapters.length > 0 ? (
          <Link href={`/project/${novel.id}/outline`} className="flex-1 text-center text-xs bg-gray-100 text-gray-600 py-1.5 rounded-lg hover:bg-gray-200 font-medium">
            📋 查看大纲
          </Link>
        ) : null}
        <Link href={`/project/${novel.id}/bible`} className="text-center text-xs bg-gray-50 text-gray-500 py-1.5 px-3 rounded-lg hover:bg-gray-100 font-medium">
          📖 故事圣经
        </Link>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}
