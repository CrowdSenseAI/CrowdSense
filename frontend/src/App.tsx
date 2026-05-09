/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { LayoutDashboard, Target, History, Settings, Bell, ShieldAlert, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import InferencePage from './components/InferencePage';

type Page = 'dashboard' | 'inference' | 'history' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isAlertActive, setIsAlertActive] = useState(false);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '仪表盘' },
    { id: 'inference', icon: Target, label: '实时评估' },
    { id: 'history', icon: History, label: '历史记录' },
    { id: 'settings', icon: Settings, label: '系统设置' },
  ];

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-brand-border bg-brand-bg/50 backdrop-blur-xl flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
            <Cpu size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            CrowdSense AI
          </h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                currentPage === item.id 
                  ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={18} className={cn(
                "transition-colors",
                currentPage === item.id ? "text-accent-blue" : "text-[#8B949E] group-hover:text-white"
              )} />
              {item.label}
              {currentPage === item.id && (
                <motion.div 
                  layoutId="active-pill" 
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8B949E]">
              <span>引擎状态</span>
              <span className="flex items-center gap-1 text-accent-green">
                <span className="w-1 h-1 rounded-full bg-accent-green animate-pulse" />
                就绪
              </span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-[85%] bg-accent-blue rounded-full" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(88,166,255,0.05),transparent_50%)]">
        {/* Header */}
        <header className="h-16 border-bottom border-brand-border px-8 flex items-center justify-between sticky top-0 z-10 bg-brand-bg/80 backdrop-blur-md">
          <div>
            <h2 className="text-sm font-medium text-[#8B949E]">
              {navItems.find(n => n.id === currentPage)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
              <div className="w-2 h-2 rounded-full bg-accent-green" />
              <span>V1.0.4-LTS</span>
            </div>
            <button className="relative p-2 text-[#8B949E] hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full border-2 border-brand-bg shadow-[0_0_8px_rgba(248,81,73,0.4)]" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-blue to-accent-green" />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentPage === 'dashboard' && <Dashboard />}
              {currentPage === 'inference' && <InferencePage />}
              {(currentPage === 'history' || currentPage === 'settings') && (
                <div className="flex flex-col items-center justify-center h-[60vh] text-[#8B949E]">
                  <ShieldAlert size={48} className="mb-4 opacity-20" />
                  <p>该功能正在开发中...</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

