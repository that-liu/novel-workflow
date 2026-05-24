import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';
export async function POST(req:NextRequest) {
  try { const {email,password}=await req.json(); const r=login(email,password);
    if('error' in r) return NextResponse.json(r,{status:401}); return NextResponse.json(r);
  } catch { return NextResponse.json({error:'Invalid JSON'},{status:400}); }
}
