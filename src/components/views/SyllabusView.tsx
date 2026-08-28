import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Plus,
  Sparkles,
  Minus,
  Check,
} from 'lucide-react';
import type { Subject, SyllabusUnit } from '../../types';

export const SyllabusView: React.FC = () => {
  const { token, user, isFaculty, isAdmin } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [syllabusUnits, setSyllabusUnits] = useState<SyllabusUnit[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New Subject Form
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({ code: '', name: '', credits: 3 });

  // New Unit Form
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({ unit_number: 1, title: '', total_hours: 12, topics: '' });

  const fetchSubjects = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/academic/subjects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Subject[] = await res.json();
        setSubjects(data);
        if (data.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching subjects:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSyllabus = async (subjectId: string) => {
    if (!token || !subjectId) return;
    try {
      const res = await fetch(`/api/academic/syllabus/subject/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSyllabusUnits(data.syllabusUnits || []);
      }

      // Fetch velocity prediction
      const predRes = await fetch('/api/ai/syllabus-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject_id: subjectId }),
      });
      if (predRes.ok) {
        const predJson = await predRes.json();
        setPrediction(predJson.predictions?.[0] || null);
      }
    } catch (e) {
      console.error('Error fetching syllabus:', e);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [token]);

  useEffect(() => {
    if (selectedSubjectId) {
      fetchSyllabus(selectedSubjectId);
    }
  }, [selectedSubjectId, token]);

  const handleUpdateProgress = async (unitId: string, deltaHours: number) => {
    const unit = syllabusUnits.find((u) => u.id === unitId);
    if (!unit) return;

    const newCompleted = Math.max(0, Math.min(unit.total_hours, unit.completed_hours + deltaHours));

    try {
      const res = await fetch(`/api/academic/syllabus/${unitId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ completed_hours: newCompleted }),
      });
      if (res.ok) {
        setSyllabusUnits((prev) =>
          prev.map((u) => (u.id === unitId ? { ...u, completed_hours: newCompleted } : u))
        );
        fetchSyllabus(selectedSubjectId);
      }
    } catch (e) {
      console.error('Progress update error:', e);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.name || !newSubject.code) return;
    try {
      const res = await fetch('/api/academic/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newSubject),
      });
      if (res.ok) {
        setShowAddSubject(false);
        setNewSubject({ code: '', name: '', credits: 3 });
        fetchSubjects();
      }
    } catch (e) {
      console.error('Error creating subject:', e);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnit.title || !selectedSubjectId) return;
    try {
      const res = await fetch('/api/academic/syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject_id: selectedSubjectId,
          unit_number: Number(newUnit.unit_number),
          title: newUnit.title,
          total_hours: Number(newUnit.total_hours),
          completed_hours: 0,
          topics: newUnit.topics.split(',').map((t) => t.trim()),
        }),
      });
      if (res.ok) {
        setShowAddUnit(false);
        setNewUnit({ unit_number: syllabusUnits.length + 1, title: '', total_hours: 12, topics: '' });
        fetchSyllabus(selectedSubjectId);
      }
    } catch (e) {
      console.error('Error creating unit:', e);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const totalCourseHours = syllabusUnits.reduce((acc, u) => acc + u.total_hours, 0);
  const totalCompletedHours = syllabusUnits.reduce((acc, u) => acc + u.completed_hours, 0);
  const overallProgress = totalCourseHours > 0 ? Math.round((totalCompletedHours / totalCourseHours) * 100) : 0;

  return (
    <div id="erp_syllabus_view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Academic Syllabus Engine</h2>
          <p className="text-xs text-slate-500">
            Interactive syllabus progress tracking, teaching velocity calculations, and milestone forecasts.
          </p>
        </div>

        {(isAdmin || isFaculty) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddUnit(!showAddUnit)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Unit
            </button>
            <button
              onClick={() => setShowAddSubject(!showAddSubject)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" /> New Subject
            </button>
          </div>
        )}
      </div>

      {/* Add Forms */}
      {showAddSubject && (
        <form onSubmit={handleCreateSubject} className="p-4 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Subject Code</label>
            <input
              type="text"
              required
              placeholder="e.g. CS504"
              value={newSubject.code}
              onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Subject Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Distributed Cloud Computing"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold">
              Save Subject
            </button>
            <button type="button" onClick={() => setShowAddSubject(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      )}

      {showAddUnit && (
        <form onSubmit={handleCreateUnit} className="p-4 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Number</label>
            <input
              type="number"
              required
              value={newUnit.unit_number}
              onChange={(e) => setNewUnit({ ...newUnit, unit_number: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Memory Virtualization & Paging"
              value={newUnit.title}
              onChange={(e) => setNewUnit({ ...newUnit, title: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Total Hours</label>
            <input
              type="number"
              required
              value={newUnit.total_hours}
              onChange={(e) => setNewUnit({ ...newUnit, total_hours: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Topics (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. TLB, Page Replacement Algorithms, Thrashing"
              value={newUnit.topics}
              onChange={(e) => setNewUnit({ ...newUnit, topics: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold">
              Save Unit
            </button>
            <button type="button" onClick={() => setShowAddUnit(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Subject Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {subjects.map((sub) => {
          const isSelected = sub.id === selectedSubjectId;
          return (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-2 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{sub.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-indigo-700' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {sub.code}
              </span>
            </button>
          );
        })}
      </div>

      {/* Progress & AI Velocity Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-500">Curriculum Completion</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{overallProgress}%</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalCompletedHours} / {totalCourseHours} <span className="text-sm font-normal text-slate-500">Teaching Hours</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Velocity Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-500">Pace Forecast</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {prediction?.estimatedWeeksToCompletion || '3.2'} <span className="text-sm font-normal text-slate-500">Weeks to Target</span>
          </div>
          <span className="text-xs text-slate-500 mt-2 block">
            At nominal cadence of 3 teaching hours / week
          </span>
        </div>

        {/* Risk / Milestone Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-500">Milestone Readiness</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {overallProgress >= 60 ? 'Exam Schedule Ready' : 'In Progress'}
          </div>
          <span className="text-xs text-emerald-600 font-semibold mt-2 block">
            {prediction?.riskStatus === 'HIGH_RISK_DELAY' ? '⚠️ Velocity deficit detected' : '✓ Ahead of final examination window'}
          </span>
        </div>
      </div>

      {/* Syllabus Unit List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          Curriculum Modules & Teaching Hours
        </h3>

        {syllabusUnits.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No syllabus units created yet for this subject. Click "Add Unit" above.
          </div>
        ) : (
          syllabusUnits.map((unit) => {
            const unitProgress = unit.total_hours > 0 ? Math.round((unit.completed_hours / unit.total_hours) * 100) : 0;
            const isCompleted = unit.completed_hours >= unit.total_hours;

            return (
              <div
                key={unit.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      Unit {unit.unit_number}:
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{unit.title}</h4>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>

                  {unit.topics && unit.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {unit.topics.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                        style={{ width: `${unitProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-500 shrink-0">
                      {unit.completed_hours} / {unit.total_hours} hrs ({unitProgress}%)
                    </span>
                  </div>
                </div>

                {/* Faculty/Admin Hour Increment Controls */}
                {(isFaculty || isAdmin) && (
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => handleUpdateProgress(unit.id, -1)}
                      disabled={unit.completed_hours <= 0}
                      className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 cursor-pointer transition-colors"
                      title="Decrease 1 hour"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold px-2 text-slate-900 dark:text-white">
                      {unit.completed_hours}h
                    </span>
                    <button
                      onClick={() => handleUpdateProgress(unit.id, 1)}
                      disabled={unit.completed_hours >= unit.total_hours}
                      className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 cursor-pointer transition-colors"
                      title="Increase 1 hour"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUpdateProgress(unit.id, unit.total_hours - unit.completed_hours)}
                      disabled={isCompleted}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ml-1"
                    >
                      <Check className="w-3.5 h-3.5" /> 100%
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
