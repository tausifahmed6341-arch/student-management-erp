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
  CheckCircle2,
  Receipt,
  CreditCard,
  Radio,
  FileText,
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  return (
    <div id="erp_dashboard_view" className="space-y-6">
      {/* Top Banner Greeting - Flat Monochrome */}
      <div className="bg-[#09090b] rounded-2xl p-6 text-white shadow-md border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {organization?.name || 'Apex Institute of Technology'}
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-200 px-2 py-0.5 rounded font-mono border border-zinc-700">
              {organization?.code || 'APEX'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight">Welcome back, {user?.name}!</h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isAdmin && 'All university databases, academic engines, and biometric terminals are operational.'}
            {isFaculty && 'Manage your assigned batch schedules, syllabus hour progress, and student attendance.'}
            {isStudent && `Roll No: ${data?.profile?.roll_number || '24CS001'} • ${data?.batch?.name || 'CSE Class of 2024'} • Semester ${data?.batch?.current_semester || 5}`}
          </p>
        </div>

        {/* Quick Actions - Flat Crisp Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={() => onNavigate('org_setup')}
              className="px-3.5 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Building className="w-3.5 h-3.5" />
              Organization Setup
            </button>
          )}
          {isFaculty && (
            <button
              onClick={() => onNavigate('attendance')}
              className="px-3.5 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              Mark Attendance
            </button>
          )}
          {isStudent && (
            <button
              onClick={() => onNavigate('timetable')}
              className="px-3.5 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              My Timetable
            </button>
          )}
          <button
            onClick={() => onNavigate('system_tests')}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-zinc-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            Layer 8 Tests
          </button>
        </div>
      </div>

      {/* ADMIN DASHBOARD VIEW */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Total Enrolled</span>
                <GraduationCap className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {data?.metrics?.totalStudents || 100}
              </div>
              <div className="mt-2 flex items-center text-xs text-emerald-700 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                Active Multi-Tenant Partitions
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Faculty Members</span>
                <BookOpen className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {data?.metrics?.totalFaculty || 10}
              </div>
              <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-black h-1.5 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Collected Fees</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900">
                ${data?.metrics?.totalFeeCollected?.toLocaleString() || '185,500'}
              </div>
              <div className="mt-2 flex items-center text-xs text-slate-500 font-medium">
                Sem 5 collections reconciled
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Biometric Gates</span>
                <Clock className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {data?.metrics?.biometricDevicesOnline || 4} Online
              </div>
              <div className="mt-2 flex items-center text-xs text-emerald-700 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                WebSocket hardware stream active
              </div>
            </div>
          </div>

          {/* Admin System Infrastructure & Operations Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-900" />
                  Academic Operations & Collision Engine
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                  Layer 4 & 6 Active
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div
                  onClick={() => onNavigate('timetable')}
                  className="p-4 bg-slate-50 rounded-lg flex flex-col justify-between hover:border-black transition-colors cursor-pointer border border-slate-200 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-slate-900 group-hover:text-black transition-colors">
                        Timetable Collision Engine
                      </p>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-black" />
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      Prevent Room, Faculty, & Batch double-bookings with instant HTTP 409 rollback guards.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-900 font-semibold">
                    Open Schedule Matrix →
                  </div>
                </div>

                <div
                  onClick={() => onNavigate('biometrics')}
                  className="p-4 bg-slate-50 rounded-lg flex flex-col justify-between hover:border-black transition-colors cursor-pointer border border-slate-200 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-slate-900 group-hover:text-black transition-colors">
                        Biometric Hardware Bridge
                      </p>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-black" />
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      Simulate optical RFID punches and broadcast to tenant socket rooms in real-time.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-900 font-semibold">
                    Open Hardware Simulator →
                  </div>
                </div>
              </div>
            </div>

            {/* Geometric Dark System Widget */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-6 text-zinc-300 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    System Daemon Status
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">ERP_NODE_01</span>
                </div>
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="border-l-2 border-emerald-500 pl-3 py-1 bg-zinc-900/60 rounded-r">
                    <p className="text-white font-bold">PostgreSQL 15 Partition</p>
                    <p className="text-zinc-400 text-[10px]">RLS Multi-Tenant Enforced</p>
                  </div>
                  <div className="border-l-2 border-zinc-400 pl-3 py-1 bg-zinc-900/60 rounded-r">
                    <p className="text-white font-bold">WebSocket Event Channel</p>
                    <p className="text-zinc-400 text-[10px]">Room: org_{user?.org_id}</p>
                  </div>
                  <div className="border-l-2 border-amber-500 pl-3 py-1 bg-zinc-900/60 rounded-r">
                    <p className="text-white font-bold">Syllabus Velocity Tracker</p>
                    <p className="text-zinc-400 text-[10px]">Regression Model Active</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('system_tests')}
                className="mt-4 w-full py-2 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
          {/* Critical Warning Alert if Attendance is <75% */}
          {data?.isCriticalAttendance && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">Academic Warning: Low Attendance Deficit</h4>
                <p className="text-xs mt-0.5 leading-relaxed">
                  Your cumulative attendance is currently <span className="font-bold text-rose-600">{data?.attendancePercentage}%</span> ({data?.attendedClasses}/{data?.totalClasses} classes). University policy requires a minimum of 75% to sit for end-semester examinations.
                </p>
              </div>
            </div>
          )}

          {/* Student KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Overall Attendance</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-3xl font-extrabold ${data?.attendancePercentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {data?.attendancePercentage ?? 88}%
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({data?.attendedClasses || 0}/{data?.totalClasses || 0} sessions)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${data?.attendancePercentage >= 75 ? 'bg-emerald-600' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, data?.attendancePercentage || 88)}%` }}
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Academic Standing</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {data?.academicStatus?.gpa || '8.85'} <span className="text-xs font-normal text-slate-500">GPA</span>
              </div>
              <span className="text-xs text-emerald-700 font-semibold mt-1 block">
                Rank #{data?.academicStatus?.rank || 1} • {data?.academicStatus?.standing || 'Top 10%'}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Current Semester</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                Semester {data?.batch?.current_semester || 5}
              </div>
              <span className="text-xs text-slate-500 mt-1 block truncate">
                {data?.batch?.name || 'CSE Section A'}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Bursar Ledger</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                ${data?.feeStatus?.pendingBalance?.toLocaleString() ?? 0}
              </div>
              <span className={`text-xs font-semibold mt-1 block ${
                data?.feeStatus?.pendingBalance > 0 ? 'text-amber-600' : 'text-emerald-700'
              }`}>
                {data?.feeStatus?.pendingBalance > 0 ? '⚠️ Outstanding Dues' : '✓ Fees Cleared'}
              </span>
            </div>
          </div>

          {/* Student Schedule Matrix & Subject Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Timetable Preview */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-900" />
                  Upcoming Class Schedule
                </h3>
                <button
                  onClick={() => onNavigate('timetable')}
                  className="text-xs text-slate-900 hover:underline font-semibold cursor-pointer"
                >
                  Full Weekly Grid →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {data?.timetable?.slice(0, 6).map((slot: any) => (
                  <div
                    key={slot.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 hover:border-black transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900">{slot.day_of_week}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{slot.start_time} - {slot.end_time}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{slot.subject?.name}</h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {slot.classroom?.room_number} • {slot.faculty?.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions & Profile Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-900" />
                  Student Quick Hub
                </h3>
                <div className="space-y-2 text-xs">
                  <button
                    onClick={() => onNavigate('attendance')}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 font-semibold text-slate-800 text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>View Attendance Logs</span>
                    <span>→</span>
                  </button>
                  <button
                    onClick={() => onNavigate('performance')}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 font-semibold text-slate-800 text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>View Academic Grades & GPA</span>
                    <span>→</span>
                  </button>
                  <button
                    onClick={() => onNavigate('fees')}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 font-semibold text-slate-800 text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Bursar Portal & Receipts</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>RFID Biometric ID:</span>
                  <span className="font-mono font-bold text-slate-800">{data?.profile?.biometric_id || 'BIO-RFID-24CS001'}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Admitted:</span>
                  <span className="text-slate-800 font-medium">{data?.profile?.admission_date || '2022-08-15'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FACULTY DASHBOARD VIEW */}
      {isFaculty && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Weekly Classes</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {data?.schedule?.length || 4} Sessions
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Assigned lecture & lab hours</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Assigned Batches</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {data?.assignedBatches?.length || 2} Batches
              </div>
              <span className="text-xs text-slate-500 mt-1 block">CSE Class of 2024</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Syllabus Completion</span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-2">68%</div>
              <span className="text-xs text-slate-500 mt-1 block">Interactive tracking enabled</span>
            </div>
          </div>

          {/* Assigned Classes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Your Teaching Schedule</h3>
            <div className="space-y-2.5">
              {data?.schedule?.map((slot: any) => (
                <div
                  key={slot.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 mr-2">{slot.day_of_week} ({slot.start_time} - {slot.end_time})</span>
                    <span className="font-bold text-slate-900">{slot.subject?.name}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Batch: {slot.batch?.name} • Room: {slot.classroom?.room_number}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('attendance')}
                    className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
