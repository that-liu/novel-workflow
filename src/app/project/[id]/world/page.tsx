'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Novel } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import AIChat from '@/components/AIChat';
import Link from 'next/link';

interface WorldSetting {
  era: string;
  geography: string;
  magic: string;
  society: string;
  factions: string;
  rules: string;
}

export default function WorldPage() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [settings, setSettings] = useState<WorldSetting>(() => {
    try {
      return JSON.parse(localStorage.getItem(`world_${id}`) || '{}');
    } catch { return {}; }
  });

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  const update = (key: keyof WorldSetting, value: string) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem(`world_${id}`, JSON.stringify(updated));
    if (novel) {
      const worldSummary = Object.entries(updated).filter(([, v]) => v).map(([k, v]) => `【${k}】${v}`).join('\n');
      saveProject({ ...novel, notes: novel.notes ? novel.notes + '\n\n---\n世界观设定：\n' + worldSummary : '世界观设定：\n' + worldSummary, updatedAt: new Date().toISOString() });
    }
  };

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const fields: { key: keyof WorldSetting; label: string; placeholder: string; icon: string }[] = [
    { key: 'era', label: '时代背景', placeholder: '什么时代？古代/现代/未来？科技水平如何？', icon: '🏛️' },
    { key: 'geography', label: '地理环境', placeholder: '故事发生在哪里？城市/乡村/异世界？有什么特色地貌？', icon: '🌍' },
    { key: 'magic', label: '力量体系', placeholder: '魔法/超能力/科技？规则是什么？怎么修炼/升级？', icon: '⚡' },
    { key: 'society', label: '社会结构', placeholder: '政治体制？阶级分化？文化风俗？经济体系？', icon: '🏰' },
    { key: 'factions', label: '势力派系', placeholder: '有哪些组织/门派/国家？各自的目标和关系？', icon: '⚔️' },
    { key: 'rules', label: '核心法则', placeholder: '这个世界有什么独特的规则或禁忌？', icon: '📜' },
  ];

  const worldPrompt = `用户正在创作小说《${novel.title}》${novel.genre ? `（${novel.genre}）` : ''}。${Object.entries(settings).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('。')}。请帮助用户完善世界观设定，每次探讨一个方面。`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回项目</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">🌌 世界观设定</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {fields.map(f => (
          <div key={f.key} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <span>{f.icon}</span> {f.label}
            </label>
            <textarea
              value={settings[f.key] || ''}
              onChange={e => update(f.key, e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={f.placeholder}
            />
          </div>
        ))}
      </div>

      <AIChat systemPrompt={worldPrompt} title="🤖 世界观助手" placeholder="帮我完善世界观设定..." />
    </div>
  );
}
