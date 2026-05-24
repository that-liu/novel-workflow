'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface AgentInfo {
  id: string; name: string; icon: string; model: string;
  status: 'running' | 'completed' | 'pending';
  task: string; updatedAt: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  running:  { label: '⚡ 运行中', color: 'text-green-700', bg: 'bg-green-100', ring: 'border-green-300 ring-1 ring-green-200' },
  completed:{ label: '✅ 已完成', color: 'text-gray-600', bg: 'bg-gray-100', ring: 'border-gray-200' },
  pending:  { label: '⏳ 等待中', color: 'text-gray-400', bg: 'bg-gray-50', ring: 'border-gray-200 opacity-60' },
};

export default function AgentDashboard() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [formattedUpdatedAt, setFormattedUpdatedAt] = useState('');
  const [agentTimeMap, setAgentTimeMap] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const prevRef = useRef<string>('');

  useEffect(() => {
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);

    // SSE connection
    const es = new EventSource('/api/agents/events');
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        setAgents(data.agents || []);
        setUpdatedAt(data.updatedAt || '');
        setFormattedUpdatedAt(
          data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('zh-CN') : ''
        );
        const timeMap: Record<string, string> = {};
        (data.agents || []).forEach((a: AgentInfo) => {
          timeMap[a.id] = a.updatedAt ? new Date(a.updatedAt).toLocaleTimeString('zh-CN') : '';
        });
        setAgentTimeMap(timeMap);

        const snapshot = JSON.stringify(data.agents?.map((a: AgentInfo) => a.id + a.status));
        if (snapshot !== prevRef.current && prevRef.current) {
          const changed = data.agents?.filter((a: AgentInfo) => a.status === 'running');
          if (changed?.length) {
            const now = new Date().toLocaleTimeString();
            setLogs(prev => [...prev.slice(-49), `[${now}] 🔄 ${changed.map((a: AgentInfo) => a.name).join(', ')} — running`]);
          }
        }
        prevRef.current = snapshot;
      } catch {}
    });

    return () => { clearInterval(timer); es.close(); };
  }, []);

  useEffect(() => {
    setAgentTimeMap(prev => {
      const next: Record<string, string> = {};
      agents.forEach(a => {
        next[a.id] = prev[a.id] ?? (a.updatedAt ? new Date(a.updatedAt).toLocaleTimeString('zh-CN') : '');
      });
      return next;
    });
  }, [agents]);

  const completed = agents.filter(a => a.status === 'completed').length;
  const running = agents.filter(a => a.status === 'running').length;
  const total = agents.length;
  const round1Done = ['pm','user','qa','dev-r1'].every(id => agents.find(a => a.id === id)?.status === 'completed');
  const round2Done = ['dev-r2a','dev-r2b','dev-r2c'].every(id => agents.find(a => a.id === id)?.status === 'completed');
  const allDone = completed === total && total > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤖 Agent 工作台</h1>
          <p className="text-gray-500 text-sm mt-1">
            SSE 实时推送 · 2秒检测
            <span className={`inline-block w-2 h-2 rounded-full ml-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs ml-1">{connected ? '已连接' : '重连中...'}</span>
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <StatBox value={completed} label="完成" color="text-green-600" />
          <StatBox value={running} label="运行中" color="text-indigo-600" />
          <StatBox value={`${Math.floor(elapsed/60)}:${(elapsed%60).toString().padStart(2,'0')}`} label="时长" color="text-gray-600" />
        </div>
      </div>

      {/* Round indicators */}
      <div className="flex gap-3 mb-6">
        <div className={`flex-1 rounded-xl p-3 text-center text-sm font-medium ${round1Done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          🔄 第一轮 {round1Done ? '✅' : '···'}
        </div>
        <div className={`flex-1 rounded-xl p-3 text-center text-sm font-medium ${round2Done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          🔄 第二轮 {round2Done ? '✅' : '···'}
        </div>
        <div className={`flex-1 rounded-xl p-3 text-center text-sm font-medium ${allDone ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          🎯 全部完成 {allDone ? '✅' : '···'}
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {agents.map(agent => {
          const st = STATUS_MAP[agent.status] || STATUS_MAP.pending;
          return (
            <div key={agent.id} className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${st.ring}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{agent.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{agent.name}</h3>
                    <p className="text-xs text-gray-500">{agent.model}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {agent.status === 'running' && (
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                    {st.label}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">{agent.task}</p>
              {agentTimeMap[agent.id] && (
                <p className="text-[10px] text-gray-400 mt-1">
                  {agentTimeMap[agent.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Logs */}
      <div className="mt-6 bg-gray-900 rounded-2xl p-4 font-mono text-xs h-40 overflow-y-auto">
        <div className="text-gray-500 mb-2">$ journalctl -f -u agent-pipeline</div>
        {logs.length === 0 && <div className="text-green-400/50">等待事件...</div>}
        {logs.map((l, i) => <div key={i} className="text-green-400">{l}</div>)}
        <div className="animate-pulse text-gray-500">_</div>
      </div>

      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/" className="text-indigo-600 hover:text-indigo-700">← NovelCraft</Link>
        {allDone && <span className="text-green-600 font-medium">🎉 全部分析完成，可以开始第三轮开发</span>}
        {updatedAt && <span className="text-xs text-gray-400 ml-auto">更新于 {formattedUpdatedAt}</span>}
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
