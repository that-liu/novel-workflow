import { Novel } from './types';
const API_BASE = '/api/storage';

function getToken() { if (typeof window === 'undefined') return null; return localStorage.getItem('nc_token'); }

export async function listProjects(): Promise<Novel[]> {
  const res = await fetch(API_BASE, { headers: { Authorization: `Bearer ${getToken()}` } });
  return res.json();
}
export async function getProject(id: string): Promise<Novel | null> {
  const res = await fetch(`${API_BASE}?id=${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) return null; return res.json();
}
export async function saveProject(novel: Novel): Promise<void> {
  await fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(novel) });
}
export async function deleteProject(id: string): Promise<void> {
  await fetch(`${API_BASE}?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
}
