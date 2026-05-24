'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AgentStatus {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  task: string;
  model: string;
  progress: number;
}

const TEAM: AgentStatus[] = [
  {
    id: 'pm',
    name: 'PM 产品经理',
    role: '产品',
    icon: '📋',
    status: 'running',
    task: '审查全站代码 · 输出需求清单 · 写用户故事',
    model: 'deepseek-chat',
    progress: 60,
  },
  {
    id: 'qa',
    name: 'QA 测试工程师',
    role: '测试',
    icon: '🔍',
    status: 'failed',
    task: 'HTTP 状态码检查 · API 路由测试 · TypeScript 错误扫描',
    model: 'deepseek-chat',
    progress: 30,
  },
  {
    id: 'user',
    name: 'User 用户代表',
    role: '用户',
    icon: '✍️',
    status: 'failed',
    task: '模拟用户使用流程 · 体验问题反馈 · 功能建议',
    model: 'deepseek-chat',
    progress: 50,
  },
  {
    id: 'dev',
    name: 'Dev 开发工程师',
    role: '开发',
    icon: '⚙️',
    status: 'running',
    task: '统一数据存储 · 编辑器自动保存 · 删除确认 · AI错误处理',
    model: 'deepseek-reasoner',
    progress: 40,
  },
];

export default function AgentDashboard() {
  const [agents, setAgents] = useState(TEAM);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const runningCount = agents.filter(a => a.status === 'running').length;
  const completedCount = agents.filter(a => a.status === 'completed').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤖 Agent 工作台</h1>
          <p className="text-gray-500 text-sm mt-1">多 Agent 协同开发 · 持续迭代</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{runningCount}</div>
            <div className="text-xs text-gray-500">运行中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{completedCount}</div>
            <div className="text-xs text-gray-500">已完成</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</div>
            <div className="text-xs text-gray-500">运行时长</div>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="flex items-center gap-2 mb-8 p-4 bg-white border border-gray-200 rounded-2xl">
        {['📋 PM 分析', '✍️ 用户反馈', '🔍 QA 测试', '⚙️ Dev 开发', '✅ 完成'].map((step, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
              i < 2 ? 'bg-indigo-100 text-indigo-700' :
              i === 2 ? 'bg-amber-100 text-amber-700' :
              i === 3 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {step}
              {i < 3 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            </div>
            {i < 4 && <div className="flex-1 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(agent => (
          <div key={agent.id} className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
            agent.status === 'running' ? 'border-green-300 ring-1 ring-green-200' :
            agent.status === 'completed' ? 'border-gray-200' :
            agent.status === 'failed' ? 'border-red-200 opacity-60' : 'border-gray-200'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{agent.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900">{agent.name}</h3>
                  <p className="text-xs text-gray-500">{agent.role} · {agent.model}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                agent.status === 'running' ? 'bg-green-100 text-green-700' :
                agent.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                agent.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {agent.status === 'running' ? '⚡ 运行中' :
                 agent.status === 'completed' ? '✅ 已完成' :
                 agent.status === 'failed' ? '⏸️ 等待恢复' : '⏳ 等待中'}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-3">{agent.task}</p>

            {agent.status === 'running' && (
              <div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${agent.progress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{agent.progress}%</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    处理中...
                  </span>
                </div>
              </div>
            )}

            {agent.status === 'failed' && (
              <div className="text-xs text-red-500 bg-red-50 rounded-lg p-2">
                ⚠️ 被中断，等待恢复
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Log */}
      <div className="mt-6 bg-gray-900 rounded-2xl p-5 text-green-400 font-mono text-xs h-48 overflow-y-auto shadow-inner">
        <div className="text-gray-500 mb-2">$ agent-pipeline status</div>
        <div>[{new Date().toLocaleTimeString()}] Pipeline initialized: PM → User → QA → Dev</div>
        <div>[{new Date(Date.now() - 300000).toLocaleTimeString()}] 📋 PM Agent started · analyzing codebase</div>
        <div>[{new Date(Date.now() - 240000).toLocaleTimeString()}] ✍️ User Agent started · browsing pages</div>
        <div>[{new Date(Date.now() - 200000).toLocaleTimeString()}] 🔍 QA Agent started · testing API routes</div>
        <div>[{new Date(Date.now() - 180000).toLocaleTimeString()}] 📋 PM Agent · team_pm.md written (8979 bytes)</div>
        <div>[{new Date(Date.now() - 120000).toLocaleTimeString()}] ✍️ User Agent · killed (timeout)</div>
        <div>[{new Date(Date.now() - 100000).toLocaleTimeString()}] 🔍 QA Agent · killed (timeout)</div>
        <div>[{new Date(Date.now() - 60000).toLocaleTimeString()}] ⚙️ Dev Agent started · fixing P0 issues</div>
        <div>[{new Date().toLocaleTimeString()}] ⚙️ Dev Agent · working on data unification...</div>
        <div className="animate-pulse text-gray-500">_</div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700">← 返回 NovelCraft</Link>
      </div>
    </div>
  );
}
