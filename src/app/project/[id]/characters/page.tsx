'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Novel, Character } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import CharacterForm from '@/components/CharacterForm';
import Link from 'next/link';

export default function CharactersPage() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Character | undefined>();

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const save = (char: Character) => {
    const updated = { ...novel };
    const idx = updated.characters.findIndex(c => c.id === char.id);
    if (idx >= 0) updated.characters[idx] = char;
    else updated.characters.push(char);
    updated.updatedAt = new Date().toISOString();
    setNovel(updated);
    saveProject(updated);
    setShowForm(false);
    setEditing(undefined);
  };

  const remove = (charId: string) => {
    const char = novel.characters.find(c => c.id === charId);
    if (!window.confirm(`确定要删除角色「${char?.name || charId}」吗？此操作不可撤销。`)) return;
    const updated = { ...novel, characters: novel.characters.filter(c => c.id !== charId) };
    setNovel(updated);
    saveProject(updated);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回项目</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👤 角色设计</h1>
          <p className="text-gray-500 text-sm">创建和管理你的故事角色</p>
        </div>
        <button onClick={() => { setEditing(undefined); setShowForm(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700">
          + 添加角色
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <CharacterForm initial={editing} onSave={save} onCancel={() => { setShowForm(false); setEditing(undefined); }} />
        </div>
      )}

      {novel.characters.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">🎭</p>
          <p>还没有角色，点击上方按钮创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {novel.characters.map(char => (
            <div key={char.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{char.name}</h3>
                  {char.role && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{char.role}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(char); setShowForm(true); }} className="text-xs text-gray-400 hover:text-indigo-600">编辑</button>
                  <button onClick={() => remove(char.id)} className="text-xs text-gray-400 hover:text-red-500 ml-1">删除</button>
                </div>
              </div>
              {char.personality && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{char.personality}</p>}
              {char.motivation && <p className="text-xs text-gray-400 mt-1">动机：{char.motivation.slice(0, 60)}{char.motivation.length > 60 && '...'}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
