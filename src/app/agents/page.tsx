'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AgentInfo {
  id: string; name: string; role: string; icon: string;
  status: 'running' | 'completed' | 'pending' | 'failed';
  task: string; model: string; outputSize: number; completedAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  running: '⚡ 运行中', completed: '✅ 已完成', failed: '⏸️ 中断', pending: '⏳ 等待',
};

export default function AgentDashboard() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, boolean>>({});
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/agents/status')
        .then(r => r.json())
        .then(data => {
          setAgents(data.agents);
          setPipeline(data.pipeline);
          const running = data.agents.filter((a: AgentInfo) => a.status === 'running').length;
          if (running > 0) {
            setLogs(prev => {
              const last = prev[prev.length - 1];
              const entry = `[${new Date().toLocaleTimeString()}] 🔄 ${running} agent(s) active · pipeline: ${Object.values(data.pipeline).filter(Boolean).length}/4 done`;
              if (entry !== last) return [...prev.slice(-49), entry];
              return prev;
            });
          }
        });
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 5000);
    const elapsedTimer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => { clearInterval(timer); clearInterval(elapsedTimer); };
  }, []);

  const completed = agents.filter(a => a.status === 'completed').length;
  const running = agents.filter(a => a.status === 'running').length;
  const pipelineSteps = ['📋 PM', '✍️ User', '🔍 QA', '⚙️ Dev', '✅ Done'];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤖 Agent 工作台</h1>
          <p className="text-gray-500 text-sm mt-1">实时监控 · 多Agent协同 · 5秒自动刷新</p>
        </div>
        <div className="flex gap-4 text-sm">
          <StatBox value={running} label="运行中" color="text-green-600" />
          <StatBox value={completed} label="已完成" color="text-indigo-600" />
          <StatBox value={`${Math.floor(elapsed/60)}:${(elapsed%60).toString().padStart(2,'0')}`} label="运行时长" color="text-gray-600" />
        </div>
      </div>

      {/* Pipeline */}
      <div className="flex items-center gap-2 mb-8 p-4 bg-white border border-gray-200 rounded-2xl">
        {pipelineSteps.map((step, i) => {
          const key = ['pm','user','qa','dev','done'][i];
          const done = key === 'done' ? completed === 4 : pipeline[key as keyof typeof pipeline];
          return (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                done ? 'bg-green-100 text-green-700' :
                i === Object.values(pipeline).filter(Boolean).length ? 'bg-indigo-100 text-indigo-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {step}
                {!done && i < 4 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
              </div>
              {i < 4 && <div className={`flex-1 h-0.5 ${done ? 'bg-green-300' : 'bg-gray-200'}`} />}
            </div>
          );
        })}
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(agent => (
          <div key={agent.id} className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
            agent.status === 'running' ? 'border-green-300 ring-1 ring-green-200' :
            agent.status === 'completed' ? 'border-gray-200' :
            agent.status === 'failed' ? 'border-red-200 opacity-60' : 'border-gray-200 opacity-70'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{agent.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900">{agent.name}</h3>
                  <p className="text-xs text-gray-500">{agent.role} · {agent.model}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {agent.outputSize > 0 && (
                  <span className="text-xs text-gray-400">{(agent.outputSize / 1024).toFixed(1)}KB</span>
                )}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  agent.status === 'running' ? 'bg-green-100 text-green-700' :
                  agent.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                  agent.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {STATUS_LABELS[agent.status]}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">{agent.task}</p>

            {agent.status === 'running' && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                处理中... {agent.outputSize > 0 ? `已产出 ${(agent.outputSize / 1024).toFixed(1)}KB` : ''}
              </div>
            )}
            {agent.status === 'completed' && agent.completedAt && (
              <div className="text-xs text-gray-400">
                完成于 {new Date(agent.completedAt).toLocaleTimeString('zh-CN')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Log */}
      <div className="mt-6 bg-gray-900 rounded-2xl p-5 font-mono text-xs h-48 overflow-y-auto shadow-inner">
        <div className="text-gray-500 mb-2">$ agent-pipeline log --follow</div>
        <div className="text-green-400/60">[{new Date(Date.now() - 1800000).toLocaleTimeString()}] Pipeline initialized: PM → User → QA → Dev → Done</div>
        {logs.map((l, i) => <div key={i} className="text-green-400">{l}</div>)}
        <div className="animate-pulse text-gray-500">_</div>
      </div>

      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/" className="text-indigo-600 hover:text-indigo-700">← NovelCraft</Link>
        {completed === 4 && <span className="text-green-600 font-medium">🎉 全部 Agent 已完成！</span>}
      </div>
    </div>
  );
}

function StatBox({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
