'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Chapter, Novel } from '@/lib/types';
import { callAI } from '@/lib/ai';

const WORLD_LABELS: Record<string, string> = {
  era: '时代背景', geography: '地理环境', magic: '力量体系',
  society: '社会结构', factions: '势力派系', rules: '核心法则',
};

const AI_MODES = [
  { id: 'continue', label: '续写', desc: '接着内容继续写', color: 'indigo' },
  { id: 'improve', label: '润色', desc: '优化当前文笔', color: 'amber' },
  { id: 'dialogue', label: '对话', desc: '写一段角色对话', color: 'green' },
  { id: 'describe', label: '场景描写', desc: '描写环境氛围', color: 'teal' },
  { id: 'action', label: '动作戏', desc: '写一段打斗/追逐', color: 'red' },
  { id: 'inner', label: '内心独白', desc: '角色内心活动', color: 'purple' },
  { id: 'review', label: '审稿', desc: '分析节奏和逻辑', color: 'orange' },
] as const;

type AiModeId = (typeof AI_MODES)[number]['id'];

// Static class names for Tailwind JIT — dynamic strings like `bg-${color}-50` don't work
const BG_MAP: Record<string, string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/50',
  amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/50',
  green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/50',
  teal: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-800/50',
  red: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/50',
  purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/50',
  orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-800/50',
};

/** Build a regex that matches a slash command at the start of a line */
function slashRegex(): RegExp {
  const cmds = AI_MODES.map((m) => m.id).join('|');
  return new RegExp(`(?:^|\\n)\\/(${cmds})\\s*$`);
}

/** Escape HTML entities for safe preview rendering */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function ChapterEditor({
  chapter,
  onSave,
  novelContext,
  characters,
  worldSettings,
}: {
  chapter: Chapter;
  onSave: (c: Chapter) => void;
  novelContext: string;
  characters: Novel['characters'];
  worldSettings: Novel['worldSettings'];
}) {
  const [content, setContent] = useState(chapter.content);
  const [loading, setLoading] = useState<AiModeId | 'custom' | ''>('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [wordGoal, setWordGoal] = useState(2000);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [contextOpen, setContextOpen] = useState(false);
  const lastSavedRef = useRef(chapter.content);
  const chapterRef = useRef(chapter);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef(content);
  chapterRef.current = chapter;

  // Keep ref in sync so async aiAction always reads the latest content
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const wordCount = content.replace(/\s/g, '').length;
  const progress = Math.min(100, Math.round((wordCount / wordGoal) * 100));

  const doSave = useCallback(() => {
    const curContent = content;
    if (curContent === lastSavedRef.current) return;
    setSaveStatus('saving');
    onSave({
      ...chapterRef.current,
      content: curContent,
      wordCount: curContent.replace(/\s/g, '').length,
      updatedAt: new Date().toISOString(),
    });
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

  // ---- Selection helpers ----

  /** Return selected text range, or null if no active selection */
  const getSelectedRange = (): { text: string; start: number; end: number } | null => {
    const ta = textareaRef.current;
    if (!ta) return null;
    if (ta.selectionStart === ta.selectionEnd) return null;
    return {
      text: content.slice(ta.selectionStart, ta.selectionEnd),
      start: ta.selectionStart,
      end: ta.selectionEnd,
    };
  };

  // ---- AI action ----

  const buildSystemPrompt = (): string =>
    `你是一位出版级小说作家。小说信息：${novelContext}。当前章节《${chapter.title}》。`;

  const buildPrompts = (ctx: string): Record<string, string> => ({
    continue: `请接着下面内容继续写300-500字，保持一致的风格和语气：\n${ctx.slice(-1000)}`,
    improve: `请润色改进下面文字，使其更生动、有画面感，保持原意：\n${ctx.slice(0, 2000)}`,
    dialogue: `请根据角色设定，写一段生动的对话（200-400字）：\n上下文：${ctx.slice(-500)}`,
    describe: `请写一段环境或场景描写（200-300字），营造合适的氛围：\n上下文：${ctx.slice(-300)}`,
    action: `请写一段紧张的动作场景（200-400字）：\n上下文：${ctx.slice(-500)}`,
    inner: `请为当前场景的角色写一段内心独白（150-300字）：\n上下文：${ctx.slice(-500)}`,
    review: `请从以下角度审查当前章节：1)节奏把控 2)逻辑一致性 3)角色行为合理性 4)文笔亮点。给出具体建议：\n${ctx.slice(0, 3000)}`,
  });

  const aiAction = async (mode: string, explicitContent?: string) => {
    if (loading) return;
    setLoading(mode as AiModeId | 'custom');

    const currentContent = explicitContent ?? contentRef.current;
    const sel = getSelectedRange();
    // If the user has selected text, the AI operates on that portion; otherwise full content
    const effectiveContent = sel ? sel.text : currentContent;
    const systemPrompt = buildSystemPrompt();
    const prompts = buildPrompts(effectiveContent);
    const isGenerative = ['continue', 'dialogue', 'describe', 'action', 'inner'].includes(mode);

    try {
      const result = await callAI(
        systemPrompt,
        prompts[mode] ||
          (aiInstruction || `请帮我完善这一章节：\n${effectiveContent.slice(0, 1500)}`),
      );

      // 1) Review --> show in alert, never touch content
      if (mode === 'review') {
        alert(result);
      }

      // 2) Improve --> always append with marker, never replace
      else if (mode === 'improve') {
        const label = sel
          ? '\n\n--- AI润色版(选中部分) ---'
          : '\n\n--- AI润色版 ---';
        setContent(contentRef.current + label + '\n' + result);
      }

      // 3) Generative modes with selection --> insert result after the selection
      else if (sel && isGenerative) {
        setContent(
          currentContent.slice(0, sel.end) +
            '\n\n' +
            result +
            currentContent.slice(sel.end),
        );
      }

      // 4) Generative / custom modes without selection --> append to end
      else {
        setContent((prev) => prev + '\n\n' + result);
      }
    } catch (e) {
      alert('AI 操作失败：' + (e instanceof Error ? e.message : '未知错误'));
    }
    setLoading('');
    setAiInstruction('');
  };

  // ---- Content change handler (slash commands + normal typing) ----

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // Slash-command detection (skip when AI is busy)
    if (!loading) {
      const m = newValue.match(slashRegex());
      if (m) {
        const mode = m[1];
        const cleanValue = newValue.replace(slashRegex(), '');
        setContent(cleanValue);
        contentRef.current = cleanValue;
        aiAction(mode, cleanValue);
        return;
      }
    }

    setContent(newValue);
  };

  // ---- Preview renderer ----

  const renderPreview = (text: string) => {
    if (!text.trim()) {
      return <p className="text-gray-400 dark:text-gray-500 italic">内容为空</p>;
    }
    // Blank lines separate paragraphs; single newlines become <br>
    const blocks = text.split(/\n{2,}/);
    return blocks.map((block, i) => {
      const html = block
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br>');
      return (
        <p
          key={i}
          className="mb-3 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html || '<br>' }}
        />
      );
    });
  };

  // ---- Derived rendering values ----

  const saveDotColor =
    saveStatus === 'saved'
      ? 'bg-green-500'
      : saveStatus === 'saving'
        ? 'bg-amber-400'
        : 'bg-red-500';

  const saveDotTitle =
    saveStatus === 'saved'
      ? '已保存'
      : saveStatus === 'saving'
        ? '保存中...'
        : '未保存';

  const loadingLabel =
    AI_MODES.find((m) => m.id === loading)?.label ?? (loading === 'custom' ? '自定义' : '');

  // ---- Render ----

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      <div className="flex-1 flex flex-col">
        {/* ---- Header: title + save-dot + status badge + controls ---- */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">{chapter.title}</h3>
            {/* Colored dot — green/yellow/red for save status */}
            <span
              className={`inline-block w-3 h-3 rounded-full ${saveDotColor} transition-colors duration-300`}
              title={saveDotTitle}
            />
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                chapter.status === 'done'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : chapter.status === 'writing'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {chapter.status === 'done'
                ? '已完成'
                : chapter.status === 'writing'
                  ? '写作中'
                  : '草稿'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400 dark:text-gray-500">
              字数目标：
              <input
                type="number"
                value={wordGoal}
                onChange={(e) => setWordGoal(Number(e.target.value))}
                className="w-16 border rounded px-1 py-0.5 text-xs text-center dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              />
            </div>
            <select
              value={chapter.status}
              onChange={(e) =>
                onSave({
                  ...chapter,
                  content,
                  wordCount,
                  status: e.target.value as Chapter['status'],
                })
              }
              className="border rounded-lg px-2 py-1 text-xs dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            >
              <option value="draft">草稿</option>
              <option value="writing">写作中</option>
              <option value="done">已完成</option>
            </select>
          </div>
        </div>

        {/* ---- Progress bar ---- */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          {wordCount.toLocaleString()} / {wordGoal.toLocaleString()} 字 ({progress}%)
        </div>

        {/* ---- Tab bar ---- */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-2">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'edit'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            编辑
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'preview'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            预览
          </button>
        </div>

        {/* ---- Editor / Preview panel ---- */}
        {activeTab === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            className="flex-1 w-full border border-gray-300 dark:border-gray-600 rounded-xl p-5 text-sm leading-loose resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-serif bg-white dark:bg-gray-800 dark:text-gray-200"
            placeholder="开始创作你的故事... (Ctrl+S 保存，输入 /continue 等斜杠命令快速调用 AI)"
          />
        ) : (
          <div className="flex-1 w-full border border-gray-300 dark:border-gray-600 rounded-xl p-5 text-sm leading-loose font-serif bg-white dark:bg-gray-800 dark:text-gray-200 overflow-y-auto">
            {renderPreview(content)}
          </div>
        )}

        {/* ---- Loading indicator ---- */}
        {loading && (
          <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            {loadingLabel}处理中...
          </div>
        )}
      </div>

      {/* ---- Sidebar: AI controls ---- */}
      <div className="w-80 flex flex-col gap-3 shrink-0">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">AI 写作助手</h4>
          <div className="grid grid-cols-2 gap-1.5">
            {AI_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => aiAction(mode.id)}
                disabled={!!loading}
                className={`text-left text-xs px-2.5 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  loading === mode.id
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-300'
                    : BG_MAP[mode.color] || 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                title={mode.desc}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">自定义指令</h4>
          <textarea
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            className="w-full border rounded-lg p-2 text-xs resize-none h-20 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
            placeholder='例如："让这段对话更幽默"...'
          />
          <button
            onClick={() => aiAction('custom')}
            disabled={!!loading || !aiInstruction}
            className="mt-2 w-full bg-gray-700 dark:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-gray-800 dark:hover:bg-gray-500 disabled:opacity-50"
          >
            执行自定义指令
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm text-xs text-gray-500 dark:text-gray-400">
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">快捷键</p>
          <p>
            <kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs dark:text-gray-300">Ctrl+S</kbd> 保存
          </p>
          <p>
            <kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs dark:text-gray-300">/continue</kbd>{' '}
            <kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs dark:text-gray-300">/improve</kbd> 斜杠命令
          </p>
          <p className="mt-1 text-gray-400 dark:text-gray-500">选中文本后点 AI 按钮，只对选中部分生效</p>
        </div>

        {/* ---- Context panel ---- */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setContextOpen(!contextOpen)}
            className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span>📋 上下文</span>
            <span className={`transform transition-transform text-[10px] ${contextOpen ? 'rotate-90' : ''}`}>▶</span>
          </button>
          {contextOpen && (
            <div className="px-3 pb-3 space-y-3 text-xs max-h-64 overflow-y-auto">
              {characters.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-500 dark:text-gray-400 mb-1.5">角色 ({characters.length})</h5>
                  <div className="space-y-1.5">
                    {characters.map(c => (
                      <div key={c.id}>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
                        {c.role && <span className="text-gray-400 dark:text-gray-500"> · {c.role}</span>}
                        {c.personality && <p className="text-gray-400 dark:text-gray-500 truncate">{c.personality}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {worldSettings && Object.entries(worldSettings).some(([, v]) => v) && (
                <div>
                  <h5 className="font-semibold text-gray-500 dark:text-gray-400 mb-1.5">世界观</h5>
                  <div className="space-y-1.5">
                    {Object.entries(worldSettings).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k}>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{WORLD_LABELS[k] || k}</span>
                        <p className="text-gray-400 dark:text-gray-500 truncate">{v as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
