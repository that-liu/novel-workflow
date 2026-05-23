'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Novel } from '@/lib/types';
import { getProject } from '@/lib/storage';
import Link from 'next/link';

const steps = [
  { key: 'brainstorm', label: '💡 头脑风暴', desc: '构思主题与设定' },
  { key: 'characters', label: '👤 角色设计', desc: '创建故事角色' },
  { key: 'outline', label: '📋 情节大纲', desc: '规划章节结构' },
  { key: 'write', label: '✍️ 开始写作', desc: '逐章创作' },
  { key: 'export', label: '📦 导出作品', desc: '下载完整小说' },
];

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const totalWords = novel.chapters.reduce((s, c) => s + c.wordCount, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 返回项目列表</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">{novel.title}</h1>
        <div className="flex gap-4 mt-2 text-sm text-gray-500">
          {novel.genre && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{novel.genre}</span>}
          <span>{novel.chapters.length} 章</span>
          <span>{totalWords.toLocaleString()} 字</span>
          <span>{novel.characters.length} 个角色</span>
        </div>
        {novel.description && <p className="mt-3 text-gray-600">{novel.description}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map(step => (
          <Link
            key={step.key}
            href={`/project/${id}/${step.key}`}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <div className="text-2xl mb-2">{step.label.slice(0, 2)}</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600">{step.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{step.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
