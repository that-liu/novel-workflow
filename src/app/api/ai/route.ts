import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic';
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'deepseek-v4-pro';

export async function POST(req: NextRequest) {
  const { systemPrompt, userMessage } = await req.json();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
  };

  const body = {
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  };

  const url = `${BASE_URL}/v1/messages`;
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

  if (!resp.ok) {
    // Return a meaningful error so the UI can show it
    const errText = await resp.text();
    console.error('AI API error:', resp.status, errText);
    return NextResponse.json({ text: `AI 服务暂时不可用（${resp.status}），请稍后重试。` });
  }

  const data = await resp.json();
  const text = data.content?.map((c: { type: string; text?: string }) => c.text || '').join('') || '';

  return NextResponse.json({ text });
}
