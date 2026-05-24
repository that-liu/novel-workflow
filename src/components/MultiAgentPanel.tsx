'use client';
import { useState } from 'react';

interface AgentState {
  id: string; name: string; icon: string; status: 'waiting' | 'running' | 'done' | 'error';
  output?: string; error?: string;
}

const AGENTS = [
  { id: 'plot', name: '策划', icon: '📋', desc: '故事大纲与结构' },
  { id: 'character', name: '角色', icon: '👤', desc: '角色设计与关系' },
  { id: 'narrative', name: '叙事', icon: '✍️', desc: '章节正文写作' },
  { id: 'editor', name: '审稿', icon: '🔍', desc: '审查与润色' },
];

export default function MultiAgentPanel({ onComplete }: { onComplete: (results: Record<string, string>, idea: string) => void }) {
  const [idea, setIdea] = useState('');
  const [agents, setAgents] = useState<AgentState[]>(
    AGENTS.map(a => ({ ...a, status: 'waiting' as const }))
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const start = async () => {
    if (!idea.trim() || running) return;
    setRunning(true);
    setAgents(AGENTS.map(a => ({ ...a, status: 'waiting' })));
    setResults({});

    try {
      const resp = await fetch('/api/ai/multi-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim(), mode: 'auto' }),
      });

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const msg = JSON.parse(line.slice(6));
            if (msg.status === 'complete') {
              setResults(msg.results || {});
              onComplete(msg.results || {}, idea);
              setRunning(false);
              continue;
            }
            setAgents(prev => prev.map(a =>
              a.id === msg.agent ? { ...a, status: msg.status as AgentState['status'], output: msg.output, error: msg.error } : a
            ));
          } catch {}
        }
      }
    } catch {}
    setRunning(false);
  };

  const activeAgent = agents.find(a => a.status === 'running');
  const doneCount = agents.filter(a => a.status === 'done').length;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">🤖 多 Agent 协作写作</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">策划 → 角色 → 叙事 → 审稿，四个 AI Agent 流水线协作</p>

      {!running && doneCount === 0 && (
        <div className="flex gap-3 mb-4">
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="输入创意，4个Agent接力创作..."
            className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-20 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <div className="flex flex-col justify-end">
            <button onClick={start} disabled={!idea.trim()} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              🚀 启动协作
            </button>
          </div>
        </div>
      )}

      {/* Agent Pipeline */}
      <div className="flex items-center gap-2 mb-4">
        {agents.map((agent, i) => (
          <div key={agent.id} className="flex items-center gap-2 flex-1">
            <div className={`flex-1 rounded-xl p-3 text-center transition-all ${
              agent.status === 'running' ? 'bg-indigo-100 dark:bg-indigo-900/30 ring-2 ring-indigo-400 scale-105' :
              agent.status === 'done' ? 'bg-green-50 dark:bg-green-900/20' :
              agent.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
              'bg-gray-50 dark:bg-gray-700'
            }`}>
              <div className="text-lg">{agent.icon}</div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{agent.name}</div>
              <div className="text-[10px] text-gray-400">
                {agent.status === 'running' ? '⏳' : agent.status === 'done' ? '✅' : agent.status === 'error' ? '❌' : '·'}
              </div>
            </div>
            {i < agents.length - 1 && (
              <div className={`w-4 h-0.5 ${agents[i].status === 'done' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-600'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Status messages */}
      {activeAgent && (
        <div className="text-sm text-indigo-600 dark:text-indigo-400 text-center mb-3">
          {activeAgent.icon} {activeAgent.name} Agent 工作中...
          <span className="inline-flex gap-1 ml-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      )}

      {doneCount === 4 && (
        <div className="text-sm text-green-600 dark:text-green-400 text-center mb-3">
          🎉 四个 Agent 全部完成！
        </div>
      )}

      {/* Agent Outputs */}
      <div className="space-y-2">
        {agents.filter(a => a.output).map(agent => (
          <div key={agent.id} className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
              className="w-full flex items-center justify-between p-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span>{agent.icon} {agent.name} Agent 输出</span>
              <span className="text-xs text-gray-400">{expandedAgent === agent.id ? '收起' : '展开'}</span>
            </button>
            {expandedAgent === agent.id && (
              <div className="p-3 border-t border-gray-100 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 max-h-60 overflow-y-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-750">
                {agent.output}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
