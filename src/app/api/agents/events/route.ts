import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CWD = process.cwd();
const STATUS_FILE = path.join(CWD, 'team_status.json');

interface AgentInfo {
  id: string; name: string; icon: string; model: string;
  status: 'running' | 'completed' | 'pending';
  task: string; updatedAt: string | null;
}

const ALL_AGENTS: AgentInfo[] = [
  { id: 'pm', name: 'PM 产品经理', icon: '📋', model: 'deepseek-chat', status: 'completed', task: '30+条需求 · 3条用户故事', updatedAt: '2026-05-24T03:38:00Z' },
  { id: 'user', name: 'User 用户代表', icon: '✍️', model: 'deepseek-chat', status: 'completed', task: '全流程体验反馈 · 编辑器+EPUB最痛', updatedAt: '2026-05-24T03:47:00Z' },
  { id: 'qa', name: 'QA 测试工程师', icon: '🔍', model: 'deepseek-chat', status: 'completed', task: '14个Bug · 10/11 API通过', updatedAt: '2026-05-24T04:09:00Z' },
  { id: 'dev-r1', name: 'Dev R1 基础修复', icon: '⚙️', model: 'deepseek-reasoner', status: 'completed', task: '数据统一 · 自动保存 · 删除确认 · 错误处理', updatedAt: '2026-05-24T03:45:00Z' },
  { id: 'dev-r2a', name: 'Dev R2-A Bug+EPUB', icon: '📦', model: 'deepseek-reasoner', status: 'completed', task: 'P0修复 · EPUB · 自动保存', updatedAt: '2026-05-24T04:15:00Z' },
  { id: 'dev-r2b', name: 'Dev R2-B 编辑器', icon: '✨', model: 'deepseek-reasoner', status: 'completed', task: '预览Tab · 斜杠命令 · 安全改写', updatedAt: '2026-05-24T04:20:00Z' },
  { id: 'dev-r2c', name: 'Dev R2-C AI记忆', icon: '🧠', model: 'deepseek-reasoner', status: 'completed', task: '跨页对话 · 取消生成 · 可编辑预览', updatedAt: '2026-05-24T04:25:00Z' },
  { id: 'dev-r3a', name: 'Dev R3-A 质量+关系', icon: '🔧', model: 'deepseek-reasoner', status: 'running', task: 'QA P1修复 · 角色关系 · 项目状态 · 章节导航', updatedAt: new Date().toISOString() },
  { id: 'dev-r3b', name: 'Dev R3-B 深色+统计', icon: '🎨', model: 'deepseek-reasoner', status: 'running', task: '深色模式 · 写作统计 · 目标字数', updatedAt: new Date().toISOString() },
];

function detectCompletion(agents: AgentInfo[]): AgentInfo[] {
  // Check if git has commits for each agent in last hour
  try {
    const log = execSync(`git -C "${CWD}" log --oneline --since="2 hours ago"`, { encoding: 'utf-8' });
    return agents.map(a => {
      if (a.status === 'completed') return a;
      // Check for agent keywords in recent commits
      const idShort = a.id.replace('dev-', '');
      if (log.includes(idShort.toUpperCase()) || log.includes(a.name.slice(0, 6))) {
        return { ...a, status: 'completed', updatedAt: new Date().toISOString() };
      }
      // Check if related files were modified
      try {
        const diff = execSync(`git -C "${CWD}" diff --name-only HEAD~3..HEAD 2>/dev/null`, { encoding: 'utf-8' });
        if (diff.length > 50 && a.status === 'running') {
          // Agent is active if files are changing
          return a;
        }
      } catch {}
      return a;
    });
  } catch {
    return agents;
  }
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let closed = false;
  req.signal.addEventListener('abort', () => { closed = true; });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let lastHash = '';

      while (!closed) {
        const agents = detectCompletion(ALL_AGENTS);
        const hash = JSON.stringify(agents.map(a => a.id + a.status));

        if (hash !== lastHash) {
          lastHash = hash;
          const completed = agents.filter(a => a.status === 'completed').length;
          send({
            agents,
            stats: { total: agents.length, completed, running: agents.filter(a => a.status === 'running').length },
            round1: agents.filter(a => ['pm','user','qa','dev-r1'].includes(a.id)).every(a => a.status === 'completed'),
            round2: agents.filter(a => a.id.startsWith('dev-r2')).every(a => a.status === 'completed'),
            round3: agents.filter(a => a.id.startsWith('dev-r3')).filter(a => a.status === 'completed').length,
            round3total: 2,
            updatedAt: new Date().toISOString(),
          });
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
