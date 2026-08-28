import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  UserCheck2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Radio,
  BookOpen,
  Filter,
} from 'lucide-react';
import type { Batch, Subject } from '../../types';

export const AttendanceView: React.FC = () => {
  const { token, user, isStudent, isFaculty, isAdmin, studentProfile } = useAuth();
  const { isConnected } = useSocket();

  // Faculty State
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Student State
  const [studentStats, setStudentStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial dropdowns
  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch('/api/org/batches', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/academic/subjects', { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([bRes, sRes]) => {
        if (bRes.ok) {
          const b = await bRes.json();
          setBatches(b);
          if (b.length > 0 && !selectedBatchId) setSelectedBatchId(b[0].id);
        }
        if (sRes.ok) {
          const s = await sRes.json();
          setSubjects(s);
          if (s.length > 0 && !selectedSubjectId) setSelectedSubjectId(s[0].id);
        }
      })
      .catch(console.error);
  }, [token]);

  // Load Faculty Batch Student Checklist
  const fetchBatchChecklist = async () => {
    if (!token || !selectedBatchId) return;
    try {
      const res = await fetch(`/api/attendance/batch/${selectedBatchId}?date=${attendanceDate}&subject_id=${selectedSubjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudentList(data.students || []);
      }
    } catch (e) {
      console.error('Error loading student checklist:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Student Stats
  const fetchStudentData = async () => {
    const stuId = studentProfile?.id || 'stu_alan_24CS001';
    if (!token || !stuId) return;
    try {
      const res = await fetch(`/api/attendance/student/${stuId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudentStats(data);
      }
    } catch (e) {
      console.error('Error fetching student stats:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isStudent) {
      fetchStudentData();
    } else if (selectedBatchId) {
      fetchBatchChecklist();
    }
  }, [token, isStudent, selectedBatchId, selectedSubjectId, attendanceDate]);

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    setStudentList((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  const handleMarkAll = (status: 'Present' | 'Absent') => {
    setStudentList((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedBatchId || !selectedSubjectId || !attendanceDate) return;
    setIsSubmitting(true);
    setSubmitSuccess(null);

    const records = studentList.map((s) => ({
      student_id: s.student_id,
      status: s.status,
    }));

    try {
      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          batch_id: selectedBatchId,
          subject_id: selectedSubjectId,
          date: attendanceDate,
          records,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setSubmitSuccess(json.message);
        fetchBatchChecklist();
      }
    } catch (e) {
      console.error('Failed to submit attendance:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="erp_attendance_view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Attendance & Attendance Logs</h2>
          <p className="text-xs text-slate-500">
            Automated session verification, 75% threshold governance, and biometric hardware streaming.
          </p>
        </div>
      </div>

      {/* STUDENT VIEW */}
      {isStudent && (
        <div className="space-y-6">
          {/* Critical 75% Warning Flag */}
          {studentStats?.is_critical && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">Eligibility Notice: Attendance Below 75%</h4>
                <p className="text-xs mt-0.5 leading-relaxed">
                  Your overall attendance is <span className="font-bold text-red-600">{studentStats?.overallPercentage}%</span>. Remedial classes are required to maintain final exam permit validation.
                </p>
              </div>
            </div>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Overall Attendance</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-3xl font-extrabold ${studentStats?.overallPercentage >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {studentStats?.overallPercentage || 100}%
                </span>
                <span className="text-xs text-slate-500">
                  ({studentStats?.attendedCount || 0}/{studentStats?.totalLogs || 0} sessions)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${studentStats?.overallPercentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${studentStats?.overallPercentage || 100}%` }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Exam Eligibility</span>
              <div className="text-2xl font-bold mt-2">
                {studentStats?.overallPercentage >= 75 ? (
                  <span className="text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle className="w-5 h-5" /> Eligible
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-5 h-5" /> At Risk
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 mt-2 block">Policy: Mandatory 75% minimum</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Biometric Sync</span>
              <div className="text-2xl font-bold text-indigo-600 mt-2 flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-600 animate-pulse" />
                Active
              </div>
              <span className="text-xs text-slate-500 mt-2 block">Terminal check-ins stream live</span>
            </div>
          </div>

          {/* Subject-Wise Attendance Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Subject-Wise Attendance Breakdown
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3 text-center">Attended / Total</th>
                    <th className="py-2.5 px-3 text-center">Percentage</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {studentStats?.subjectBreakdown?.map((sub: any) => (
                    <tr key={sub.subject_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{sub.subject_name}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{sub.subject_code}</td>
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">
                        {sub.attended_classes} / {sub.total_classes}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span className={sub.percentage >= 75 ? 'text-emerald-600' : 'text-amber-600'}>
                          {sub.percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            sub.percentage >= 75
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {sub.percentage >= 75 ? 'Normal' : 'Critical (<75%)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FACULTY / ADMIN BULK MARKING CHECKLIST */}
      {(isFaculty || isAdmin) && (
        <div className="space-y-5">
          {/* Controls bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Session Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Quick Mark Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Quick Actions:</span>
              <button
                onClick={() => handleMarkAll('Present')}
                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                ✓ Mark All Present
              </button>
              <button
                onClick={() => handleMarkAll('Absent')}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                ✗ Mark All Absent
              </button>
            </div>

            <button
              onClick={handleSubmitAttendance}
              disabled={isSubmitting || studentList.length === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : `Save Attendance (${studentList.length} Students)`}
            </button>
          </div>

          {submitSuccess && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {/* Student Roster Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center">Cumulative %</th>
                  <th className="py-3 px-4 text-center">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {studentList.map((stu) => {
                  const isPresent = stu.status === 'Present';
                  const isAbsent = stu.status === 'Absent';
                  const isLate = stu.status === 'Late';

                  return (
                    <tr key={stu.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {stu.roll_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {stu.name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold ${
                            stu.cumulative_attendance >= 75 ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {stu.cumulative_attendance}%
                        </span>
                        {stu.cumulative_attendance < 75 && (
                          <span className="ml-1 text-[10px] text-amber-500" title="Attendance below 75%">⚠️</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(stu.student_id, 'Present')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(stu.student_id, 'Late')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isLate
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(stu.student_id, 'Absent')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isAbsent
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
