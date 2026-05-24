'use client';
import { useState } from 'react';
import { Novel, Chapter } from '@/lib/types';
import { saveProject } from '@/lib/storage';

export default function AutoWrite({ novel, onUpdate }: { novel: Novel; onUpdate: (n: Novel) => void }) {
  const [running, setRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [writtenChapters, setWrittenChapters] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const draftChapters = [...novel.chapters]
    .filter(c => c.status === 'draft')
    .sort((a, b) => a.order - b.order);

  const startAutoWrite = async () => {
    if (running) return;
    setRunning(true);
    setError('');
    setWrittenChapters({});
    setCurrentIdx(-1);

    try {
      const resp = await fetch('/api/ai/autowrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novel, chapters: draftChapters }),
      });
      if (!resp.ok) throw new Error('API error');

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const updatedChapters = [...novel.chapters];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const msg = JSON.parse(line.slice(6));
              if (msg.phase === 'error') { setError(msg.error); setRunning(false); return; }
              if (msg.phase === 'complete') { setRunning(false); continue; }
              if (msg.phase === 'writing') {
                if (msg.status === 'running') {
                  setCurrentIdx(msg.chapterIndex);
                } else if (msg.status === 'done' && msg.chapterId) {
                  setWrittenChapters(prev => ({ ...prev, [msg.chapterId]: msg.content }));
                  // Update in chapters array
                  const idx = updatedChapters.findIndex(c => c.id === msg.chapterId);
                  if (idx >= 0) {
                    updatedChapters[idx] = {
                      ...updatedChapters[idx],
                      content: msg.content,
                      wordCount: msg.wordCount,
                      status: 'done' as const,
                    };
                  }
                  // Save progress
                  const updated = { ...novel, chapters: updatedChapters, updatedAt: new Date().toISOString() };
                  onUpdate(updated);
                  saveProject(updated);
                } else if (msg.status === 'error' && msg.chapterId) {
                  const idx = updatedChapters.findIndex(c => c.id === msg.chapterId);
                  if (idx >= 0) {
                    updatedChapters[idx] = {
                      ...updatedChapters[idx],
                      content: msg.content,
                      wordCount: 0,
                      status: 'writing' as const,
                    };
                  }
                }
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setRunning(false);
  };

  return (
    <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border border-green-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-1">🤖 自动写作</h3>
      <p className="text-sm text-gray-500 mb-4">AI 将按大纲逐章撰写所有草稿章节（{draftChapters.length} 章待写）</p>

      {!running && Object.keys(writtenChapters).length === 0 && (
        <button
          onClick={startAutoWrite}
          disabled={draftChapters.length === 0}
          className="w-full bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 shadow-sm"
        >
          {draftChapters.length === 0 ? '所有章节已写完 ✅' : `🚀 开始自动写作（${draftChapters.length} 章）`}
        </button>
      )}

      {running && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${draftChapters.length > 0 ? ((currentIdx + 1) / draftChapters.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
              {currentIdx + 1}/{draftChapters.length}
            </span>
          </div>
          <p className="text-sm text-green-700 text-center">
            ✍️ 正在写第{draftChapters[currentIdx]?.order || ''}章「{draftChapters[currentIdx]?.title || ''}」...
          </p>
          <div className="flex gap-1.5 justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Written chapters list */}
      {Object.keys(writtenChapters).length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700">已完成章节：</p>
          {novel.chapters.filter(c => writtenChapters[c.id]).sort((a, b) => a.order - b.order).map(ch => (
            <div key={ch.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm border border-gray-100">
              <span>第{ch.order}章 {ch.title}</span>
              <span className="text-xs text-green-600">{writtenChapters[ch.id].replace(/\s/g, '').length.toLocaleString()} 字 ✅</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="mt-3 bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

      {!running && Object.keys(writtenChapters).length > 0 && draftChapters.length > 0 && (
        <button
          onClick={startAutoWrite}
          className="mt-3 w-full border border-green-300 text-green-700 px-4 py-2 rounded-xl text-sm hover:bg-green-50"
        >
          ▶️ 继续写剩余章节
        </button>
      )}
    </div>
  );
}
