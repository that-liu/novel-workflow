export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userMessage }),
  });
  if (!res.ok) throw new Error('AI request failed');
  const data = await res.json();
  return data.text;
}

export async function callAIChat(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, messages }),
  });
  if (!res.ok) throw new Error('AI chat failed');
  const data = await res.json();
  return data.text;
}
