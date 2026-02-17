'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: '📊' },
  { href: '/volume', label: 'Volume & Métricas', icon: '📈' },
  { href: '/engagement', label: 'Engajamento', icon: '🔄' },
  { href: '/users', label: 'Usuários', icon: '👥' },
  { href: '/content', label: 'Conteúdo', icon: '📚' },
  { href: '/performance', label: 'Performance', icon: '⚡' },
  { href: '/csat', label: 'CSAT', icon: '⭐' },
  { href: '/patterns', label: 'Padrões', icon: '🕐' },
  { href: '/referral', label: 'Referral', icon: '🤝' },
  { href: '/rag', label: 'Base RAG', icon: '🧠' },
  { href: '/support', label: 'Suporte', icon: '🔧' },
  { href: '/ai-sql', label: 'IA SQL', icon: '🤖' },
  { href: '/errors', label: 'Monitor N8N', icon: '⚠️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-3 left-3 z-50 bg-white shadow rounded-lg p-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setCollapsed(true)} />
      )}

      <aside className={`fixed left-0 top-0 h-full bg-gray-900 text-white z-40 transition-transform duration-200 w-56 ${collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}`}>
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">Medbrain</h1>
          <p className="text-xs text-gray-400">Analytics Dashboard</p>
        </div>
        <nav className="py-2 overflow-y-auto h-[calc(100vh-72px)]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setCollapsed(true)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
