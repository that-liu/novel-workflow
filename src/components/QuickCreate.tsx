'use client';
import { useState } from 'react';
import { Novel } from '@/lib/types';
import { saveProject } from '@/lib/storage';
import AutoWrite from '@/components/AutoWrite';

const PHASES = [
  { key: 'meta', label: '生成作品信息', icon: '📖' },
  { key: 'world', label: '构建世界观', icon: '🌌' },
  { key: 'characters', label: '创建角色', icon: '👤' },
  { key: 'outline', label: '生成大纲', icon: '📋' },
];

export default function QuickCreate({ onCreated }: { onCreated: (novel: Novel) => void }) {
  const [idea, setIdea] = useState('');
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('');
  const [donePhases, setDonePhases] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Partial<Novel>>({});

  const startGeneration = async () => {
    if (!idea.trim() || running) return;
    setRunning(true);
    setError('');
    setDonePhases(new Set());
    setPreview({});

    try {
      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim() }),
      });
      if (!resp.ok) throw new Error('API error');

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const collected: Record<string, unknown> = {};

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const msg = JSON.parse(line.slice(6));
              if (msg.phase === 'error') { setError(msg.error); setRunning(false); return; }
              if (msg.phase === 'complete') { setRunning(false); continue; }
              setPhase(msg.phase);
              if (msg.status === 'done') {
                setDonePhases(prev => new Set(prev).add(msg.phase));
                collected[msg.phase] = msg.data;
                setPreview(prev => {
                  const updated = { ...prev };
                  if (msg.phase === 'meta') Object.assign(updated, msg.data);
                  if (msg.phase === 'world') updated.notes = Object.entries(msg.data as Record<string, string>).map(([k, v]) => `【${k}】${v}`).join('\n');
                  if (msg.phase === 'characters') updated.characters = msg.data as Novel['characters'];
                  if (msg.phase === 'outline') updated.chapters = msg.data as Novel['chapters'];
                  return updated;
                });
              }
            } catch { /* skip partial JSON */ }
          }
        }
      }
      setRunning(false);
    } catch (e) {
      setError((e as Error).message);
      setRunning(false);
    }
  };

  const finishAndSave = async () => {
    const novel: Novel = {
      id: Date.now().toString(),
      title: preview.title || idea.slice(0, 20),
      genre: preview.genre || '',
      description: preview.description || idea,
      notes: preview.notes || '',
      characters: preview.characters || [],
      chapters: preview.chapters || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProject(novel);
    onCreated(novel);
    // Reset
    setIdea('');
    setDonePhases(new Set());
    setPreview({});
  };

  const allDone = donePhases.size === PHASES.length;

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-200 rounded-2xl p-6 mb-8 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-2">🚀 一句话成书</h2>
      <p className="text-sm text-gray-500 mb-4">输入你的故事创意，AI 自动生成完整小说项目</p>

      {!running && !allDone && (
        <div className="flex gap-3">
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startGeneration(); } }}
            placeholder="例如：一个废柴少年在末日觉醒异能，带领幸存者重建文明的故事"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <div className="flex flex-col justify-end gap-2">
            <button
              onClick={startGeneration}
              disabled={!idea.trim() || running}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-sm whitespace-nowrap"
            >
              ✨ 一键生成
            </button>
            <p className="text-[10px] text-gray-400 text-center">Enter 发送</p>
          </div>
        </div>
      )}

      {(running || allDone) && (
        <div className="space-y-4">
          {/* Progress steps */}
          <div className="flex gap-2">
            {PHASES.map(p => (
              <div key={p.key} className={`flex-1 rounded-xl p-3 text-center transition-all ${
                phase === p.key ? 'bg-indigo-100 ring-2 ring-indigo-400' :
                donePhases.has(p.key) ? 'bg-green-50' : 'bg-gray-100'
              }`}>
                <div className="text-lg">{p.icon}</div>
                <div className="text-xs font-medium mt-1 text-gray-700">{p.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {phase === p.key ? '⏳ 生成中...' : donePhases.has(p.key) ? '✅ 完成' : '等待中'}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{error}</div>
          )}

          {/* Preview */}
          {allDone && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
              <h3 className="font-bold text-lg">{preview.title || '未命名'} {preview.genre && <span className="text-sm font-normal bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{preview.genre}</span>}</h3>
              {preview.description && <p className="text-sm text-gray-600">{preview.description}</p>}
              {preview.characters && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">角色 ({preview.characters.length})</p>
                  <div className="flex gap-2 flex-wrap">
                    {preview.characters.map((c, i) => (
                      <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-full">{c.name} · {c.role}</span>
                    ))}
                  </div>
                </div>
              )}
              {preview.chapters && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">章节 ({preview.chapters.length})</p>
                  <div className="grid grid-cols-2 gap-1">
                    {preview.chapters.slice(0, 6).map((ch, i) => (
                      <div key={i} className="text-xs text-gray-600">第{i + 1}章 {ch.title}</div>
                    ))}
                    {preview.chapters.length > 6 && <div className="text-xs text-gray-400">...还有 {preview.chapters.length - 6} 章</div>}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={finishAndSave} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm">
                  ✅ 保存项目，去大纲页自动写作
                </button>
                <button onClick={() => { setIdea(''); setDonePhases(new Set()); setPreview({}); }} className="text-sm text-gray-500 px-4 hover:text-gray-700">
                  放弃重来
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1 text-center">保存后去「情节大纲」页，点击 🤖 自动写作即可一键写完所有章节</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
