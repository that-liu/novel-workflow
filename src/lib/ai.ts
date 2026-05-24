export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AI_MODELS = [
  { id: 'deepseek-v4-pro', label: 'V4 Pro', desc: '推理能力最强' },
  { id: 'deepseek-chat', label: 'V3 Chat', desc: '对话流畅快速' },
  { id: 'deepseek-reasoner', label: 'R1 推理', desc: '深度逻辑推理' },
];

export async function callAI(systemPrompt: string, userMessage: string, model?: string): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userMessage, model }),
  });
  if (!res.ok) throw new Error('AI request failed');
  const data = await res.json();
  return data.text;
}

export function streamAIChat(
  systemPrompt: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  model?: string
): AbortController {
  const controller = new AbortController();

  fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, messages, model }),
    signal: controller.signal,
  })
    .then(async resp => {
      if (!resp.ok) { onError(`AI 服务错误 (${resp.status})`); return; }
      const reader = resp.body?.getReader();
      if (!reader) { onError('无法读取响应流'); return; }
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              if (json.type === 'content_block_delta') {
                onChunk(json.delta?.text || '');
              }
            } catch { /* partial chunk */ }
          }
        }
      }
      onDone();
    })
    .catch(err => {
      if (err.name !== 'AbortError') onError(err.message);
    });

  return controller;
}
