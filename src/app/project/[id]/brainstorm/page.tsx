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

  const brainstormPrompt = `你是一位经验丰富的小说策划编辑。用户正在创作小说《${novel.title}》${novel.genre ? `（类型：${novel.genre}）` : ''}${novel.description ? `，简介：${novel.description}` : ''}${novel.notes ? `，已有设定：${novel.notes}` : ''}。请帮助用户进行头脑风暴，探讨以下方面（每次深入一个）：1)世界观设定 2)主题思想 3)核心冲突 4)叙事视角 5)开篇钩子 6)角色构思 7)情节走向。用中文回答，给出具体、可操作的建议。`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回项目</Link>
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">💡 头脑风暴</h1>
        <p className="text-gray-500 text-sm mt-1">与 AI 自由讨论故事创意、主题和情节方向。AI 会记住你们的对话上下文。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm sticky top-20">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📝 创作笔记</h3>
            <textarea
              value={novel.notes}
              onChange={e => { const updated = { ...novel, notes: e.target.value, updatedAt: new Date().toISOString() }; setNovel(updated); }}
              onBlur={() => saveProject(novel)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="记录你的灵感、设定和想法..."
            />
            <button onClick={() => saveProject(novel)} className="mt-2 w-full bg-indigo-50 text-indigo-700 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-100">
              保存笔记
            </button>

            <div className="mt-4 p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
              <p className="font-semibold mb-1">💡 对话提示</p>
              <p>在右侧对话框输入你的想法，AI 会给出建议。试试这些：</p>
              <ul className="mt-1 space-y-0.5 text-amber-600">
                <li>• "帮我想几个开篇方式"</li>
                <li>• "主角应该有什么样的性格"</li>
                <li>• "这个世界观有什么可以深挖的"</li>
                <li>• "给我几个反转情节的点子"</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 h-[600px]">
          <AIChat
            systemPrompt={brainstormPrompt}
            placeholder="输入你的想法，与 AI 讨论... (Enter 发送，Shift+Enter 换行)"
            title="🤖 AI 头脑风暴助手（支持多轮对话）"
          />
        </div>
      </div>
    </div>
  );
}
