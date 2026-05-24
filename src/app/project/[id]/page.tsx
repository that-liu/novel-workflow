'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Novel } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import Link from 'next/link';

const steps = [
  { key: 'world', label: '🌌 世界观设定', desc: '时代背景、地理、社会结构', color: 'from-purple-500 to-indigo-500' },
  { key: 'brainstorm', label: '💡 头脑风暴', desc: '构思主题与核心冲突', color: 'from-yellow-500 to-orange-500' },
  { key: 'characters', label: '👤 角色设计', desc: '创建和设计故事角色', color: 'from-green-500 to-teal-500' },
  { key: 'timeline', label: '⏳ 故事时间线', desc: '按时间排列关键事件', color: 'from-blue-500 to-cyan-500' },
  { key: 'outline', label: '📋 情节大纲', desc: '规划章节结构与摘要', color: 'from-pink-500 to-rose-500' },
  { key: 'write', label: '✍️ 开始写作', desc: '逐章 AI 辅助创作', color: 'from-indigo-500 to-purple-500' },
  { key: 'bible', label: '📖 故事圣经', desc: '设定集、角色、时间线一览', color: 'from-amber-500 to-orange-500' },
  { key: 'export', label: '📦 导出作品', desc: '预览完整小说并下载', color: 'from-gray-500 to-slate-500' },
];

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', genre: '', description: '' });

  useEffect(() => {
    getProject(id as string).then(n => {
      if (n) { setNovel(n); setForm({ title: n.title, genre: n.genre, description: n.description }); }
    });
  }, [id]);

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const totalWords = novel.chapters.reduce((s, c) => s + c.wordCount, 0);
  const doneChapters = novel.chapters.filter(c => c.status === 'done').length;
  const writingChapters = novel.chapters.filter(c => c.status === 'writing').length;
  const overallProgress = novel.chapters.length > 0 ? Math.round((doneChapters / novel.chapters.length) * 100) : 0;

  const saveMeta = () => {
    const updated = { ...novel, ...form, updatedAt: new Date().toISOString() };
    setNovel(updated);
    saveProject(updated);
    setEditing(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 返回项目列表</Link>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-2 mb-8 shadow-sm">
        {editing ? (
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="text-2xl font-bold w-full border rounded-lg px-3 py-2" />
            <div className="flex gap-3">
              <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">选择类型</option>
                <option>玄幻</option><option>言情</option><option>悬疑</option><option>科幻</option><option>武侠</option><option>都市</option><option>历史</option><option>奇幻</option><option>恐怖</option><option>轻小说</option>
              </select>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="一句话简介" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveMeta} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm">保存</button>
              <button onClick={() => setEditing(false)} className="text-gray-500 px-4 py-1.5 rounded-lg text-sm">取消</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">{novel.title}</h1>
              <div className="flex items-center gap-3">
                <select
                  value={novel.status || 'planning'}
                  onChange={e => {
                    const updated = { ...novel, status: e.target.value as Novel['status'], updatedAt: new Date().toISOString() };
                    setNovel(updated);
                    saveProject(updated);
                  }}
                  className="border rounded-lg px-2 py-1 text-xs"
                >
                  <option value="planning">规划中</option>
                  <option value="writing">写作中</option>
                  <option value="completed">已完成</option>
                  <option value="paused">暂停</option>
                </select>
                <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-indigo-600">编辑信息</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              {novel.genre && <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full text-xs font-medium">{novel.genre}</span>}
              <span>📖 {novel.chapters.length} 章</span>
              <span>📝 {totalWords.toLocaleString()} 字</span>
              <span>👤 {novel.characters.length} 个角色</span>
              <span>✍️ {writingChapters} 章写作中</span>
              <span>✅ {doneChapters} 章已完成</span>
            </div>
            {novel.description && <p className="mt-3 text-gray-600 text-sm italic">&ldquo;{novel.description}&rdquo;</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: '总进度', value: `${overallProgress}%`, color: 'text-indigo-600' },
          { label: '总字数', value: totalWords.toLocaleString(), color: 'text-green-600' },
          { label: '章节', value: `${doneChapters}/${novel.chapters.length}`, color: 'text-amber-600' },
          { label: '角色', value: novel.characters.length.toString(), color: 'text-purple-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map(step => (
          <Link
            key={step.key}
            href={`/project/${id}/${step.key}`}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-300 transition-all group relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${step.color}`} />
            <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600">{step.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{step.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
