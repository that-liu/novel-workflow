'use client';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">选择你的创作计划</h1>
        <p className="text-xl text-gray-500">从免费开始，随时升级</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <h3 className="text-lg font-bold mb-2">🆓 免费版</h3>
          <div className="text-4xl font-bold mb-4">¥0<span className="text-sm text-gray-400">/月</span></div>
          <ul className="text-sm text-gray-600 space-y-2 mb-6 text-left">
            <li>✅ 3 个项目</li><li>✅ 基础 AI 功能</li><li>✅ 每日 10 次 AI 调用</li><li>❌ 自动写作</li><li>❌ 多 Agent 协作</li>
          </ul>
          <Link href="/" className="block bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200">开始使用</Link>
        </div>
        <div className="bg-gradient-to-b from-indigo-50 to-white border-2 border-indigo-500 rounded-2xl p-8 text-center relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold">推荐</div>
          <h3 className="text-lg font-bold mb-2">⚡ Pro 版</h3>
          <div className="text-4xl font-bold mb-4">¥29<span className="text-sm text-gray-400">/月</span></div>
          <ul className="text-sm text-gray-600 space-y-2 mb-6 text-left">
            <li>✅ 无限项目</li><li>✅ 全部 AI 功能</li><li>✅ 无限 AI 调用</li><li>✅ 自动写作</li><li>✅ 多 Agent 协作</li><li>✅ EPUB/HTML 导出</li><li>✅ 优先支持</li>
          </ul>
          <Link href="/" className="block bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg">升级 Pro</Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <h3 className="text-lg font-bold mb-2">🏢 团队版</h3>
          <div className="text-4xl font-bold mb-4">¥99<span className="text-sm text-gray-400">/月</span></div>
          <ul className="text-sm text-gray-600 space-y-2 mb-6 text-left">
            <li>✅ Pro 全部功能</li><li>✅ 5 人协作</li><li>✅ 共享项目</li><li>✅ 管理后台</li><li>✅ API 接入</li>
          </ul>
          <Link href="/" className="block bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200">联系我们</Link>
        </div>
      </div>
    </div>
  );
}
