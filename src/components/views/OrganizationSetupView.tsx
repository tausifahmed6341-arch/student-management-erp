import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  GraduationCap,
  Layers,
  Upload,
  Plus,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Users,
} from 'lucide-react';
import type { Department, Course, Batch } from '../../types';

export const OrganizationSetupView: React.FC = () => {
  const { token, organization } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'departments' | 'courses' | 'batches' | 'csv_import'>('departments');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Forms
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [courseForm, setCourseForm] = useState({ department_id: '', name: '', code: '', total_semesters: '8' });
  const [batchForm, setBatchForm] = useState({ course_id: '', name: '', start_year: '2024', end_year: '2028', current_semester: '5' });

  // CSV Import State
  const [csvContent, setCsvContent] = useState(`name,email,roll_number,password
Alan Turing,alan.turing@apextech.edu,24CS001,Password@123
Grace Hopper,grace.hopper@apextech.edu,24CS002,Password@123
Ada Lovelace,ada.lovelace@apextech.edu,24CS003,Password@123
Claude Shannon,claude.shannon@apextech.edu,24CS004,Password@123
Katherine Johnson,katherine.johnson@apextech.edu,24CS005,Password@123`);
  const [selectedBatchForCsv, setSelectedBatchForCsv] = useState('');
  const [importStatus, setImportStatus] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [deptRes, courseRes, batchRes] = await Promise.all([
        fetch('/api/org/departments', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/org/courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/org/batches', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (deptRes.ok) setDepartments(await deptRes.json());
      if (courseRes.ok) setCourses(await courseRes.json());
      if (batchRes.ok) {
        const b = await batchRes.json();
        setBatches(b);
        if (b.length > 0 && !selectedBatchForCsv) {
          setSelectedBatchForCsv(b[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching org data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) return;
    const res = await fetch('/api/org/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(deptForm),
    });
    if (res.ok) {
      setDeptForm({ name: '', code: '', description: '' });
      fetchData();
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.name || !courseForm.code || !courseForm.department_id) return;
    const res = await fetch('/api/org/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(courseForm),
    });
    if (res.ok) {
      setCourseForm({ department_id: '', name: '', code: '', total_semesters: '8' });
      fetchData();
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.name || !batchForm.course_id) return;
    const res = await fetch('/api/org/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(batchForm),
    });
    if (res.ok) {
      setBatchForm({ course_id: '', name: '', start_year: '2024', end_year: '2028', current_semester: '5' });
      fetchData();
    }
  };

  const handleImportCsv = async () => {
    if (!selectedBatchForCsv || !csvContent.trim()) return;
    setIsImporting(true);
    setImportStatus(null);

    try {
      const res = await fetch('/api/org/students/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          batch_id: selectedBatchForCsv,
          csv_data: csvContent,
        }),
      });
      const json = await res.json();
      setImportStatus(json);
    } catch (e) {
      console.error('Import error:', e);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div id="erp_org_setup_view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Organization Onboarding & Hierarchy</h2>
          <p className="text-xs text-slate-500">
            Structure departments, degree programs, student batches, and batch CSV ingest.
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'departments', label: 'Departments', icon: Building2, count: departments.length },
          { id: 'courses', label: 'Degree Programs', icon: GraduationCap, count: courses.length },
          { id: 'batches', label: 'Student Batches', icon: Layers, count: batches.length },
          { id: 'csv_import', label: 'Batch CSV Import', icon: Upload, count: null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* DEPARTMENTS TAB */}
      {activeSubTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Academic Departments</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {departments.map((dept) => (
                <div key={dept.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{dept.name}</h4>
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                      {dept.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{dept.description || 'Core Department'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs h-fit">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Add Department</h3>
            <form onSubmit={handleAddDept} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Engineering"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EEE"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. School of Power & Electronics"
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Create Department
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COURSES TAB */}
      {activeSubTab === 'courses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Degree Programs & Curriculums</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courses.map((c) => (
                <div key={c.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Duration: {c.total_semesters} Semesters</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs h-fit">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Add Degree Program</h3>
            <form onSubmit={handleAddCourse} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Parent Department</label>
                <select
                  required
                  value={courseForm.department_id}
                  onChange={(e) => setCourseForm({ ...courseForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">Select department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master of Computer Applications"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCA"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Create Course
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BATCHES TAB */}
      {activeSubTab === 'batches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Student Batches</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {batches.map((b) => (
                <div key={b.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{b.name}</h4>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                      Semester {b.current_semester}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Cohort: {b.start_year} – {b.end_year}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs h-fit">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Add Batch</h3>
            <form onSubmit={handleAddBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Degree Program</label>
                <select
                  required
                  value={batchForm.course_id}
                  onChange={(e) => setBatchForm({ ...batchForm, course_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">Select course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Batch Section Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE Class of 2025 - Section B"
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Start Year</label>
                  <input
                    type="number"
                    value={batchForm.start_year}
                    onChange={(e) => setBatchForm({ ...batchForm, start_year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">End Year</label>
                  <input
                    type="number"
                    value={batchForm.end_year}
                    onChange={(e) => setBatchForm({ ...batchForm, end_year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Create Batch
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT TAB */}
      {activeSubTab === 'csv_import' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Batch CSV Student Onboarding</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Format: name,email,roll_number,password</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Student Batch
              </label>
              <select
                value={selectedBatchForCsv}
                onChange={(e) => setSelectedBatchForCsv(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              CSV Raw Data Payload
            </label>
            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full font-mono text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Parses records, hashes passwords with BCrypt, provisions student profiles, and isolates by <code>org_id</code>.
            </p>
            <button
              onClick={handleImportCsv}
              disabled={isImporting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Ingesting Records...' : 'Execute Batch Import'}
            </button>
          </div>

          {/* Import Result Notification */}
          {importStatus && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              importStatus.importedCount > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold">{importStatus.message}</h4>
                <p className="text-xs mt-0.5">
                  Successfully created {importStatus.importedCount} user accounts and mapped student roll numbers.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
