import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  CalendarDays,
  UserCheck2,
  CreditCard,
  Award,
  Radio,
  TestTube2,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type TabId =
  | 'dashboard'
  | 'org_setup'
  | 'syllabus'
  | 'timetable'
  | 'attendance'
  | 'fees'
  | 'performance'
  | 'biometrics'
  | 'system_tests';

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCollapsed = false, onToggleCollapse }) => {
  const { user, organization } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as TabId,
      label: 'Institutional Overview',
      icon: LayoutDashboard,
      roles: ['super_admin', 'admin', 'faculty', 'student'],
    },
    {
      id: 'org_setup' as TabId,
      label: 'Organization Setup',
      icon: Building2,
      roles: ['super_admin', 'admin'],
    },
    {
      id: 'syllabus' as TabId,
      label: 'Academics',
      icon: BookOpen,
      roles: ['super_admin', 'admin', 'faculty', 'student'],
    },
    {
      id: 'timetable' as TabId,
      label: 'Academic Schedule',
      icon: CalendarDays,
      roles: ['super_admin', 'admin', 'faculty', 'student'],
    },
    {
      id: 'attendance' as TabId,
      label: 'Attendance & Logs',
      icon: UserCheck2,
      roles: ['super_admin', 'admin', 'faculty', 'student'],
      badge: 'Real-time',
    },
    {
      id: 'fees' as TabId,
      label: 'Financial Ledger',
      icon: CreditCard,
      roles: ['super_admin', 'admin', 'student'],
    },
    {
      id: 'performance' as TabId,
      label: 'Academic Performance',
      icon: Award,
      roles: ['super_admin', 'admin', 'faculty', 'student'],
      badge: 'GPA/Rank',
    },
    {
      id: 'biometrics' as TabId,
      label: 'Biometrics',
      icon: Radio,
      roles: ['super_admin', 'admin', 'faculty', 'student'],
    },
  ];

  const currentRole = user?.role || 'student';
  const visibleNavItems = navItems.filter((item) => item.roles.includes(currentRole));

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

  return (
    <aside
      id="erp_sidebar"
      className={`${sidebarWidth} bg-white text-slate-700 flex flex-col shrink-0 border-r border-slate-200 select-none shadow-xs fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out`}
      style={{ height: 'calc(100vh - 4rem)', top: '4rem' }}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center font-bold text-white shadow-xs flex-shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-slate-900 font-bold text-sm tracking-tight leading-none whitespace-nowrap">ERP Nexus</span>
            <span className="text-[10px] text-slate-500 font-mono mt-1 whitespace-nowrap">
              {organization?.code || 'APEX'}
            </span>
          </div>
        )}

        {/* Collapse/Expand Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation list */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Core Modules ({currentRole})
          </div>
        )}

        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`sidebar_tab_${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full p-2.5 rounded-lg flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-black text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-700'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'} flex-shrink-0`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>
              {!isCollapsed && item.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                  isActive ? 'bg-zinc-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
