import fs from 'fs'; import path from 'path'; import crypto from 'crypto';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'novelcraft-secret-change-in-production';

function readUsers(): Record<string, {email:string;password:string;plan:'free'|'pro';createdAt:string}> {
  try { return JSON.parse(fs.readFileSync(USERS_FILE,'utf-8')); } catch { return {}; }
}
function writeUsers(u:Record<string,unknown>) { fs.writeFileSync(USERS_FILE,JSON.stringify(u,null,2)); }

function hash(pw:string):string { return crypto.createHash('sha256').update(pw+'salt').digest('hex'); }
function jwtSign(payload:Record<string,unknown>):string {
  const h={alg:'HS256',typ:'JWT'}; const b=Buffer.from(JSON.stringify(h)).toString('base64url');
  const p=Buffer.from(JSON.stringify({...payload,exp:Date.now()+86400000*7})).toString('base64url');
  const sig=crypto.createHmac('sha256',JWT_SECRET).update(b+'.'+p).digest('base64url');
  return b+'.'+p+'.'+sig;
}
function jwtVerify(token:string):Record<string,unknown>|null {
  try { const [,p]=token.split('.'); return JSON.parse(Buffer.from(p,'base64url').toString()); } catch { return null; }
}

export function register(email:string,password:string):{token:string}|{error:string} {
  const users=readUsers(); if(users[email]) return {error:'邮箱已注册'};
  users[email]={email,password:hash(password),plan:'free',createdAt:new Date().toISOString()};
  writeUsers(users); return {token:jwtSign({email,plan:'free'})};
}
export function login(email:string,password:string):{token:string;plan:string}|{error:string} {
  const users=readUsers(); const u=users[email];
  if(!u||u.password!==hash(password)) return {error:'邮箱或密码错误'};
  return {token:jwtSign({email,plan:u.plan}),plan:u.plan};
}
export function getUser(token:string):{email:string;plan:'free'|'pro'} | null {
  const p=jwtVerify(token); if(!p||p.exp<Date.now()) return null;
  return {email:p.email as string,plan:(p.plan as 'free'|'pro')||'free'};
}
