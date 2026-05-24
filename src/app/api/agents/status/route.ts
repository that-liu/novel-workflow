import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface AgentInfo {
  id: string; name: string; role: string; icon: string;
  status: 'running' | 'completed' | 'pending' | 'failed';
  task: string; model: string; output: string;
}

// Current active agents (manually updated per sprint)
function getCurrentAgents(): AgentInfo[] {
  const cwd = process.cwd();

  // Check if team_*.md files exist
  const fileAgent = (id: string, name: string, role: string, icon: string, task: string, model: string): AgentInfo => {
    const filePath = path.join(cwd, `team_${id}.md`);
    const exists = fs.existsSync(filePath);
    const size = exists ? fs.statSync(filePath).size : 0;
    return {
      id, name, role, icon, task, model,
      status: exists ? 'completed' : 'pending',
      output: exists ? `${(size / 1024).toFixed(1)}KB` : '-',
    };
  };

  // Check git log for recent commits by agents
  const gitLog = (id: string, name: string, role: string, icon: string, task: string, model: string): AgentInfo => {
    try {
      const log = execSync(`git -C "${cwd}" log --oneline --since="30 minutes ago" --grep="${name}" -i 2>/dev/null || echo ""`, { encoding: 'utf-8' }).trim();
      const commitCount = log ? log.split('\n').length : 0;
      return {
        id, name, role, icon, task, model,
        status: commitCount > 0 ? 'completed' : 'running',
        output: commitCount > 0 ? `${commitCount} commits` : '进行中...',
      };
    } catch {
      return { id, name, role, icon, task, model, status: 'running', output: '进行中...' };
    }
  };

  return [
    // Round 1 agents (file-based)
    fileAgent('pm', 'PM 产品经理', '产品', '📋', '产品审查 · 需求清单 · 用户故事', 'deepseek-chat'),
    fileAgent('user', 'User 用户代表', '用户', '✍️', '模拟用户流程 · 体验反馈 · 功能建议', 'deepseek-chat'),
    fileAgent('qa', 'QA 测试工程师', '测试', '🔍', 'API测试 · 页面检查 · 14个Bug', 'deepseek-chat'),

    // Round 1 Dev
    gitLog('dev-r1', 'Dev R1 开发(数据+保存+弹窗+错误)', '开发', '⚙️', 'P0修复 · 数据统一 · 自动保存 · 确认弹窗', 'deepseek-reasoner'),

    // Round 2 agents (code-only)
    gitLog('dev-r2a', 'Dev R2-A Bug修复+EPUB', '开发', '📦', 'QA P0修复 · EPUB导出 · 世界观自动保存', 'deepseek-reasoner'),
    gitLog('dev-r2b', 'Dev R2-B 编辑器重做', '开发', '✨', '预览Tab · 斜杠命令 · 安全改写 · 选中操作', 'deepseek-reasoner'),
    gitLog('dev-r2c', 'Dev R2-C AI记忆+取消', '开发', '🧠', 'AI跨页记忆 · QuickCreate取消 · 生成后可编辑', 'deepseek-reasoner'),
  ];
}

export async function GET() {
  const agents = getCurrentAgents();
  const completed = agents.filter(a => a.status === 'completed').length;
  const running = agents.filter(a => a.status === 'running').length;

  return NextResponse.json({
    agents,
    stats: { total: agents.length, completed, running, pending: agents.length - completed - running },
    pipeline: {
      round1: agents.filter(a => ['pm','user','qa','dev-r1'].includes(a.id)).every(a => a.status === 'completed'),
      round2: agents.filter(a => a.id.startsWith('dev-r2')).filter(a => a.status === 'completed').length,
      round2total: 3,
    },
    timestamp: new Date().toISOString(),
  });
}
