'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Chapter } from '@/lib/types';
import { callAI } from '@/lib/ai';

const AI_MODES = [
  { id: 'continue', label: '📝 续写', desc: '接着内容继续写', color: 'indigo' },
  { id: 'improve', label: '✨ 润色', desc: '优化当前文笔', color: 'amber' },
  { id: 'dialogue', label: '💬 对话', desc: '写一段角色对话', color: 'green' },
  { id: 'describe', label: '🌄 场景描写', desc: '描写环境氛围', color: 'teal' },
  { id: 'action', label: '⚔️ 动作戏', desc: '写一段打斗/追逐', color: 'red' },
  { id: 'inner', label: '🧠 内心独白', desc: '角色内心活动', color: 'purple' },
  { id: 'review', label: '🔍 审稿', desc: '分析节奏和逻辑', color: 'orange' },
];

const BG_MAP: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  green: 'bg-green-50 text-green-700 hover:bg-green-100',
  teal: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
  red: 'bg-red-50 text-red-700 hover:bg-red-100',
  purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
  orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
};

export default function ChapterEditor({
  chapter, onSave, novelContext,
}: {
  chapter: Chapter; onSave: (c: Chapter) => void; novelContext: string;
}) {
  const [content, setContent] = useState(chapter.content);
  const [loading, setLoading] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [wordGoal, setWordGoal] = useState(2000);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const lastSavedRef = useRef(chapter.content);
  const chapterRef = useRef(chapter);
  chapterRef.current = chapter;

  const wordCount = content.replace(/\s/g, '').length;
  const progress = Math.min(100, Math.round((wordCount / wordGoal) * 100));

  const doSave = useCallback(() => {
    const curContent = content;
    if (curContent === lastSavedRef.current) return;
    setSaveStatus('saving');
    onSave({ ...chapterRef.current, content: curContent, wordCount: curContent.replace(/\s/g, '').length, updatedAt: new Date().toISOString() } as Chapter & { updatedAt: string });
    lastSavedRef.current = curContent;
    setTimeout(() => setSaveStatus('saved'), 200);
  }, [content, onSave]);

  // Auto-save with 3-second debounce
  useEffect(() => {
    if (content === lastSavedRef.current) {
      setSaveStatus('saved');
      return;
    }
    setSaveStatus('unsaved');
    const timer = setTimeout(doSave, 3000);
    return () => clearTimeout(timer);
  }, [content, doSave]);

  // Ctrl+S manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        doSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doSave]);

  const aiAction = async (mode: string) => {
    setLoading(mode);
    const systemPrompt = `你是一位出版级小说作家。小说信息：${novelContext}。当前章节《${chapter.title}》。`;
    const prompts: Record<string, string> = {
      continue: `请接着下面内容继续写300-500字，保持一致的风格和语气：\n${content.slice(-1000)}`,
      improve: `请润色改进下面文字，使其更生动、有画面感，保持原意：\n${content.slice(0, 2000)}`,
      dialogue: `请根据角色设定，写一段生动的对话（200-400字）：\n上下文：${content.slice(-500)}`,
      describe: `请写一段环境或场景描写（200-300字），营造合适的氛围：\n上下文：${content.slice(-300)}`,
      action: `请写一段紧张的动作场景（200-400字）：\n上下文：${content.slice(-500)}`,
      inner: `请为当前场景的角色写一段内心独白（150-300字）：\n上下文：${content.slice(-500)}`,
      review: `请从以下角度审查当前章节：1)节奏把控 2)逻辑一致性 3)角色行为合理性 4)文笔亮点。给出具体建议：\n${content.slice(0, 3000)}`,
    };

    try {
      const result = await callAI(systemPrompt, prompts[mode] || (aiInstruction || `请帮我完善这一章节：\n${content.slice(0, 1500)}`));
      if (['continue', 'dialogue', 'describe', 'action', 'inner'].includes(mode)) {
        setContent(prev => prev + '\n\n' + result);
      } else if (mode === 'improve') {
        setContent(result);
      } else {
        setContent(prev => prev + '\n\n---\n🔍 AI审稿建议：\n' + result);
      }
    } catch (e) {
      alert('AI 操作失败：' + (e instanceof Error ? e.message : '未知错误'));
    }
    setLoading('');
    setAiInstruction('');
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800 text-lg">{chapter.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${chapter.status === 'done' ? 'bg-green-100 text-green-700' : chapter.status === 'writing' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
              {chapter.status === 'done' ? '✅ 已完成' : chapter.status === 'writing' ? '✍️ 写作中' : '📝 草稿'}
            </span>
            <span className={`text-xs ml-2 ${saveStatus === 'saved' ? 'text-green-500' : saveStatus === 'saving' ? 'text-amber-500' : 'text-red-500'}`}>
              {saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中...' : '未保存'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400">
              字数目标：<input type="number" value={wordGoal} onChange={e => setWordGoal(Number(e.target.value))} className="w-16 border rounded px-1 py-0.5 text-xs text-center" />
            </div>
            <select
              value={chapter.status}
              onChange={e => onSave({ ...chapter, content, wordCount, status: e.target.value as Chapter['status'] })}
              className="border rounded-lg px-2 py-1 text-xs"
            >
              <option value="draft">📝 草稿</option>
              <option value="writing">✍️ 写作中</option>
              <option value="done">✅ 已完成</option>
            </select>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs text-gray-400 mb-3">{wordCount.toLocaleString()} / {wordGoal.toLocaleString()} 字 ({progress}%)</div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="flex-1 w-full border border-gray-300 rounded-xl p-5 text-sm leading-loose resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-serif bg-white"
          placeholder="开始创作你的故事... (Ctrl+S 保存)"
        />
      </div>

      <div className="w-80 flex flex-col gap-3 shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">🤖 AI 写作助手</h4>
          <div className="grid grid-cols-2 gap-1.5">
            {AI_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => aiAction(mode.id)}
                disabled={!!loading}
                className={`text-left text-xs px-2.5 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  loading === mode.id
                    ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300'
                    : BG_MAP[mode.color] || 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
                style={{
                  backgroundColor: loading === mode.id ? '#e0e7ff' : undefined,
                }}
                title={mode.desc}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">自定义指令</h4>
          <textarea
            value={aiInstruction}
            onChange={e => setAiInstruction(e.target.value)}
            className="w-full border rounded-lg p-2 text-xs resize-none h-20"
            placeholder="告诉 AI 具体想怎么改..."
          />
          <button
            onClick={() => aiAction('custom')}
            disabled={!!loading || !aiInstruction}
            className="mt-2 w-full bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50"
          >
            执行自定义指令
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">💡 快捷键</p>
          <p><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Ctrl+S</kbd> 保存</p>
          <p><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Ctrl+Enter</kbd> 发送指令</p>
        </div>
      </div>
    </div>
  );
}
