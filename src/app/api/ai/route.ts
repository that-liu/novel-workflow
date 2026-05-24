import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs'; import path from 'path';

function getUser(req: NextRequest) { try { const t=(req.headers.get('authorization')||'').replace('Bearer ',''); const p=JSON.parse(Buffer.from(t.split('.')[1],'base64url').toString()); return p.exp>Date.now()?p:null; } catch { return null; } }
function rateLimit(req: NextRequest): boolean {
  const u=getUser(req); if(!u||u.plan==='pro') return true;
  const today=new Date().toISOString().slice(0,10);
  const f=path.join(process.cwd(),'data','users',`${(u.email||'').replace(/[^a-zA-Z0-9]/g,'_')}_usage.json`);
  let usage:Record<string,number>={}; try{usage=JSON.parse(fs.readFileSync(f,'utf-8'));}catch{}
  usage[today]=(usage[today]||0)+1; fs.writeFileSync(f,JSON.stringify(usage));
  return (usage[today]||0)<=10;
}

const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic';
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'deepseek-v4-pro';

export async function POST(req: NextRequest) {
  if (!rateLimit(req)) return NextResponse.json({ error: '今日AI调用次数已用完，请升级Pro' }, { status: 429 });
  let systemPrompt: string, userMessage: string, model: string | undefined;
  try {
    const body = await req.json();
    systemPrompt = body.systemPrompt;
    userMessage = body.userMessage;
    model = body.model;
  } catch {
    return NextResponse.json({ text: '请求体必须是合法的 JSON' }, { status: 400 });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
  };

  const body = {
    model: model || MODEL,
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
