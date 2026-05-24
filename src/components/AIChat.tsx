'use client';
import { useState, useRef, useEffect } from 'react';
import { callAI, callAIChat, ChatMessage } from '@/lib/ai';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface Props {
  systemPrompt: string;
  placeholder?: string;
  initialContext?: string;
  title?: string;
}

export default function AIChat({ systemPrompt, placeholder, initialContext, title }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const chatHistory: ChatMessage[] = newMessages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }));
      // Add initial context as first user message if present
      if (initialContext && messages.length === 0) {
        chatHistory.unshift({ role: 'user', content: initialContext });
      }
      const reply = await callAIChat(systemPrompt, chatHistory);
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'AI 请求失败，请重试。' }]);
    }
    setLoading(false);
  };

  const clearHistory = () => setMessages([]);

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-xl bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{title || '🤖 AI 助手'}</span>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500">清空对话</button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px] max-h-[600px]">
        {messages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center mt-16">{placeholder || '输入你的想法，AI 帮你完善...'}</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm ${
                m.role === 'ai'
                  ? 'bg-indigo-50 text-gray-800 rounded-tl-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tr-sm'
              }`}>
                <div className="text-xs text-gray-400 mb-1">{m.role === 'ai' ? '🤖 AI' : '👤 你'}</div>
                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-indigo-50 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-gray-200 p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={placeholder || '输入内容...'}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button onClick={send} disabled={loading} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          发送
        </button>
      </div>
    </div>
  );
}
