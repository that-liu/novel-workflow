'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Novel, WorldSetting } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import AIChat from '@/components/AIChat';
import Link from 'next/link';

const FIELD_DEFS: { key: keyof WorldSetting; label: string; placeholder: string; icon: string }[] = [
  { key: 'era', label: '时代背景', placeholder: '古代/现代/未来？科技水平？关键历史事件？', icon: '🏛️' },
  { key: 'geography', label: '地理环境', placeholder: '城市/乡村/异世界？气候、地貌、交通方式？', icon: '🌍' },
  { key: 'magic', label: '力量体系', placeholder: '魔法/超能力/科技？规则和限制？怎么修炼/获取？', icon: '⚡' },
  { key: 'society', label: '社会结构', placeholder: '政治体制？阶级划分？文化风俗？经济体系？', icon: '🏰' },
  { key: 'factions', label: '势力派系', placeholder: '组织/门派/国家？各自的目标和关系？', icon: '⚔️' },
  { key: 'rules', label: '核心法则', placeholder: '这个世界的独特规则、禁忌或自然法则？', icon: '📜' },
];

export default function WorldPage() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [settings, setSettings] = useState<WorldSetting>({} as WorldSetting);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const lastSavedRef = useRef('');
  const novelRef = useRef(novel);
  novelRef.current = novel;

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  useEffect(() => {
    if (novel?.worldSettings) {
      setSettings(novel.worldSettings);
    }
  }, [novel]);

  const update = (key: keyof WorldSetting, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const serialized = useCallback(() => JSON.stringify(settings), [settings]);

  const doSave = useCallback(() => {
    const cur = novelRef.current;
    if (!cur) return;
    const s = serialized();
    if (s === lastSavedRef.current) return;
    setSaveStatus('saving');
    const updated = { ...cur, worldSettings: JSON.parse(s) as WorldSetting, updatedAt: new Date().toISOString() };
    setNovel(updated);
    saveProject(updated);
    lastSavedRef.current = s;
    setTimeout(() => setSaveStatus('saved'), 200);
  }, [serialized]);

  // Auto-save with 3-second debounce
  useEffect(() => {
    const s = serialized();
    if (s === lastSavedRef.current) {
      setSaveStatus('saved');
      return;
    }
    setSaveStatus('unsaved');
    const timer = setTimeout(doSave, 3000);
    return () => clearTimeout(timer);
  }, [serialized, doSave]);

  const saveAll = () => {
    doSave();
  };

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const filledCount = Object.values(settings).filter(v => v.trim()).length;
  const worldPrompt = `用户正在创作《${novel.title}》${novel.genre ? `（${novel.genre}）` : ''}。已有设定：${Object.entries(settings).filter(([,v]) => v).map(([k,v]) => `${FIELD_DEFS.find(f => f.key === k)?.label}: ${v}`).join('；') || '暂无'}。请帮助完善世界观设定。`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回项目</Link>
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌌 世界观设定</h1>
          <p className="text-gray-500 text-sm mt-1">构建你的故事世界。完成 {filledCount}/{FIELD_DEFS.length} 项</p>
        </div>
        <button onClick={saveAll} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700 shadow-sm">
          💾 保存全部
          {saveStatus === 'saving' && <span className="ml-1 text-indigo-200">...</span>}
          {saveStatus === 'unsaved' && <span className="ml-1 text-amber-200">●</span>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELD_DEFS.map(f => (
            <div key={f.key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                <span>{f.icon}</span> {f.label}
                {settings[f.key]?.trim() && <span className="text-green-500 text-xs ml-auto">✓</span>}
              </label>
              <textarea
                value={settings[f.key] || ''}
                onChange={e => update(f.key, e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>

        <div className="h-[550px]">
          <AIChat systemPrompt={worldPrompt} title="🤖 世界观助手" placeholder="讨论你的世界观设定..." memoryKey={id as string} />
        </div>
      </div>
    </div>
  );
}
