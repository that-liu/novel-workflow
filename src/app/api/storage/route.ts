import { NextRequest, NextResponse } from 'next/server';
import { Novel } from '@/lib/types';
import fs from 'fs'; import path from 'path';

const DATA_ROOT = path.join(process.cwd(), 'data', 'users');

function getUserEmail(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try { const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); return payload.exp > Date.now() ? payload.email : null; }
  catch { return null; }
}

function getUserDir(email: string) {
  const dir = path.join(DATA_ROOT, email.replace(/[^a-zA-Z0-9]/g, '_'));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function fp(dir: string, id: string) { return path.join(dir, `${id}.json`); }

// Rate limiting for free users
function checkRateLimit(email: string, plan: string): boolean {
  if (plan === 'pro') return true;
  const today = new Date().toISOString().slice(0, 10);
  const usageFile = path.join(DATA_ROOT, `${email.replace(/[^a-zA-Z0-9]/g, '_')}_usage.json`);
  let usage: Record<string, number> = {};
  try { usage = JSON.parse(fs.readFileSync(usageFile, 'utf-8')); } catch {}
  usage[today] = (usage[today] || 0) + 1;
  fs.writeFileSync(usageFile, JSON.stringify(usage));
  return (usage[today] || 0) <= 50; // 50 AI calls/day for free
}

export async function GET(req: NextRequest) {
  const email = getUserEmail(req); if (!email) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const dir = getUserDir(email);
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const f = fp(dir, id); if (!fs.existsSync(f)) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(JSON.parse(fs.readFileSync(f, 'utf-8')));
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const novels = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
  novels.sort((a: Novel, b: Novel) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return NextResponse.json(novels);
}

export async function POST(req: NextRequest) {
  const email = getUserEmail(req); if (!email) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const dir = getUserDir(email);
  let novel: Novel;
  try { novel = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  novel.updatedAt = new Date().toISOString();
  fs.writeFileSync(fp(dir, novel.id), JSON.stringify(novel, null, 2));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const email = getUserEmail(req); if (!email) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const dir = getUserDir(email);
  const id = req.nextUrl.searchParams.get('id'); if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const f = fp(dir, id); if (fs.existsSync(f)) fs.unlinkSync(f);
  return NextResponse.json({ ok: true });
}
