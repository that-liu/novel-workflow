'use client';
import { useState, useEffect } from 'react';
import { Novel } from '@/lib/types';
import { listProjects, saveProject, deleteProject } from '@/lib/storage';
import ProjectCard from '@/components/ProjectCard';

export default function Dashboard() {
  const [projects, setProjects] = useState<Novel[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProject(novel);
    setProjects(prev => [novel, ...prev]);
    setShowCreate(false);
    setTitle(''); setGenre(''); setDescription('');
  };

  const remove = async (id: string) => {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的小说项目</h1>
          <p className="text-gray-500 text-sm mt-1">用 AI 辅助创作你的故事</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
          + 创建新项目
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">新建小说项目</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-500">作品名称 *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" placeholder="给你的小说起个名字" />
            </div>
            <div>
              <label className="text-sm text-gray-500">类型</label>
              <select value={genre} onChange={e => setGenre(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm">
                <option value="">选择类型</option>
                <option>玄幻</option><option>言情</option><option>悬疑</option><option>科幻</option><option>武侠</option><option>都市</option><option>历史</option><option>奇幻</option><option>恐怖</option><option>轻小说</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm text-gray-500">一句话简介</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" placeholder="简短描述你的故事..." />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">取消</button>
            <button onClick={create} disabled={!title.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">创建</button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">📚</p>
          <p>还没有小说项目，点击上方按钮开始创作</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => <ProjectCard key={p.id} novel={p} onDelete={remove} />)}
        </div>
      )}
    </div>
  );
}
