import { NextRequest } from 'next/server';

const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic';
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || 'deepseek-v4-pro';

interface AgentDef {
  id: string; name: string; icon: string; system: string;
}

const PIPELINE: AgentDef[] = [
  {
    id: 'plot', name: '策划', icon: '📋',
    system: '你是一位资深小说策划。根据用户创意，设计完整的故事大纲。包括：故事类型、核心冲突、三幕结构、章节划分。输出结构化Markdown。',
  },
  {
    id: 'character', name: '角色', icon: '👤',
    system: '你是一位角色设计专家。根据故事大纲，创建3-5个有血有肉的角色。每人包含：名字、年龄、性格特点、背景故事、动机目标、与其他角色的关系。',
  },
  {
    id: 'narrative', name: '叙事', icon: '✍️',
    system: '你是一位出版级小说作家。根据大纲和角色设定，撰写指定章节内容。要求有场景描写、人物对话、情节推进。输出高质量中文小说正文。',
  },
  {
    id: 'editor', name: '审稿', icon: '🔍',
    system: '你是一位资深文学编辑。审查小说内容，检查：逻辑一致性、角色行为合理性、节奏把控、文笔质量。给出具体修改建议。',
  },
];

async function callAI(system: string, prompt: string): Promise<string> {
  const resp = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
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
  let idea: string, mode: string;
  try { const b = await req.json(); idea = b.idea; mode = b.mode || 'auto'; }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const results: Record<string, string> = {};

      for (const agent of PIPELINE) {
        send({ agent: agent.id, status: 'running', name: agent.name, icon: agent.icon });

        try {
          // Build context from previous agent outputs
          let context = '';
          if (agent.id === 'character') context = `故事大纲：\n${results.plot || '无'}\n\n`;
          if (agent.id === 'narrative') context = `故事大纲：\n${results.plot}\n\n角色设定：\n${results.character}\n\n`;
          if (agent.id === 'editor') context = `完整小说：\n${results.narrative}\n\n`;

          const prompt = agent.id === 'plot'
            ? `根据创意生成完整故事大纲：\n${idea}`
            : agent.id === 'narrative'
              ? `${context}请撰写所有章节的正文内容，每章800-1200字。`
              : `${context}请完成你的任务。`;

          const result = await callAI(agent.system, prompt);
          results[agent.id] = result;
          send({ agent: agent.id, status: 'done', name: agent.name, icon: agent.icon, output: result });
        } catch (e) {
          send({ agent: agent.id, status: 'error', name: agent.name, icon: agent.icon, error: (e as Error).message });
        }
      }

      send({ status: 'complete', results });
      controller.close();
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
