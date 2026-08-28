import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  GraduationCap,
  TrendingUp,
  BookOpen,
  Printer,
  Sparkles,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const PerformanceView: React.FC = () => {
  const { token, user, studentProfile, isAdmin, isFaculty } = useAuth();
  const [performance, setPerformance] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Student selection for Admin / Faculty
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    if (!token || (!isAdmin && !isFaculty)) return;
    fetch('/api/attendance/batch/batch_cse_2024_a', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.students) {
          setAllStudents(data.students);
        }
      })
      .catch(console.error);
  }, [token, isAdmin, isFaculty]);

  const fetchPerformance = async (targetId?: string) => {
    if (!token) return;
    const stuId = targetId || selectedStudentId || studentProfile?.id || (user?.student_profile_id) || 'prof_stu_1';

    try {
      const [perfRes, aiRes] = await Promise.all([
        fetch(`/api/grades/student/${stuId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/ai/analyze-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ student_id: stuId }),
        }),
      ]);

      if (perfRes.ok) {
        setPerformance(await perfRes.json());
        setSelectedStudentId(stuId);
      }
      if (aiRes.ok) {
        setAiAnalysis(await aiRes.json());
      }
    } catch (e) {
      console.error('Error fetching academic performance:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [token, studentProfile?.id, user?.id]);

  const chartData = performance?.subjectResults?.map((s: any) => ({
    name: s.subject_name.length > 14 ? s.subject_name.substring(0, 12) + '...' : s.subject_name,
    fullName: s.subject_name,
    score: s.percentage,
    gpa: s.grade_point * 10,
  })) || [];

  return (
    <div id="erp_performance_view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Academic Performance & GPA Engine</h2>
          <p className="text-xs text-slate-500">
            Weighted semester GPA, batch class rankings, credit point accumulation, and transcript previews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || isFaculty) && allStudents.length > 0 && (
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                fetchPerformance(e.target.value);
              }}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            >
              {allStudents.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.roll_number} - {s.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Official Transcript
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500">Cumulative GPA (10-Pt Scale)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {performance?.gpa || '8.85'}
            </span>
            <span className="text-xs text-slate-500">/ 10.00 (3.82 US)</span>
          </div>
          <span className="text-xs text-emerald-700 font-semibold mt-1 inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> First Class with Distinction
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500">Cohort Class Rank</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            Rank #{performance?.rank || 1}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Out of {performance?.totalBatchStudents || 25} enrolled peers
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500">Earned Academic Credits</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {performance?.totalCredits || 13} Credits
          </div>
          <span className="text-xs text-emerald-700 font-semibold mt-1 block">
            ✓ 100% Course Load Cleared
          </span>
        </div>
      </div>

      {/* AI Academic Diagnostic Card */}
      {aiAnalysis && (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-900" />
              <h3 className="text-xs font-bold text-slate-900">
                AI Academic Diagnostic: {aiAnalysis.student_name} ({aiAnalysis.roll_number})
              </h3>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
              aiAnalysis.riskLevel === 'LOW' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {aiAnalysis.riskLevel} Retention Risk
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
            {aiAnalysis.analysis}
          </p>
        </div>
      )}

      {/* Recharts Performance Visualizer - Flat Monochrome */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-900" />
          Course Mastery & Assessment Percentage
        </h3>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-2.5 bg-black text-white rounded-lg text-xs shadow-lg">
                        <p className="font-bold">{data.fullName}</p>
                        <p className="text-emerald-400 mt-1">Score: {data.score}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="score" fill="#18181b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject Grades & Transcript Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-900" />
            Semester 5 Grade Ledger
          </h3>
          <span className="text-xs text-slate-500 font-mono">Grading Scheme: 10-Point Relative</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Subject Name</th>
                <th className="py-2.5 px-3 text-center">Credits</th>
                <th className="py-2.5 px-3 text-center">Score %</th>
                <th className="py-2.5 px-3 text-center">Grade Point</th>
                <th className="py-2.5 px-3 text-center">Letter Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {performance?.subjectResults?.map((sub: any) => (
                <tr key={sub.subject_id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-bold text-slate-900">{sub.subject_name}</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-700">{sub.credits}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900">
                    {sub.percentage}%
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                    {sub.grade_point}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-900 border border-slate-300 font-mono">
                      {sub.letter_grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
