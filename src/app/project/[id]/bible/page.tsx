'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Novel, TimelineEvent } from '@/lib/types';
import { getProject } from '@/lib/storage';
import Link from 'next/link';

const WORLD_LABELS: Record<string, string> = {
  era: '时代背景',
  geography: '地理环境',
  magic: '力量体系',
  society: '社会结构',
  factions: '势力派系',
  rules: '核心法则',
};

export default function StoryBible() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  if (!novel) return <div className="max-w-5xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const sortedChapters = [...novel.chapters].sort((a, b) => a.order - b.order);
  const totalWords = sortedChapters.reduce((s, c) => s + c.wordCount, 0);
  const worldSettings = novel.worldSettings;
  const timelineEvents: TimelineEvent[] = novel.timelineEvents || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回项目</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">📖 故事圣经</h1><p className="text-gray-500 text-sm">你的故事设定全集</p></div>
        <button onClick={() => window.print()} className="bg-gray-700 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-800">🖨️ 打印</button>
      </div>

      {/* Meta */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-3">📖 {novel.title}</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          {novel.genre && <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium">{novel.genre}</span>}
          <span className="text-gray-500">{sortedChapters.length} 章 · {totalWords.toLocaleString()} 字</span>
          <span className="text-gray-500">{novel.characters.length} 个角色</span>
        </div>
        {novel.description && <p className="mt-3 text-gray-600 italic">&ldquo;{novel.description}&rdquo;</p>}
      </section>

      {/* World */}
      {worldSettings && Object.entries(worldSettings).some(([, v]) => v) && (
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-3">🌌 世界观</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(worldSettings).filter(([, v]) => v).map(([key, value]) => (
              <div key={key} className="bg-gray-50 rounded-xl p-3">
                <span className="font-semibold text-gray-700">{WORLD_LABELS[key] || key}</span>
                <p className="text-gray-600 mt-1">{value as string}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Characters */}
      {novel.characters.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-3">👤 角色 ({novel.characters.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {novel.characters.map(char => (
              <div key={char.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-gray-800">{char.name}</span>
                  {char.role && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{char.role}</span>}
                </div>
                {char.personality && <p className="text-sm text-gray-600 mb-1"><b>性格：</b>{char.personality}</p>}
                {char.backstory && <p className="text-sm text-gray-600 mb-1"><b>背景：</b>{char.backstory}</p>}
                {char.motivation && <p className="text-sm text-gray-600"><b>动机：</b>{char.motivation}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      {timelineEvents.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-3">⏳ 故事时间线</h2>
          <div className="space-y-2">
            {timelineEvents.map((evt: { id: string; time: string; title: string; description: string }, i: number) => (
              <div key={evt.id || i} className="flex items-start gap-3 text-sm">
                <span className="font-mono text-indigo-600 shrink-0 w-20">{evt.time}</span>
                <span className="font-semibold text-gray-700">{evt.title}</span>
                {evt.description && <span className="text-gray-500">— {evt.description}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chapters */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-3">📋 章节大纲</h2>
        {sortedChapters.map(ch => (
          <div key={ch.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 text-sm">
            <span className="font-mono text-indigo-600 shrink-0">第{ch.order}章</span>
            <div>
              <span className="font-semibold text-gray-700">{ch.title}</span>
              {ch.summary && <p className="text-gray-500 mt-0.5">{ch.summary}</p>}
              <span className="text-xs text-gray-400">{ch.wordCount.toLocaleString()}字 · {ch.status === 'done' ? '✅' : ch.status === 'writing' ? '✍️' : '📝'}</span>
            </div>
          </div>
        ))}
        {sortedChapters.length === 0 && <p className="text-sm text-gray-400">暂无章节</p>}
      </section>
    </div>
  );
}
