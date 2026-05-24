import { NextRequest } from 'next/server';

const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic';
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'deepseek-v4-pro';

async function callAI(system: string, prompt: string, model?: string): Promise<string> {
  const resp = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!resp.ok) throw new Error(`AI error: ${resp.status}`);
  const data = await resp.json();
  return data.content?.map((c: { type: string; text?: string }) => c.text || '').join('') || '';
}

export async function POST(req: NextRequest) {
  const { novel, chapters } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const context = `小说《${novel.title}》${novel.genre ? `（${novel.genre}）` : ''}。${novel.description || ''}。世界观设定：${novel.notes || '暂无'}。角色：${(novel.characters || []).map((c: { name: string; role: string; personality: string }) => `${c.name}(${c.role}): ${c.personality}`).join('；')}`;

        for (let i = 0; i < chapters.length; i++) {
          const ch = chapters[i];
          send({ phase: 'writing', chapterIndex: i, total: chapters.length, chapterTitle: ch.title, status: 'running' });

          const prevChapter = i > 0 ? chapters[i - 1] : null;
          const prevSummary = prevChapter?.summary || '无';
          const systemPrompt = `你是一位出版级小说作家。请根据大纲撰写章节内容。`;

          let prompt = `${context}\n\n`;
          prompt += `请撰写第${ch.order}章《${ch.title}》。本章摘要：${ch.summary || '根据情节推进'}`;
          if (prevSummary) {
            prompt += `\n上一章摘要：${prevSummary}`;
          }
          prompt += `\n\n要求：写800-1500字，有场景描写、对话和情节推进。直接输出正文，不要标题。`;

          try {
            const content = await callAI(systemPrompt, prompt);
            send({
              phase: 'writing',
              chapterIndex: i,
              chapterId: ch.id,
              chapterTitle: ch.title,
              content,
              wordCount: content.replace(/\s/g, '').length,
              status: 'done',
            });
          } catch {
            send({
              phase: 'writing',
              chapterIndex: i,
              chapterId: ch.id,
              chapterTitle: ch.title,
              content: `[AI 生成失败，请手动写作]`,
              wordCount: 0,
              status: 'error',
            });
          }
        }

        send({ phase: 'complete', status: 'done' });
      } catch (err: unknown) {
        send({ phase: 'error', error: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
