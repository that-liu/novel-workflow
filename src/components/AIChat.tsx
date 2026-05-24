'use client';
import { useState, useRef, useEffect } from 'react';
import { callAI, streamAIChat, ChatMessage, AI_MODELS } from '@/lib/ai';

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
  const [streaming, setStreaming] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(AI_MODELS[0].id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streaming]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    const chatHistory: ChatMessage[] = newMessages.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    }));
    if (initialContext && messages.length === 0) {
      chatHistory.unshift({ role: 'user', content: initialContext });
    }

    // Use streaming for multi-turn chat
    setStreaming('');
    abortRef.current = streamAIChat(
      systemPrompt,
      chatHistory,
      (chunk) => setStreaming(prev => (prev || '') + chunk),
      () => {
        setStreaming(prev => {
          const finalText = prev || '';
          setMessages(msgs => [...msgs, { role: 'ai', text: finalText }]);
          return null;
        });
        setLoading(false);
      },
      (err) => {
        setStreaming(prev => {
          if (prev) setMessages(msgs => [...msgs, { role: 'ai', text: prev + '\n\n[流中断]' }]);
          return null;
        });
        setLoading(false);
      },
      model
    );
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setStreaming(prev => {
      if (prev) setMessages(msgs => [...msgs, { role: 'ai', text: prev }]);
      return null;
    });
    setLoading(false);
  };

  const clearHistory = () => setMessages([]);

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-xl bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{title || '🤖 AI 助手'}</span>
        <div className="flex items-center gap-2">
          <select value={model} onChange={e => setModel(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-600">
            {AI_MODELS.map(m => (
              <option key={m.id} value={m.id} title={m.desc}>{m.label}</option>
            ))}
          </select>
          {messages.length > 0 && (
            <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500">清空</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px] max-h-[600px]">
        {messages.length === 0 && !streaming && (
          <p className="text-gray-400 text-sm text-center mt-16">{placeholder || '输入你的想法，AI 帮你完善...'}</p>
        )}
        {messages.map((m, i) => (
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
        ))}
        {streaming !== null && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-3.5 rounded-2xl rounded-tl-sm bg-indigo-50 text-gray-800 text-sm">
              <div className="text-xs text-gray-400 mb-1">🤖 AI 正在输出...</div>
              <div className="whitespace-pre-wrap leading-relaxed">
                {streaming}
                <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-0.5 animate-pulse align-text-bottom" />
              </div>
            </div>
          </div>
        )}
        {loading && streaming === null && (
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
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              loading ? stopStreaming() : send();
            }
          }}
          placeholder={loading ? 'AI 正在回复中...' : (placeholder || '输入内容...')}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          disabled={loading && streaming === null}
        />
        {streaming !== null ? (
          <button onClick={stopStreaming} className="bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">
            停止
          </button>
        ) : (
          <button onClick={send} disabled={loading} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            发送
          </button>
        )}
      </div>
    </div>
  );
}
