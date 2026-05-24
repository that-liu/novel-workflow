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

const PHASES = [
  { key: 'meta', label: '📖 生成作品信息', desc: '书名、类型、简介' },
  { key: 'world', label: '🌌 构建世界观', desc: '时代背景、地理、力量体系等' },
  { key: 'characters', label: '👤 创建角色', desc: '主角和主要配角' },
  { key: 'outline', label: '📋 生成大纲', desc: '8-12章情节结构' },
];

export async function POST(req: NextRequest) {
  let idea: string, model: string | undefined;
  try { const body = await req.json(); idea = body.idea; model = body.model; }
  catch { return new Response(JSON.stringify({ error: '请求体必须是合法的 JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Phase 1: Meta info
        send({ phase: 'meta', status: 'running' });
        const metaPrompt = `基于以下创意，生成小说元信息。返回严格JSON格式，不要其他文字：
{"title":"小说标题","genre":"类型（玄幻/言情/悬疑/科幻/武侠/都市/历史/奇幻/轻小说）","description":"一句话简介（30字以内）"}

创意：${idea}`;
        const metaText = await callAI('你是一位资深出版编辑，擅长给小说命名和定位。只返回JSON，不要任何其他文字。', metaPrompt, model);
        let meta;
        try {
          const jsonMatch = metaText.match(/\{[\s\S]*\}/);
          meta = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: idea.slice(0, 20), genre: '', description: idea };
        } catch { meta = { title: idea.slice(0, 20), genre: '', description: idea }; }
        send({ phase: 'meta', status: 'done', data: meta });

        // Phase 2: World
        send({ phase: 'world', status: 'running' });
        const worldPrompt = `为小说《${meta.title}》（${meta.genre || '未定类型'}，${meta.description}）设计世界观。返回严格JSON格式：
{
  "era": "时代背景",
  "geography": "地理环境",
  "magic": "力量体系",
  "society": "社会结构",
  "factions": "势力派系",
  "rules": "核心法则"
}
每项50-100字，用中文。只返回JSON，不要其他文字。`;
        const worldText = await callAI('你是一位科幻/奇幻世界构建大师。只返回JSON，不要任何其他文字。', worldPrompt, model);
        let world;
        try {
          const jsonMatch = worldText.match(/\{[\s\S]*\}/);
          world = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch { world = {}; }
        send({ phase: 'world', status: 'done', data: world });

        // Phase 3: Characters
        send({ phase: 'characters', status: 'running' });
        const charPrompt = `为《${meta.title}》创建4个主要角色。返回严格JSON数组格式：
[
  {"name":"名字","role":"主角/反派/配角","personality":"性格描述","backstory":"背景故事","motivation":"动机目标","notes":""},
  ...
]
每人80-150字。只返回JSON数组，不要其他文字。`;
        const charText = await callAI('你是一位角色设计专家。只返回JSON数组，不要任何其他文字。', charPrompt, model);
        let characters;
        try {
          const jsonMatch = charText.match(/\[[\s\S]*\]/);
          characters = jsonMatch ? JSON.parse(jsonMatch[0]).map((c: Record<string, string>, i: number) => ({ ...c, id: Date.now().toString() + i })) : [];
        } catch { characters = []; }
        send({ phase: 'characters', status: 'done', data: characters });

        // Phase 4: Outline
        send({ phase: 'outline', status: 'running' });
        const outlinePrompt = `为《${meta.title}》设计10章情节大纲。返回严格JSON数组格式：
[
  {"title":"章节标题","summary":"一句话摘要（20-40字）"},
  ...
]
从第1章到第10章，有起承转合。只返回JSON数组，不要其他文字。`;
        const outlineText = await callAI('你是一位小说结构设计师。只返回JSON数组，不要任何其他文字。', outlinePrompt, model);
        let chapters;
        try {
          const jsonMatch = outlineText.match(/\[[\s\S]*\]/);
          const rawChapters = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
          chapters = rawChapters.map((ch: { title: string; summary: string }, i: number) => ({
            id: Date.now().toString() + 100 + i,
            title: ch.title,
            content: '',
            order: i + 1,
            status: 'draft',
            wordCount: 0,
            summary: ch.summary || '',
          }));
        } catch { chapters = []; }
        send({ phase: 'outline', status: 'done', data: chapters });

        send({ phase: 'complete', status: 'done' });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send({ phase: 'error', status: 'error', error: message });
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
