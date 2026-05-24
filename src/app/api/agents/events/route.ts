import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const STATUS_FILE = path.join(process.cwd(), 'team_status.json');

function readStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch {
    return { agents: [], updatedAt: null };
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

      let lastMtime = 0;

      while (!closed) {
        try {
          const stat = fs.statSync(STATUS_FILE);
          const mtime = stat.mtimeMs;

          if (mtime !== lastMtime) {
            lastMtime = mtime;
            const data = readStatus();
            const agents = data.agents || [];
            const completed = agents.filter((a: { status: string }) => a.status === 'completed').length;
            send({
              agents,
              stats: { total: agents.length, completed, running: agents.length - completed },
              round1: ['pm','user','qa','dev-r1'].every((id: string) => agents.find((a: { id: string }) => a.id === id)?.status === 'completed'),
              round2: ['dev-r2a','dev-r2b','dev-r2c'].every((id: string) => agents.find((a: { id: string }) => a.id === id)?.status === 'completed'),
              round3: ['dev-r3a','dev-r3b'].every((id: string) => agents.find((a: { id: string }) => a.id === id)?.status === 'completed'),
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          }
        } catch {}

        await new Promise(resolve => setTimeout(resolve, 3000));
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
