import { NextRequest } from 'next/server';

const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic';
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'deepseek-v4-pro';

export async function POST(req: NextRequest) {
  const { systemPrompt, messages } = await req.json();

  const body = {
    model: MODEL,
    max_tokens: 4096,
    stream: true,
    system: systemPrompt,
    messages,
  };

  const resp = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ text: `AI 服务暂时不可用（${resp.status}）` }), {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stream the SSE response directly to the client
  return new Response(resp.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
