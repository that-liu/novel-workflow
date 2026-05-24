import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth';
export async function POST(req:NextRequest) {
  try { const {email,password}=await req.json(); const r=register(email,password);
    if('error' in r) return NextResponse.json(r,{status:400}); return NextResponse.json(r);
  } catch { return NextResponse.json({error:'Invalid JSON'},{status:400}); }
}
