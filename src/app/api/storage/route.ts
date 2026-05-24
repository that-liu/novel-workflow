import { NextRequest, NextResponse } from 'next/server';
import { Novel } from '@/lib/types';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

export async function GET(req: NextRequest) {
  ensureDataDir();
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const fp = getFilePath(id);
    if (!fs.existsSync(fp)) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(JSON.parse(fs.readFileSync(fp, 'utf-8')));
  }
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const novels = files.map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')));
  novels.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return NextResponse.json(novels);
}

export async function POST(req: NextRequest) {
  ensureDataDir();
  let novel: Novel;
  try { novel = await req.json(); }
  catch { return NextResponse.json({ error: '请求体必须是合法的 JSON' }, { status: 400 }); }
  novel.updatedAt = new Date().toISOString();
  fs.writeFileSync(getFilePath(novel.id), JSON.stringify(novel, null, 2));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const fp = getFilePath(id);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  return NextResponse.json({ ok: true });
}
