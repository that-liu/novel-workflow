'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Novel } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import AIChat from '@/components/AIChat';
import Link from 'next/link';

export default function BrainstormPage() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);
  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const brainstormPrompt = `你是一位经验丰富的小说策划编辑。用户正在创作小说《${novel.title}》${novel.genre ? `（类型：${novel.genre}）` : ''}${novel.description ? `，简介：${novel.description}` : ''}。请帮助用户进行头脑风暴，包括但不限于：世界观设定、主题思想、故事核心冲突、叙事视角、开篇钩子等。用中文回答，每次只深入探讨一个方向。`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回项目</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-2">💡 头脑风暴</h1>
      <p className="text-gray-500 text-sm mb-6">与 AI 讨论你的故事创意，探索世界观、主题和核心冲突</p>

      <div className="mb-6">
        <label className="text-sm font-semibold text-gray-700 block mb-2">创作笔记</label>
        <textarea
          value={novel.notes}
          onChange={e => {
            const updated = { ...novel, notes: e.target.value };
            setNovel(updated);
          }}
          onBlur={() => saveProject(novel)}
          className="w-full border border-gray-300 rounded-xl p-4 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="在这里记录你的灵感、设定和想法..."
        />
      </div>

      <AIChat systemPrompt={brainstormPrompt} placeholder="例如：帮我想一个赛博朋克背景下的核心冲突..." />
    </div>
  );
}
