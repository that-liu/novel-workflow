import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const STATUS_FILE = path.join(process.cwd(), 'team_status.json');

function readStatus() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
  } catch {}
  return getDefaultStatus();
}

function getDefaultStatus() {
  return {
    agents: [
      { id: 'pm', name: 'PM 产品经理', icon: '📋', model: 'deepseek-chat', status: 'completed', task: '30+条需求 · 3条用户故事', updatedAt: null },
      { id: 'user', name: 'User 用户代表', icon: '✍️', model: 'deepseek-chat', status: 'completed', task: '全流程体验反馈 · 编辑器和EPUB最痛', updatedAt: null },
      { id: 'qa', name: 'QA 测试工程师', icon: '🔍', model: 'deepseek-chat', status: 'completed', task: '14个Bug · 10/11 API通过', updatedAt: null },
      { id: 'dev-r1', name: 'Dev R1 基础修复', icon: '⚙️', model: 'deepseek-reasoner', status: 'completed', task: '数据统一 · 自动保存 · 删除确认 · 错误处理', updatedAt: null },
      { id: 'dev-r2a', name: 'Dev R2-A Bug+EPUB', icon: '📦', model: 'deepseek-reasoner', status: 'completed', task: 'P0修复 · EPUB · 自动保存', updatedAt: null },
      { id: 'dev-r2b', name: 'Dev R2-B 编辑器', icon: '✨', model: 'deepseek-reasoner', status: 'completed', task: '预览Tab · 斜杠命令 · 安全改写', updatedAt: null },
      { id: 'dev-r2c', name: 'Dev R2-C AI记忆', icon: '🧠', model: 'deepseek-reasoner', status: 'completed', task: '跨页对话 · 取消生成 · 可编辑预览', updatedAt: null },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let lastModified = 0;
  let closed = false;
  req.signal.addEventListener('abort', () => { closed = true; });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial state
      send(readStatus());

      // Poll for changes every 2 seconds
      while (!closed) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const stat = fs.existsSync(STATUS_FILE) ? fs.statSync(STATUS_FILE) : null;
          const mtime = stat ? stat.mtimeMs : 0;
          if (mtime !== lastModified) {
            lastModified = mtime;
            send(readStatus());
          }
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
