'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Novel, Chapter } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import { callAI } from '@/lib/ai';
import Link from 'next/link';

export default function OutlinePage() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const addChapter = () => {
    const ch: Chapter = {
      id: Date.now().toString(),
      title: `第 ${novel.chapters.length + 1} 章`,
      content: '',
      order: novel.chapters.length + 1,
      status: 'draft',
      wordCount: 0,
      summary: '',
    };
    const updated = { ...novel, chapters: [...novel.chapters, ch], updatedAt: new Date().toISOString() };
    setNovel(updated);
    saveProject(updated);
  };

  const updateChapter = (ch: Chapter) => {
    const chs = novel.chapters.map(c => c.id === ch.id ? ch : c);
    setNovel({ ...novel, chapters: chs, updatedAt: new Date().toISOString() });
  };

  const saveChapter = (ch: Chapter) => {
    const chs = novel.chapters.map(c => c.id === ch.id ? ch : c);
    const updated = { ...novel, chapters: chs, updatedAt: new Date().toISOString() };
    setNovel(updated);
    saveProject(updated);
  };

  const removeChapter = (chId: string) => {
    const chs = novel.chapters.filter(c => c.id !== chId).map((c, i) => ({ ...c, order: i + 1 }));
    setNovel({ ...novel, chapters: chs, updatedAt: new Date().toISOString() });
    saveProject({ ...novel, chapters: chs });
  };

  const generateOutline = async () => {
    setGenerating(true);
    const context = `小说《${novel.title}》${novel.genre ? `，类型：${novel.genre}` : ''}${novel.description ? `，简介：${novel.description}` : ''}${novel.notes ? `，设定笔记：${novel.notes}` : ''}`;
    const prompt = `${context}\n\n请为这部小说设计一个完整的情节大纲，包含8-12个章节，每个章节包含标题和一句话摘要。格式：\n第X章：章节标题\n摘要：一句话描述`;
    try {
      const result = await callAI('你是一位专业的小说结构设计师，擅长设计引人入胜的情节结构。', prompt);
      const lines = result.split('\n').filter(l => l.trim());
      const newChapters: Chapter[] = [];
      let order = novel.chapters.length + 1;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/第(\d+)章[：:](.+)/);
        if (match) {
          const title = match[2].trim();
          const nextLine = lines[i + 1]?.replace(/^摘要[：:]\s*/i, '').trim() || '';
          newChapters.push({
            id: Date.now().toString() + i,
            title,
            content: '',
            order: order++,
            status: 'draft',
            wordCount: 0,
            summary: nextLine,
          });
        }
      }
      if (newChapters.length > 0) {
        const updated = { ...novel, chapters: [...novel.chapters, ...newChapters], updatedAt: new Date().toISOString() };
        setNovel(updated);
        saveProject(updated);
      }
    } catch (e) { /* ignore */ }
    setGenerating(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回项目</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 情节大纲</h1>
          <p className="text-gray-500 text-sm">规划你的故事情节结构</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateOutline} disabled={generating} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm hover:bg-indigo-200 disabled:opacity-50">
            {generating ? 'AI 生成中...' : '🤖 AI 生成大纲'}
          </button>
          <button onClick={addChapter} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700">+ 添加章节</button>
        </div>
      </div>

      {novel.chapters.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">📝</p>
          <p>还没有章节，点击上方按钮用 AI 生成大纲</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...novel.chapters].sort((a, b) => a.order - b.order).map(ch => (
            <div key={ch.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                {ch.order}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    value={ch.title}
                    onChange={e => updateChapter({ ...ch, title: e.target.value })}
                    onBlur={() => saveChapter(ch)}
                    className="font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1"
                  />
                  <select
                    value={ch.status}
                    onChange={e => saveChapter({ ...ch, status: e.target.value as Chapter['status'] })}
                    className="text-xs border rounded px-2 py-0.5"
                  >
                    <option value="draft">📝 草稿</option>
                    <option value="writing">✍️ 写作中</option>
                    <option value="done">✅ 已完成</option>
                  </select>
                </div>
                <input
                  value={ch.summary}
                  onChange={e => updateChapter({ ...ch, summary: e.target.value })}
                  onBlur={() => saveChapter(ch)}
                  placeholder="章节摘要..."
                  className="text-sm text-gray-500 w-full mt-1 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1"
                />
                <div className="text-xs text-gray-400 mt-1">{ch.wordCount.toLocaleString()} 字</div>
              </div>
              <div className="flex gap-1">
                <Link href={`/project/${id}/write?chapter=${ch.id}`} className="text-xs text-indigo-600 hover:text-indigo-700">写作</Link>
                <button onClick={() => removeChapter(ch.id)} className="text-xs text-gray-400 hover:text-red-500 ml-1">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
