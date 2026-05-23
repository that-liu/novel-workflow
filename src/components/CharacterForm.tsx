'use client';
import { useState } from 'react';
import { Character } from '@/lib/types';
import { callAI } from '@/lib/ai';

export default function CharacterForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Character;
  onSave: (c: Character) => void;
  onCancel: () => void;
}) {
  const [char, setChar] = useState<Character>(
    initial || { id: Date.now().toString(), name: '', role: '', personality: '', backstory: '', motivation: '', notes: '' }
  );
  const [generating, setGenerating] = useState(false);

  const update = (k: keyof Character, v: string) => setChar(prev => ({ ...prev, [k]: v }));

  const generateCharacter = async () => {
    if (!char.name) return;
    setGenerating(true);
    const prompt = `请为角色"${char.name}"${char.role ? `（${char.role}）` : ''}生成详细的角色设定，包括：个性特点、背景故事、动机目标。用中文，直接给出内容，不要格式标记。`;
    try {
      const result = await callAI('你是一位专业的小说角色设计师。', prompt);
      const parts = result.split(/\n(?=背景故事[：:]|动机目标[：:]|个性特点[：:])/);
      parts.forEach(p => {
        const content = p.replace(/^(背景故事|动机目标|个性特点)[：:]\s*/i, '').trim();
        if (p.startsWith('背景故事')) update('backstory', content);
        else if (p.startsWith('动机目标')) update('motivation', content);
        else if (p.startsWith('个性特点')) update('personality', content);
        else update('personality', p.trim());
      });
    } catch (e) { /* ignore */ }
    setGenerating(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">名字</label>
          <input value={char.name} onChange={e => update('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="角色名字" />
        </div>
        <div>
          <label className="text-xs text-gray-500">角色</label>
          <input value={char.role} onChange={e => update('role', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="主角/反派/配角" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500">个性特点</label>
          <button onClick={generateCharacter} disabled={generating || !char.name} className="text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50">
            {generating ? 'AI 生成中...' : '🤖 AI 生成全部'}
          </button>
        </div>
        <textarea value={char.personality} onChange={e => update('personality', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="性格、习惯、特点..." />
      </div>
      <div>
        <label className="text-xs text-gray-500">背景故事</label>
        <textarea value={char.backstory} onChange={e => update('backstory', e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="过去经历..." />
      </div>
      <div>
        <label className="text-xs text-gray-500">动机目标</label>
        <textarea value={char.motivation} onChange={e => update('motivation', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="想要什么、为什么..." />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
        <button onClick={() => onSave(char)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">保存</button>
      </div>
    </div>
  );
}
