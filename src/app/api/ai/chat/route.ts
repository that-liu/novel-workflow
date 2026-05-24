import { NextRequest } from 'next/server';

const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic';
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const DEFAULT_MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'deepseek-v4-pro';

const AVAILABLE_MODELS = [
  'deepseek-v4-pro',
  'deepseek-chat',
  'deepseek-reasoner',
];

export async function POST(req: NextRequest) {
  let systemPrompt: string, messages: unknown[], model: string | undefined;
  try { const body = await req.json(); systemPrompt = body.systemPrompt; messages = body.messages; model = body.model; }
  catch { return new Response(JSON.stringify({ text: '请求体必须是合法的 JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
  const selectedModel = model && AVAILABLE_MODELS.includes(model) ? model : DEFAULT_MODEL;

  const body = {
    model: selectedModel,
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

  return new Response(resp.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
