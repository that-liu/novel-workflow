import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: 'running' | 'completed' | 'pending' | 'failed';
  task: string;
  model: string;
  outputSize: number;
  completedAt: string | null;
}

const AGENT_DEFS: Record<string, Omit<AgentInfo, 'status' | 'outputSize' | 'completedAt'>> = {
  pm: { id: 'pm', name: 'PM 产品经理', role: '产品', icon: '📋', task: '产品审查 · 需求清单 · 用户故事', model: 'deepseek-chat' },
  user: { id: 'user', name: 'User 用户代表', role: '用户', icon: '✍️', task: '模拟用户流程 · 体验反馈 · 功能建议', model: 'deepseek-chat' },
  qa: { id: 'qa', name: 'QA 测试工程师', role: '测试', icon: '🔍', task: 'API测试 · 页面检查 · Bug报告', model: 'deepseek-chat' },
  dev: { id: 'dev', name: 'Dev 开发工程师', role: '开发', icon: '⚙️', task: 'P0修复 · 数据统一 · 自动保存 · 确认弹窗', model: 'deepseek-reasoner' },
};

export async function GET() {
  const agents: AgentInfo[] = [];

  for (const def of Object.values(AGENT_DEFS)) {
    const outputFile = path.join(process.cwd(), `team_${def.id}.md`);
    let status: AgentInfo['status'] = 'pending';
    let outputSize = 0;
    let completedAt: string | null = null;

    if (fs.existsSync(outputFile)) {
      const stat = fs.statSync(outputFile);
      outputSize = stat.size;
      completedAt = stat.mtime.toISOString();
      status = outputSize > 500 ? 'completed' : 'running';
    } else {
    }

    agents.push({ ...def, status, outputSize, completedAt });
  }

  // Override with temporal status: if file was modified in last 30s, it's "running"
  const now = Date.now();
  for (const a of agents) {
    if (a.status === 'completed' && a.completedAt) {
      const mtime = new Date(a.completedAt).getTime();
      if (now - mtime < 30000) a.status = 'running';
    }
  }

  return NextResponse.json({
    agents,
    pipeline: {
      pm: agents.find(a => a.id === 'pm')?.status === 'completed',
      user: agents.find(a => a.id === 'user')?.status === 'completed',
      qa: agents.find(a => a.id === 'qa')?.status === 'completed',
      dev: agents.find(a => a.id === 'dev')?.status === 'completed',
    },
    timestamp: new Date().toISOString(),
  });
}
