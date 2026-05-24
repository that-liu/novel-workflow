'use client';
import { useState, useRef } from 'react';
import { Novel, Chapter } from '@/lib/types';
import { saveProject } from '@/lib/storage';

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
  const [cancelled, setCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startGeneration = async () => {
    if (!idea.trim() || running) return;
    setRunning(true);
    setCancelled(false);
    setError('');
    setDonePhases(new Set());
    setPreview({});

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim() }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      if (!resp.ok) throw new Error('API error');

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        if (controller.signal.aborted) return;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const msg = JSON.parse(line.slice(6));
              if (msg.phase === 'error') { setError(msg.error); setRunning(false); setCancelled(false); return; }
              if (msg.phase === 'complete') { setRunning(false); continue; }
              setPhase(msg.phase);
              if (msg.status === 'done') {
                setDonePhases(prev => new Set(prev).add(msg.phase));
                setPreview(prev => {
                  const updated = { ...prev };
                  if (msg.phase === 'meta') Object.assign(updated, msg.data);
                  if (msg.phase === 'world') {
                    updated.notes = Object.entries(msg.data as Record<string, string>).map(([k, v]) => `【${k}】${v}`).join('\n');
                    updated.worldSettings = msg.data as Novel['worldSettings'];
                  }
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
      if (controller.signal.aborted) return;
      setError((e as Error).message);
      setRunning(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setCancelled(true);
    setRunning(false);
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
      worldSettings: preview.worldSettings || {} as Novel['worldSettings'],
      timelineEvents: preview.timelineEvents || [],
      targetWords: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProject(novel);
    onCreated(novel);
    // Reset
    setIdea('');
    setDonePhases(new Set());
    setPreview({});
    setCancelled(false);
  };

  const resetAll = () => {
    setIdea('');
    setDonePhases(new Set());
    setPreview({});
    setCancelled(false);
    setError('');
  };

  const hasPartialData = donePhases.size > 0 || cancelled;
  const allDone = donePhases.size === PHASES.length;
  const showProgressOrPreview = running || allDone || cancelled || (hasPartialData && !allDone);

  // Editable preview helpers
  const updateTitle = (title: string) => setPreview(prev => ({ ...prev, title }));
  const updateGenre = (genre: string) => setPreview(prev => ({ ...prev, genre }));
  const updateDescription = (description: string) => setPreview(prev => ({ ...prev, description }));

  const updateCharName = (index: number, name: string) => {
    setPreview(prev => {
      const chars = [...(prev.characters || [])];
      if (chars[index]) chars[index] = { ...chars[index], name };
      return { ...prev, characters: chars };
    });
  };

  const updateCharRole = (index: number, role: string) => {
    setPreview(prev => {
      const chars = [...(prev.characters || [])];
      if (chars[index]) chars[index] = { ...chars[index], role };
      return { ...prev, characters: chars };
    });
  };

  const updateChapterTitle = (index: number, title: string) => {
    setPreview(prev => {
      const chapters = [...(prev.chapters || [])];
      if (chapters[index]) chapters[index] = { ...chapters[index], title };
      return { ...prev, chapters };
    });
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/30 dark:via-gray-800 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 mb-8 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">🚀 一句话成书</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">输入你的故事创意，AI 自动生成完整小说项目</p>

      {!showProgressOrPreview && (
        <div className="flex gap-3">
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startGeneration(); } }}
            placeholder="例如：一个废柴少年在末日觉醒异能，带领幸存者重建文明的故事"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
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
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">Enter 发送</p>
          </div>
        </div>
      )}

      {showProgressOrPreview && (
        <div className="space-y-4">
          {/* Progress steps */}
          <div className="flex gap-2">
            {PHASES.map(p => (
              <div key={p.key} className={`flex-1 rounded-xl p-3 text-center transition-all ${
                phase === p.key ? 'bg-indigo-100 dark:bg-indigo-900/30 ring-2 ring-indigo-400' :
                donePhases.has(p.key) ? 'bg-green-50 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <div className="text-lg">{p.icon}</div>
                <div className="text-xs font-medium mt-1 text-gray-700 dark:text-gray-300">{p.label}</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {phase === p.key ? '⏳ 生成中...' : donePhases.has(p.key) ? '✅ 完成' : cancelled ? '⏹️ 已取消' : '等待中'}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-xl text-sm">{error}</div>
          )}

          {/* Cancel button during generation */}
          {running && (
            <button
              onClick={handleCancel}
              className="w-full bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 shadow-sm transition-colors"
            >
              ⏹ 取消生成
            </button>
          )}

          {/* Preview with editable fields */}
          {(allDone || cancelled || hasPartialData) && !running && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 shadow-sm">
              {/* Title + Genre — editable */}
              <div className="flex items-center gap-3">
                <input
                  value={preview.title || ''}
                  onChange={e => updateTitle(e.target.value)}
                  className="font-bold text-lg border-b border-gray-200 dark:border-gray-600 focus:border-indigo-500 focus:outline-none px-1 py-0.5 flex-1 dark:bg-transparent dark:text-gray-100"
                  placeholder="作品名称"
                />
                <select
                  value={preview.genre || ''}
                  onChange={e => updateGenre(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  <option value="">选择类型</option>
                  <option>玄幻</option><option>言情</option><option>悬疑</option><option>科幻</option>
                  <option>武侠</option><option>都市</option><option>历史</option><option>奇幻</option>
                  <option>恐怖</option><option>轻小说</option>
                </select>
              </div>

              {/* Description — editable */}
              <textarea
                value={preview.description || ''}
                onChange={e => updateDescription(e.target.value)}
                className="w-full text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg p-2 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
                placeholder="作品简介..."
              />

              {/* Characters — editable names and roles */}
              {preview.characters && preview.characters.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">角色 ({preview.characters.length})</p>
                  <div className="flex gap-2 flex-wrap">
                    {preview.characters.map((c, i) => (
                      <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full inline-flex items-center gap-1">
                        <input
                          value={c.name}
                          onChange={e => updateCharName(i, e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-16 text-center dark:text-gray-200"
                        />
                        <span className="text-gray-400">·</span>
                        <input
                          value={c.role}
                          onChange={e => updateCharRole(i, e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-12 text-center dark:text-gray-200"
                        />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapters — editable titles */}
              {preview.chapters && preview.chapters.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">章节 ({preview.chapters.length})</p>
                  <div className="grid grid-cols-2 gap-1">
                    {preview.chapters.slice(0, 6).map((ch, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <span className="shrink-0">第{i + 1}章</span>
                        <input
                          value={ch.title}
                          onChange={e => updateChapterTitle(i, e.target.value)}
                          className="border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none flex-1 min-w-0 dark:bg-transparent dark:text-gray-200"
                        />
                      </div>
                    ))}
                    {preview.chapters.length > 6 && <div className="text-xs text-gray-400 dark:text-gray-500">...还有 {preview.chapters.length - 6} 章</div>}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button onClick={finishAndSave} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm">
                  ✅ 保存项目，去大纲页自动写作
                </button>
                <button onClick={resetAll} className="text-sm text-gray-500 dark:text-gray-400 px-4 hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap">
                  {cancelled ? '放弃' : '放弃重来'}
                </button>
              </div>

              {cancelled && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center">已保留已完成的阶段数据，你可以编辑后保存，或放弃重新生成</p>
              )}
              {!cancelled && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">保存后去「情节大纲」页，点击 🤖 自动写作即可一键写完所有章节</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
