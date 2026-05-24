import { Novel } from './types';
const API_BASE = '/api/storage';

function getToken() { if (typeof window === 'undefined') return null; return localStorage.getItem('nc_token'); }

export async function listProjects(): Promise<Novel[]> {
  if (!getToken()) return [];
  const res = await fetch(API_BASE, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) return [];
  return res.json();
}
export async function getProject(id: string): Promise<Novel | null> {
  if (!getToken()) return null;
  const res = await fetch(`${API_BASE}?id=${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) return null; return res.json();
}
export async function saveProject(novel: Novel): Promise<void> {
  if (!getToken()) return;
  await fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(novel) });
}
export async function deleteProject(id: string): Promise<void> {
  if (!getToken()) return;
  await fetch(`${API_BASE}?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
}
