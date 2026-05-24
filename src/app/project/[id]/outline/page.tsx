'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Novel, Chapter } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import { callAI } from '@/lib/ai';
import Link from 'next/link';

export default function OutlinePage() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const sortedChapters = [...novel.chapters].sort((a, b) => a.order - b.order);

  const updateAndSave = (chs: Chapter[]) => {
    const updated = { ...novel, chapters: chs, updatedAt: new Date().toISOString() };
    setNovel(updated);
    saveProject(updated);
  };

  const addChapter = () => {
    const ch: Chapter = { id: Date.now().toString(), title: '', content: '', order: novel.chapters.length + 1, status: 'draft', wordCount: 0, summary: '' };
    updateAndSave([...novel.chapters, ch]);
  };

  const saveChapter = (ch: Chapter) => {
    updateAndSave(novel.chapters.map(c => c.id === ch.id ? ch : c));
  };

  const removeChapter = (chId: string) => {
    updateAndSave(novel.chapters.filter(c => c.id !== chId).map((c, i) => ({ ...c, order: i + 1 })));
  };

  const generateOutline = async () => {
    setGenerating(true);
    const context = `小说《${novel.title}》${novel.genre ? `，类型：${novel.genre}` : ''}${novel.description ? `，简介：${novel.description}` : ''}${novel.notes ? `，设定：${novel.notes}` : ''}`;
    const prompt = `${context}\n\n请为这部小说设计一个完整的情节大纲，包含8-12个章节，每个章节包含标题和一句话摘要。格式严格按：\n第X章：章节标题\n摘要：一句话描述`;
    try {
      const result = await callAI('你是一位专业的小说结构设计师。', prompt);
      const lines = result.split('\n').filter(l => l.trim());
      const newChapters: Chapter[] = [];
      let order = novel.chapters.length + 1;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/第(\d+)章[：:](.+)/);
        if (match) {
          newChapters.push({
            id: Date.now().toString() + i, title: match[2].trim(), content: '', order: order++,
            status: 'draft' as const, wordCount: 0, summary: lines[i + 1]?.replace(/^摘要[：:]\s*/i, '').trim() || '',
          });
        }
      }
      if (newChapters.length > 0) updateAndSave([...novel.chapters, ...newChapters]);
    } catch { /* ignore */ }
    setGenerating(false);
  };

  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const reordered = [...sortedChapters];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    updateAndSave(reordered.map((c, i) => ({ ...c, order: i + 1 })));
    setDragIdx(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回项目</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">📋 情节大纲</h1><p className="text-gray-500 text-sm">拖拽章节标题排序，点击章节卡片编辑</p></div>
        <div className="flex gap-2">
          <button onClick={generateOutline} disabled={generating} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm hover:bg-indigo-200 disabled:opacity-50 font-medium">
            {generating ? 'AI 生成中...' : '🤖 AI 生成大纲'}
          </button>
          <button onClick={addChapter} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700 font-medium">+ 添加章节</button>
        </div>
      </div>

      {sortedChapters.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><p className="text-4xl mb-3">📝</p><p>还没有章节，点击上方按钮用 AI 生成大纲</p></div>
      ) : (
        <div className="space-y-2">
          {sortedChapters.map((ch, idx) => (
            <div
              key={ch.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(idx)}
              className={`bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 transition-all hover:shadow-sm cursor-grab active:cursor-grabbing ${dragIdx === idx ? 'opacity-50 scale-95' : ''}`}
            >
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{ch.order}</div>
                <span className="text-[10px] text-gray-400">⠿</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <input
                    value={ch.title}
                    onChange={e => saveChapter({ ...ch, title: e.target.value })}
                    className="font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1 w-full"
                    placeholder={`第 ${ch.order} 章标题`}
                  />
                  <select value={ch.status} onChange={e => saveChapter({ ...ch, status: e.target.value as Chapter['status'] })} className="text-xs border rounded-lg px-2 py-1 shrink-0">
                    <option value="draft">📝</option><option value="writing">✍️</option><option value="done">✅</option>
                  </select>
                </div>
                <input value={ch.summary} onChange={e => saveChapter({ ...ch, summary: e.target.value })} placeholder="章节摘要..." className="text-sm text-gray-500 w-full mt-1 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1" />
                <div className="text-xs text-gray-400 mt-1">{ch.wordCount.toLocaleString()}字</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Link href={`/project/${id}/write?chapter=${ch.id}`} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-100 font-medium">写作</Link>
                <button onClick={() => removeChapter(ch.id)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
