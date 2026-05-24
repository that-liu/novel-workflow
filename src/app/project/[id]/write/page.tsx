'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Novel } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import ChapterEditor from '@/components/ChapterEditor';
import Link from 'next/link';

export default function WritePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const chapterId = searchParams.get('chapter');
  const [novel, setNovel] = useState<Novel | null>(null);

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  if (!novel) return <div className="max-w-6xl mx-auto px-4 py-8 text-gray-400 dark:text-gray-500">加载中...</div>;

  const chapter = chapterId ? novel.chapters.find(c => c.id === chapterId) : novel.chapters[0];

  if (!chapter) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href={`/project/${id}/outline`} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">← 返回大纲</Link>
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <p className="text-3xl mb-2">✍️</p>
          <p className="dark:text-gray-400">还没有章节，先去「情节大纲」创建章节</p>
          <Link href={`/project/${id}/outline`} className="text-indigo-600 hover:text-indigo-700 text-sm mt-4 inline-block">前往大纲页</Link>
        </div>
      </div>
    );
  }

  const novelContext = `小说《${novel.title}》${novel.genre ? `，类型：${novel.genre}` : ''}${novel.description ? `，简介：${novel.description}` : ''}${novel.notes ? `，设定：${novel.notes}` : ''}。角色：${novel.characters.map(c => `${c.name}(${c.role || '角色'}): ${c.personality}`).join('；')}`;

  const updateChapter = (updated: typeof chapter) => {
    const chs = novel.chapters.map(c => c.id === updated.id ? updated : c);
    const updatedNovel = { ...novel, chapters: chs, updatedAt: new Date().toISOString() };
    setNovel(updatedNovel);
    saveProject(updatedNovel);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href={`/project/${id}/outline`} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">← 返回大纲</Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">✍️ 写作 - {chapter.title}</h1>
        </div>
        {/* Chapter navigation: prev | dropdown | next */}
        {novel.chapters.length > 1 && (() => {
          const sorted = [...novel.chapters].sort((a, b) => a.order - b.order);
          const curIdx = sorted.findIndex(ch => ch.id === chapter.id);
          const prev = curIdx > 0 ? sorted[curIdx - 1] : null;
          const next = curIdx < sorted.length - 1 ? sorted[curIdx + 1] : null;
          return (
            <div className="flex items-center gap-2">
              {prev ? (
                <Link href={`/project/${id}/write?chapter=${prev.id}`} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium">
                  ‹ 上一章
                </Link>
              ) : (
                <span className="text-xs text-gray-300 dark:text-gray-600 px-2.5 py-1.5">‹ 上一章</span>
              )}
              <select
                value={chapter.id}
                onChange={e => window.location.href = `/project/${id}/write?chapter=${e.target.value}`}
                className="border rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              >
                {sorted.map(ch => (
                  <option key={ch.id} value={ch.id}>
                    第{ch.order}章 {ch.title}
                  </option>
                ))}
              </select>
              {next ? (
                <Link href={`/project/${id}/write?chapter=${next.id}`} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium">
                  下一章 ›
                </Link>
              ) : (
                <span className="text-xs text-gray-300 dark:text-gray-600 px-2.5 py-1.5">下一章 ›</span>
              )}
            </div>
          );
        })()}
      </div>

      <ChapterEditor chapter={chapter} onSave={updateChapter} novelContext={novelContext} characters={novel.characters} worldSettings={novel.worldSettings} />
    </div>
  );
}
