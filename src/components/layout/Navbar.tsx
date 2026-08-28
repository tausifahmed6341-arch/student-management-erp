import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Bell,
  CheckCheck,
  Shield,
  GraduationCap,
  BookOpen,
  Wifi,
  WifiOff,
  LogOut,
  Building,
  LogIn,
  AlertTriangle,
} from 'lucide-react';
import { LoginView } from '../auth/LoginView';

export const Navbar: React.FC = () => {
  const { user, organization, logout, quickSwitchUser } = useAuth();
  const { isConnected, notifications, unreadNotifsCount, markAsRead, markAllAsRead } = useSocket();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const getRoleIcon = (role?: string) => {
    if (role === 'super_admin') return <Shield className="w-3.5 h-3.5 text-zinc-900" />;
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-zinc-700" />;
    if (role === 'faculty') return <BookOpen className="w-3.5 h-3.5 text-emerald-700" />;
    return <GraduationCap className="w-3.5 h-3.5 text-zinc-800" />;
  };

  const getRoleBadgeColor = (role?: string) => {
    if (role === 'super_admin') return 'bg-zinc-900 text-white border-zinc-800';
    if (role === 'admin') return 'bg-zinc-100 text-zinc-900 border-zinc-300';
    if (role === 'faculty') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    return 'bg-zinc-100 text-zinc-800 border-zinc-300';
  };

  const handleDemoSwitch = async (role: 'superAdmin' | 'admin' | 'teacher' | 'student') => {
    let email = 'admin@apextech.edu';
    if (role === 'superAdmin') email = 'superadmin@nexus.edu';
    if (role === 'admin') email = 'admin@apextech.edu';
    if (role === 'teacher') email = 'alan.turing@apextech.edu';
    if (role === 'student') email = 'student1@apextech.edu';

    await quickSwitchUser({ email, org_id: 'org_apex' });
  };

  return (
    <>
      <header id="erp_navbar" className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs select-none">
        {/* Left: ERP Nexus Brand Hero */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-white shadow-xs font-bold">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 tracking-tight">
                ERP Nexus
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {organization?.code || 'APEX'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              Unified Student Management Platform
            </p>
          </div>
        </div>

        {/* Center: 4 Quick Demo Role Pills - Sleek Flat Black & White */}
        <div className="hidden xl:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">
            Demo:
          </span>

          <button
            id="nav_demo_super_admin"
            type="button"
            onClick={() => handleDemoSwitch('superAdmin')}
            className={`py-1 px-3 rounded-lg text-xs font-semibold transition cursor-pointer border ${
              user?.role === 'super_admin'
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Super-Admin
          </button>

          <button
            id="nav_demo_admin"
            type="button"
            onClick={() => handleDemoSwitch('admin')}
            className={`py-1 px-3 rounded-lg text-xs font-semibold transition cursor-pointer border ${
              user?.role === 'admin'
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Admin
          </button>

          <button
            id="nav_demo_teacher"
            type="button"
            onClick={() => handleDemoSwitch('teacher')}
            className={`py-1 px-3 rounded-lg text-xs font-semibold transition cursor-pointer border ${
              user?.role === 'faculty'
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Teacher
          </button>

          <button
            id="nav_demo_student"
            type="button"
            onClick={() => handleDemoSwitch('student')}
            className={`py-1 px-3 rounded-lg text-xs font-semibold transition cursor-pointer border ${
              user?.role === 'student'
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Student
          </button>
        </div>

        {/* Right Controls: WebSocket, Notifications, Profile & Switch Modal */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Quick Login / Switch Modal Button */}
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-black text-white border border-slate-800 transition cursor-pointer shadow-xs"
            title="Open ERP Nexus Login View"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign In Portal</span>
          </button>

          {/* Real-time Socket Indicator */}
          <div
            title={isConnected ? 'Real-time WebSocket connection active (socket.io)' : 'Disconnected from real-time events'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden lg:inline">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-500" />
                <span className="hidden lg:inline">Connecting</span>
              </>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              id="navbar_notifications_btn"
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-bounce">
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                    {unreadNotifsCount > 0 && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 px-1.5 py-0.5 rounded-full font-semibold">
                        {unreadNotifsCount} new
                      </span>
                    )}
                  </div>
                  {unreadNotifsCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-xs text-slate-900 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                          !n.is_read ? 'bg-slate-100/60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            {n.type === 'low_attendance' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                            <h5 className="text-xs font-bold text-slate-900 leading-snug">{n.title}</h5>
                          </div>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-black shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Role Indicator */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              {getRoleIcon(user?.role)}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">{user?.name}</p>
              <div className="flex items-center gap-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${getRoleBadgeColor(user?.role)}`}>
                  {getRoleIcon(user?.role)}
                  <span className="capitalize">{user?.role?.replace('_', ' ')}</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Auth Modal when triggered */}
      {showAuthModal && (
        <LoginView isModal onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
};

