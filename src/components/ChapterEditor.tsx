'use client';
import { useState } from 'react';
import { Chapter } from '@/lib/types';
import { callAI } from '@/lib/ai';

export default function ChapterEditor({
  chapter,
  onSave,
  novelContext,
}: {
  chapter: Chapter;
  onSave: (c: Chapter) => void;
  novelContext: string;
}) {
  const [content, setContent] = useState(chapter.content);
  const [loading, setLoading] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');

  const wordCount = content.replace(/\s/g, '').length;

  const save = () => {
    onSave({ ...chapter, content, wordCount, updatedAt: new Date().toISOString() } as Chapter & { updatedAt: string });
  };

  const aiAction = async (action: string) => {
    setLoading(true);
    const systemPrompt = `你是一位专业小说作家。以下是小说背景：${novelContext}。当前章节：${chapter.title}。`;
    let userPrompt = '';
    switch (action) {
      case 'continue':
        userPrompt = `请接着下面这段内容继续写，保持一致的风格和语气，写300-500字：\n${content.slice(-1000)}`;
        break;
      case 'improve':
        userPrompt = `请改进下面这段文字，使其更加生动、有画面感，保持原意不变：\n${content.slice(0, 2000)}`;
        break;
      case 'suggest':
        userPrompt = `针对这一章节内容，请给出3条具体的改进建议：\n${content.slice(0, 2000)}`;
        break;
      default:
        userPrompt = aiInstruction || `请帮我完善这一章节：\n${content.slice(0, 1500)}`;
    }
    try {
      const result = await callAI(systemPrompt, userPrompt);
      if (action === 'continue') {
        setContent(prev => prev + '\n\n' + result);
      } else if (action === 'improve') {
        setContent(result);
      } else {
        setContent(prev => prev + '\n\n---\nAI建议：\n' + result);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
    setAiInstruction('');
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Editor */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800">{chapter.title}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{wordCount.toLocaleString()} 字</span>
            <select
              value={chapter.status}
              onChange={e => onSave({ ...chapter, content, wordCount, status: e.target.value as Chapter['status'] })}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="draft">草稿</option>
              <option value="writing">写作中</option>
              <option value="done">已完成</option>
            </select>
            <button onClick={save} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700">保存</button>
          </div>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="flex-1 w-full border border-gray-300 rounded-xl p-4 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-serif"
          placeholder="开始创作你的故事..."
        />
      </div>

      {/* AI Assistant */}
      <div className="w-80 flex flex-col gap-2">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">🤖 AI 写作助手</h4>
          <div className="flex flex-col gap-2">
            <button onClick={() => aiAction('continue')} disabled={loading} className="text-left text-sm px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50">
              继续写下一段
            </button>
            <button onClick={() => aiAction('improve')} disabled={loading} className="text-left text-sm px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50">
              润色当前内容
            </button>
            <button onClick={() => aiAction('suggest')} disabled={loading} className="text-left text-sm px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50">
              给出修改建议
            </button>
            {loading && <div className="text-xs text-indigo-500 text-center">AI 写作中...</div>}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1 flex flex-col">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">自定义指令</h4>
          <textarea
            value={aiInstruction}
            onChange={e => setAiInstruction(e.target.value)}
            className="flex-1 border rounded-lg p-2 text-xs resize-none"
            placeholder="告诉 AI 你想怎么改..."
          />
          <button
            onClick={() => aiAction('custom')}
            disabled={loading || !aiInstruction}
            className="mt-2 bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50"
          >
            执行
          </button>
        </div>
      </div>
    </div>
  );
}
