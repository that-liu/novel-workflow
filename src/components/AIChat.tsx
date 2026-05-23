'use client';
import { useState } from 'react';
import { callAI } from '@/lib/ai';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export default function AIChat({ systemPrompt, placeholder }: { systemPrompt: string; placeholder?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const reply = await callAI(systemPrompt, userMsg);
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'AI 请求失败，请重试。' }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-xl bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]">
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-8">{placeholder || '输入你的想法，AI 帮你完善...'}</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-lg text-sm ${m.role === 'ai' ? 'bg-indigo-50 text-gray-800' : 'bg-gray-100 text-gray-800 ml-8'}`}>
            <div className="text-xs text-gray-400 mb-1">{m.role === 'ai' ? '🤖 AI' : '👤 你'}</div>
            <div className="whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
        {loading && <div className="text-indigo-500 text-sm">AI 正在思考...</div>}
      </div>
      <div className="border-t border-gray-200 p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={placeholder || '输入内容...'}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button onClick={send} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
          发送
        </button>
      </div>
    </div>
  );
}
