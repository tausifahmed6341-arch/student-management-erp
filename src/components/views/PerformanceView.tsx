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
  const { token, user, studentProfile } = useAuth();
  const [performance, setPerformance] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPerformance = async () => {
    if (!token) return;
    const studentId = studentProfile?.id || (user?.role === 'student' ? 'stu_alan_24CS001' : 'stu_alan_24CS001');

    try {
      const [perfRes, aiRes] = await Promise.all([
        fetch(`/api/grades/student/${studentId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/ai/analyze-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ student_id: studentId }),
        }),
      ]);

      if (perfRes.ok) {
        setPerformance(await perfRes.json());
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Academic Performance & GPA Engine</h2>
          <p className="text-xs text-slate-500">
            Weighted semester GPA, batch class rankings, credit point accumulation, and transcript previews.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Official Transcript
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500">Cumulative GPA (10-Pt Scale)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {performance?.gpa || '8.85'}
            </span>
            <span className="text-xs text-slate-500">/ 10.00 (3.82 US)</span>
          </div>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> First Class with Distinction
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500">Cohort Class Rank</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            Rank #{performance?.rank || 1}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Out of {performance?.totalBatchStudents || 25} enrolled peers
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500">Earned Academic Credits</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {performance?.totalCredits || 13} Credits
          </div>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">
            ✓ 100% Course Load Cleared
          </span>
        </div>
      </div>

      {/* AI Academic Diagnostic Card */}
      {aiAnalysis && (
        <div className="p-5 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/80 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                AI Academic Diagnostic: {aiAnalysis.student_name} ({aiAnalysis.roll_number})
              </h3>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              aiAnalysis.riskLevel === 'LOW' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'
            }`}>
              {aiAnalysis.riskLevel} Retention Risk
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {aiAnalysis.analysis}
          </p>
        </div>
      )}

      {/* Recharts Performance Visualizer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
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
                      <div className="p-2.5 bg-slate-900 text-white rounded-lg text-xs shadow-lg">
                        <p className="font-bold">{data.fullName}</p>
                        <p className="text-emerald-400 mt-1">Score: {data.score}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="score" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject Grades & Transcript Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Semester 5 Grade Ledger
          </h3>
          <span className="text-xs text-slate-400 font-mono">Grading Scheme: 10-Point Relative</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Subject Name</th>
                <th className="py-2.5 px-3 text-center">Credits</th>
                <th className="py-2.5 px-3 text-center">Score %</th>
                <th className="py-2.5 px-3 text-center">Grade Point</th>
                <th className="py-2.5 px-3 text-center">Letter Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {performance?.subjectResults?.map((sub: any) => (
                <tr key={sub.subject_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{sub.subject_name}</td>
                  <td className="py-3 px-3 text-center font-mono">{sub.credits}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                    {sub.percentage}%
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {sub.grade_point}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
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
