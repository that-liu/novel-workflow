'use client';
import { useState, useEffect } from 'react';
import { Novel } from '@/lib/types';
import { listProjects, saveProject, deleteProject } from '@/lib/storage';
import ProjectCard from '@/components/ProjectCard';
import QuickCreate from '@/components/QuickCreate';
import MultiAgentPanel from '@/components/MultiAgentPanel';

const GUIDE_STEPS = [
  { icon: '📖', title: '创建项目', desc: '给小说起个名字，选择类型，一句话简介' },
  { icon: '🌌', title: '世界观设定', desc: '构建故事世界的背景、规则和社会结构' },
  { icon: '💡', title: '头脑风暴', desc: '与 AI 对话，深入探讨创意和核心冲突' },
  { icon: '👤', title: '角色设计', desc: 'AI 帮你生成有血有肉的角色设定' },
  { icon: '⏳', title: '故事时间线', desc: '梳理关键事件的时间顺序' },
  { icon: '📋', title: '情节大纲', desc: 'AI 生成章节结构，拖拽调整顺序' },
  { icon: '✍️', title: '开始写作', desc: '分屏编辑器 + 7 种 AI 写作模式' },
  { icon: '📦', title: '导出作品', desc: '预览全文，下载 Markdown 或 TXT' },
];

const GENRES = ['', '玄幻', '言情', '悬疑', '科幻', '武侠', '都市', '历史', '奇幻', '恐怖', '轻小说'];

export default function Dashboard() {
  const [projects, setProjects] = useState<Novel[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [targetWords, setTargetWords] = useState(0);
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('');

  const filtered = projects.filter(p => {
    if (search && !p.title.includes(search) && !p.description.includes(search)) return false;
    if (filterGenre && p.genre !== filterGenre) return false;
    return true;
  });

  useEffect(() => { listProjects().then(setProjects); }, []);

  const create = async () => {
    if (!title.trim()) return;
    const novel: Novel = {
      id: Date.now().toString(),
      title: title.trim(),
      genre: genre.trim(),
      description: description.trim(),
      notes: '',
      characters: [],
      chapters: [],
      worldSettings: { era: '', geography: '', magic: '', society: '', factions: '', rules: '' },
      timelineEvents: [],
      targetWords: targetWords || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'planning',
    };
    await saveProject(novel);
    setProjects(prev => [novel, ...prev]);
    setShowCreate(false);
    setTitle(''); setGenre(''); setDescription(''); setTargetWords(0);
  };

  const remove = async (id: string) => {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📖 NovelCraft</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">AI 驱动的小说创作工作流</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGuide(!showGuide)} className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium">
            {showGuide ? '收起指南' : '📖 使用指南'}
          </button>
          <button onClick={() => setShowCreate(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            + 创建新项目
          </button>
        </div>
      </div>

      {/* Quick Create */}
      <QuickCreate onCreated={(novel) => setProjects(prev => [novel, ...prev])} />

      {/* Multi-Agent Panel */}
      <div className="mb-8">
        <MultiAgentPanel onComplete={() => {}} />
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">🚀 创作流程指南</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {GUIDE_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <span className="text-2xl">{step.icon}</span>
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">0{i + 1}</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{step.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-sm text-indigo-700 dark:text-indigo-300">
            💡 <strong>提示：</strong>每个工作流页面都内置了 AI 对话窗口，在页面底部可以找到「🤖 AI 助手」聊天框，随时与 AI 讨论。
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold dark:text-gray-100 mb-4">📝 新建小说项目</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">作品名称 *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 mt-1 text-sm dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="给你的小说起个名字..." autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">类型</label>
                <select value={genre} onChange={e => setGenre(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 mt-1 text-sm dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {GENRES.map(g => <option key={g} value={g}>{g || '选择类型'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">目标字数</label>
                <input value={targetWords || ''} onChange={e => setTargetWords(Number(e.target.value))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 mt-1 text-sm dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="如 100000" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">一句话简介</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 mt-1 text-sm dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="简短描述你的故事..." />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-5">
            <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium">取消</button>
            <button onClick={create} disabled={!title.trim()} className="px-6 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-semibold shadow-sm">创建项目</button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      {projects.length > 0 && (
        <div className="flex gap-3 mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 搜索项目..." className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-200">
            <option value="">全部类型</option>
            {GENRES.filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 && !showCreate ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📚</p>
          <p className="text-gray-500 dark:text-gray-400 mb-2">还没有小说项目</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">点击上方"📖 使用指南"了解工作流，或直接开始</p>
          <button onClick={() => setShowCreate(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm">
            + 创建第一个项目
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => <ProjectCard key={p.id} novel={p} onDelete={remove} />)}
        </div>
      )}
    </div>
  );
}
