'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Novel, TimelineEvent } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import Link from 'next/link';

export default function TimelinePage() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  useEffect(() => {
    if (novel?.timelineEvents) {
      setEvents(prev => {
        const prevStr = JSON.stringify(prev);
        const newStr = JSON.stringify(novel.timelineEvents);
        return prevStr === newStr ? prev : novel.timelineEvents;
      });
    }
  }, [novel]);

  const save = (evts: TimelineEvent[]) => {
    setEvents(evts);
    if (novel) {
      const updated = { ...novel, timelineEvents: evts, updatedAt: new Date().toISOString() };
      setNovel(updated);
      saveProject(updated);
    }
  };

  const addEvent = () => {
    save([...events, { id: Date.now().toString(), time: '', title: '', description: '', chapterRef: '' }]);
  };

  const updateEvent = (idx: number, field: keyof TimelineEvent, value: string) => {
    const updated = [...events];
    updated[idx] = { ...updated[idx], [field]: value };
    save(updated);
  };

  const removeEvent = (idx: number) => save(events.filter((_, i) => i !== idx));

  const moveEvent = (idx: number, dir: number) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= events.length) return;
    const updated = [...events];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    save(updated);
  };

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const sortedChapters = [...novel.chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回项目</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⏳ 故事时间线</h1>
          <p className="text-gray-500 text-sm">按时间顺序排列故事关键事件</p>
        </div>
        <button onClick={addEvent} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700">+ 添加事件</button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">⏱️</p>
          <p>还没有时间线事件，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="relative pl-8 border-l-2 border-indigo-200 space-y-6 ml-4">
          {events.map((evt, i) => (
            <div key={evt.id} className="relative bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="absolute -left-[2.35rem] top-6 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow" />
              <div className="flex gap-3 mb-3">
                <input
                  value={evt.time}
                  onChange={e => updateEvent(i, 'time', e.target.value)}
                  className="w-32 border rounded-lg px-2 py-1 text-sm font-mono"
                  placeholder="时间点"
                />
                <input
                  value={evt.title}
                  onChange={e => updateEvent(i, 'title', e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-1 text-sm font-semibold"
                  placeholder="事件标题"
                />
                <select
                  value={evt.chapterRef}
                  onChange={e => updateEvent(i, 'chapterRef', e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1"
                >
                  <option value="">关联章节</option>
                  {sortedChapters.map(ch => (
                    <option key={ch.id} value={ch.id}>第{ch.order}章</option>
                  ))}
                </select>
              </div>
              <textarea
                value={evt.description}
                onChange={e => updateEvent(i, 'description', e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-20"
                placeholder="事件描述..."
              />
              <div className="flex justify-between mt-2">
                <div className="flex gap-1">
                  <button onClick={() => moveEvent(i, -1)} disabled={i === 0} className="text-xs text-gray-400 hover:text-indigo-600 disabled:opacity-30">↑ 上移</button>
                  <button onClick={() => moveEvent(i, 1)} disabled={i === events.length - 1} className="text-xs text-gray-400 hover:text-indigo-600 disabled:opacity-30">↓ 下移</button>
                </div>
                <button onClick={() => removeEvent(i)} className="text-xs text-gray-400 hover:text-red-500">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
