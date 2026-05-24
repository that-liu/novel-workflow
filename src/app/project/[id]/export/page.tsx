'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Novel, Chapter } from '@/lib/types';
import { getProject } from '@/lib/storage';
import Link from 'next/link';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);

  useEffect(() => { getProject(id as string).then(setNovel); }, [id]);

  if (!novel) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400 dark:text-gray-500">加载中...</div>;

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

  const generateEpub = useCallback(async () => {
    if (!novel) return;
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // mimetype must be first, stored uncompressed
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // META-INF/container.xml
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    const sortedChapters: Chapter[] = [...novel.chapters].sort((a, b) => a.order - b.order);
    const chapterFiles = sortedChapters.map((ch, i) => {
      const id = `chapter-${i + 1}`;
      const filename = `${id}.xhtml`;
      const htmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(ch.title)}</title>
<link rel="stylesheet" type="text/css" href="stylesheet.css"/></head>
<body>
  <h1>第${ch.order}章 ${escapeXml(ch.title)}</h1>
  ${ch.summary ? `<p class="summary"><em>${escapeXml(ch.summary)}</em></p>` : ''}
  ${ch.content.split('\n').filter(p => p.trim()).map(p => `<p>${escapeXml(p)}</p>`).join('\n  ')}
</body>
</html>`;
      zip.file(`OEBPS/${filename}`, htmlContent);
      return { id, filename, title: ch.title, order: ch.order };
    });

    // content.opf
    const manifestItems = chapterFiles.map((cf, i) =>
      `    <item id="${cf.id}" href="${cf.filename}" media-type="application/xhtml+xml"/>`
    ).join('\n');
    const spineItems = chapterFiles.map(cf =>
      `    <itemref idref="${cf.id}"/>`
    ).join('\n');

    zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(novel.title)}</dc:title>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="BookId">urn:uuid:${uuidv4()}</dc:identifier>
    ${novel.description ? `<dc:description>${escapeXml(novel.description)}</dc:description>` : ''}
    <meta name="cover" content=""/>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="stylesheet.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`);

    // toc.ncx
    const navPoints = chapterFiles.map((cf, i) =>
      `    <navPoint id="${cf.id}" playOrder="${i + 1}">
      <navLabel><text>第${cf.order}章 ${escapeXml(cf.title)}</text></navLabel>
      <content src="${cf.filename}"/>
    </navPoint>`
    ).join('\n');

    zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuidv4()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(novel.title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`);

    // stylesheet.css
    zip.file('OEBPS/stylesheet.css', `body { font-family: Georgia, 'SimSun', serif; line-height: 1.8; padding: 1em; max-width: 600px; margin: 0 auto; }
h1 { text-align: center; font-size: 1.4em; margin-bottom: 1.5em; }
p { text-indent: 2em; margin: 0.5em 0; }
.summary { text-align: center; color: #666; font-style: italic; text-indent: 0; }`);

    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${novel.title}.epub`;
    a.click();
    URL.revokeObjectURL(url);
  }, [novel]);

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
      <Link href={`/project/${id}`} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">← 返回项目</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📦 导出作品</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">预览并下载你的完整小说</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => download(generateMarkdown(), `${novel.title}.md`, 'text/markdown')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700">Markdown</button>
          <button onClick={() => download(generateTxt(), `${novel.title}.txt`, 'text/plain')} className="bg-gray-700 dark:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-800 dark:hover:bg-gray-500">TXT</button>
          <button onClick={() => download(generateHtml(), `${novel.title}.html`, 'text/html')} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-700">HTML</button>
          <button onClick={generateEpub} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-purple-700">📖 EPUB</button>
          <button onClick={() => { navigator.clipboard.writeText(generateTxt()); alert('已复制全文到剪贴板！'); }} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-amber-700">📋 复制全文</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{novel.chapters.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">章节数</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{totalWords.toLocaleString()}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">总字数</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{doneChapters}/{novel.chapters.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">完成章节</div>
        </div>
      </div>

      {sortedChapters.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-3xl mb-2">📄</p>
          <p className="dark:text-gray-400">还没有内容可以预览，先去写点什么吧</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h1 className="text-3xl font-bold text-center mb-2 dark:text-gray-100">{novel.title}</h1>
          {novel.description && <p className="text-center text-gray-500 dark:text-gray-400 mb-6 italic">{novel.description}</p>}
          {sortedChapters.map(ch => (
            <div key={ch.id} className="mb-8 pb-8 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">第{ch.order}章 {ch.title}</h2>
              {ch.summary && <p className="text-sm text-gray-400 dark:text-gray-500 italic mb-4">摘要：{ch.summary}</p>}
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-serif">
                {ch.content || <span className="text-gray-300 dark:text-gray-600">（暂无内容）</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
