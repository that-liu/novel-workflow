import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic';
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'deepseek-v4-pro';

export async function POST(req: NextRequest) {
  const { systemPrompt, messages } = await req.json();

  const body = {
    model: MODEL,
    max_tokens: 4096,
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
    return NextResponse.json({ text: `AI 服务暂时不可用（${resp.status}）` });
  }

  const data = await resp.json();
  const text = data.content?.map((c: { type: string; text?: string }) => c.text || '').join('') || '';
  return NextResponse.json({ text });
}
