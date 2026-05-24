'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Novel } from '@/lib/types';
import { getProject } from '@/lib/storage';
import Link from 'next/link';

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const totalWords = novel.chapters.reduce((s, c) => s + c.wordCount, 0);
  const doneChapters = novel.chapters.filter(c => c.status === 'done').length;
  const sortedChapters = [...novel.chapters].sort((a, b) => a.order - b.order);

  const generateMarkdown = () => {
    let md = `# ${novel.title}\n\n`;
    if (novel.description) md += `> ${novel.description}\n\n`;
    md += `---\n\n`;
    sortedChapters.forEach(ch => {
      md += `## ${ch.order}. ${ch.title}\n\n`;
      if (ch.summary) md += `*${ch.summary}*\n\n`;
      md += `${ch.content}\n\n`;
    });
    return md;
  };

  const generateTxt = () => {
    let txt = `${novel.title}\n`;
    txt += `${'='.repeat(novel.title.length)}\n\n`;
    sortedChapters.forEach(ch => {
      txt += `${'='.repeat(40)}\n`;
      txt += `第${ch.order}章 ${ch.title}\n`;
      txt += `${'='.repeat(40)}\n\n`;
      txt += `${ch.content}\n\n`;
    });
    return txt;
  };

  const generateHtml = () => {
    let html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${novel.title}</title>`;
    html += `<style>body{max-width:800px;margin:0 auto;padding:2em;font-family:Georgia,serif;line-height:1.8}h1{text-align:center}h2{border-bottom:1px solid #ddd;padding-bottom:.3em}</style></head><body>`;
    html += `<h1>${novel.title}</h1>`;
    if (novel.description) html += `<p style="text-align:center;color:#666"><em>${novel.description}</em></p>`;
    sortedChapters.forEach(ch => {
      html += `<h2>第${ch.order}章 ${ch.title}</h2>`;
      if (ch.summary) html += `<p style="color:#888"><em>${ch.summary}</em></p>`;
      html += `<div>${ch.content.split('\n').map((p: string) => `<p>${p || '&nbsp;'}</p>`).join('')}</div>`;
    });
    html += `</body></html>`;
    return html;
  };

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob(['﻿' + content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← 返回项目</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 导出作品</h1>
          <p className="text-gray-500 text-sm">预览并下载你的完整小说</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => download(generateMarkdown(), `${novel.title}.md`, 'text/markdown')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700">Markdown</button>
          <button onClick={() => download(generateTxt(), `${novel.title}.txt`, 'text/plain')} className="bg-gray-700 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-800">TXT</button>
          <button onClick={() => download(generateHtml(), `${novel.title}.html`, 'text/html')} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-700">HTML</button>
          <button onClick={() => { navigator.clipboard.writeText(generateTxt()); alert('已复制全文到剪贴板！'); }} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-amber-700">📋 复制全文</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{novel.chapters.length}</div>
          <div className="text-sm text-gray-500">章节数</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{totalWords.toLocaleString()}</div>
          <div className="text-sm text-gray-500">总字数</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{doneChapters}/{novel.chapters.length}</div>
          <div className="text-sm text-gray-500">完成章节</div>
        </div>
      </div>

      {sortedChapters.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">📄</p>
          <p>还没有内容可以预览，先去写点什么吧</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h1 className="text-3xl font-bold text-center mb-2">{novel.title}</h1>
          {novel.description && <p className="text-center text-gray-500 mb-6 italic">{novel.description}</p>}
          {sortedChapters.map(ch => (
            <div key={ch.id} className="mb-8 pb-8 border-b border-gray-100 last:border-0">
              <h2 className="text-xl font-bold text-gray-900 mb-2">第{ch.order}章 {ch.title}</h2>
              {ch.summary && <p className="text-sm text-gray-400 italic mb-4">摘要：{ch.summary}</p>}
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                {ch.content || <span className="text-gray-300">（暂无内容）</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
