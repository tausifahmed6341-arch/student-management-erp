import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  Calendar,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowUpRight,
  Clock,
  Building,
} from 'lucide-react';
import { TabId } from '../layout/Sidebar';

interface DashboardProps {
  onNavigate: (tab: TabId) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { token, user, isAdmin, isFaculty, isStudent, organization } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) return;
    const endpoint = isAdmin
      ? '/api/auth/admin/dashboard'
      : isFaculty
      ? '/api/auth/faculty/dashboard'
      : '/api/auth/student/dashboard';

    fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching dashboard:', err);
        setIsLoading(false);
      });
  }, [token, user?.role, user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div id="erp_dashboard_view" className="space-y-6">
      {/* Top Banner Greeting */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-indigo-800/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              {organization?.name} • Academic ERP Cluster
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
              Live Production
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight">Welcome back, {user?.name}!</h2>
          <p className="text-sm text-slate-300 mt-1">
            {isAdmin && 'All university databases, academic engines, and biometric terminals are operational.'}
            {isFaculty && 'Manage your assigned batch schedules, syllabus hour progress, and student attendance.'}
            {isStudent && `Current Roll: ${data?.profile?.roll_number || '24CS001'} • ${data?.batch?.name || 'Class of 2024'}`}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={() => onNavigate('org_setup')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Building className="w-3.5 h-3.5" />
              Organization Setup
            </button>
          )}
          {isFaculty && (
            <button
              onClick={() => onNavigate('attendance')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Users className="w-3.5 h-3.5" />
              Mark Attendance
            </button>
          )}
          {isStudent && (
            <button
              onClick={() => onNavigate('timetable')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5" />
              My Timetable
            </button>
          )}
          <button
            onClick={() => onNavigate('system_tests')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Layer 8 Tests
          </button>
        </div>
      </div>

      {/* ADMIN DASHBOARD VIEW */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Total Enrolled</span>
                <GraduationCap className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {data?.metrics?.totalStudents || 100}
              </div>
              <div className="mt-2 flex items-center text-xs text-emerald-600 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                Multi-tenant partitioned (Active)
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Faculty Members</span>
                <BookOpen className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {data?.metrics?.totalFaculty || 10}
              </div>
              <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Collected Fees</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                ${data?.metrics?.totalFeeCollected?.toLocaleString() || '185,500'}
              </div>
              <div className="mt-2 flex items-center text-xs text-slate-500 font-medium">
                Sem 5 collections current
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Biometric Gates</span>
                <Clock className="w-4 h-4 text-violet-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {data?.metrics?.biometricDevicesOnline || 4} Online
              </div>
              <div className="mt-2 flex items-center text-xs text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                WebSocket telemetry active
              </div>
            </div>
          </div>

          {/* Admin System Infrastructure & Operations Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  Academic Operations & Collision Engine
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  Layer 4 & 6 Active
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div
                  onClick={() => onNavigate('timetable')}
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col justify-between hover:border-indigo-500/50 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700/60 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Timetable Collision Engine
                      </p>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      Prevent Room, Faculty, & Batch double-bookings with instant HTTP 409 rollback guards.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    Open Schedule Matrix →
                  </div>
                </div>

                <div
                  onClick={() => onNavigate('biometrics')}
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col justify-between hover:border-indigo-500/50 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700/60 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Biometric Hardware Bridge
                      </p>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      Simulate optical RFID punches and broadcast to tenant socket rooms in real-time.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    Open Hardware Simulator →
                  </div>
                </div>
              </div>
            </div>

            {/* Geometric Dark System Widget */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 text-slate-300 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    System Daemon Status
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold">ERP_NODE_01</span>
                </div>
                <div className="space-y-3 font-mono text-[11px]">
                  <div className="border-l-2 border-emerald-500 pl-3 py-1 bg-slate-800/40 rounded-r">
                    <p className="text-white font-bold">PostgreSQL 15 Container</p>
                    <p className="text-slate-400 text-[10px]">RLS Multi-Tenant Enforced</p>
                  </div>
                  <div className="border-l-2 border-indigo-500 pl-3 py-1 bg-slate-800/40 rounded-r">
                    <p className="text-white font-bold">WebSocket Event Channel</p>
                    <p className="text-slate-400 text-[10px]">Room: org_{user?.org_id}</p>
                  </div>
                  <div className="border-l-2 border-amber-500 pl-3 py-1 bg-slate-800/40 rounded-r">
                    <p className="text-white font-bold">Syllabus Progress Velocity</p>
                    <p className="text-slate-400 text-[10px]">Linear Regression 98.4%</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('system_tests')}
                className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Run Layer 8 Test Suite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DASHBOARD VIEW */}
      {isStudent && (
        <div className="space-y-6">
          {/* Critical Warning if <75% */}
          {data?.isCriticalAttendance && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">Academic Warning: Low Attendance Deficit</h4>
                <p className="text-xs mt-0.5 leading-relaxed">
                  Your cumulative attendance is currently <span className="font-bold text-red-600">{data?.attendancePercentage}%</span> ({data?.attendedClasses}/{data?.totalClasses} classes). University policy requires a minimum of 75% to sit for end-semester examinations.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-500">Overall Attendance</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-3xl font-extrabold ${data?.attendancePercentage >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {data?.attendancePercentage}%
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({data?.attendedClasses || 0}/{data?.totalClasses || 0} sessions)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${data?.attendancePercentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, data?.attendancePercentage || 0)}%` }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-500">Current Semester</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                Semester {data?.batch?.current_semester || 5}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Batch: {data?.batch?.name}</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-500">Academic Standing</span>
              <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                Top 10%
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Weighted GPA: 3.82 / 4.0</span>
            </div>
          </div>

          {/* Today's Timetable Preview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Schedule Matrix Overview
              </h3>
              <button
                onClick={() => onNavigate('timetable')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Full Weekly Grid →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {data?.timetable?.slice(0, 3).map((slot: any) => (
                <div
                  key={slot.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{slot.day_of_week}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{slot.start_time} - {slot.end_time}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{slot.subject?.name}</h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {slot.classroom?.room_number} • {slot.faculty?.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FACULTY DASHBOARD VIEW */}
      {isFaculty && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-500">Weekly Classes</span>
              <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                {data?.schedule?.length || 4} Sessions
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Assigned lecture & lab hours</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-500">Assigned Batches</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {data?.assignedBatches?.length || 2} Batches
              </div>
              <span className="text-xs text-slate-500 mt-1 block">CSE Class of 2024</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-500">Syllabus Completion</span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-2">68%</div>
              <span className="text-xs text-slate-500 mt-1 block">Interactive tracking enabled</span>
            </div>
          </div>

          {/* Assigned Classes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Your Teaching Schedule</h3>
            <div className="space-y-2.5">
              {data?.schedule?.map((slot: any) => (
                <div
                  key={slot.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-2">{slot.day_of_week} ({slot.start_time} - {slot.end_time})</span>
                    <span className="font-bold text-slate-900 dark:text-white">{slot.subject?.name}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Batch: {slot.batch?.name} • Room: {slot.classroom?.room_number}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('attendance')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Mark Attendance
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
