import React from 'react';
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
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
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

  return (
    <aside id="erp_sidebar" className="w-64 bg-white text-slate-700 flex flex-col shrink-0 border-r border-slate-200 select-none shadow-xs">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center font-bold text-white shadow-xs">
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 font-bold text-sm tracking-tight leading-none">ERP Nexus</span>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            {organization?.code || 'APEX'} • Unified Engine
          </span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core Modules ({currentRole})
        </div>

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
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
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

      {/* Footer / Active Instance Metadata */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
            Active Instance
          </div>
          <div className="text-xs text-slate-600 font-mono flex items-center justify-between">
            <span>ORG_ID: {user?.org_id || 'APEX-01'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    </aside>
  );
};
