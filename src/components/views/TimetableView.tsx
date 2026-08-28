import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  Plus,
  CheckCircle,
  Filter,
  Layers,
} from 'lucide-react';
import type { TimetableSlot, Batch, Classroom, Subject } from '../../types';

export const TimetableView: React.FC = () => {
  const { token, user, isAdmin, isFaculty } = useAuth();
  const [timetables, setTimetables] = useState<TimetableSlot[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<any[]>([]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  // Slot Builder Form
  const [showBuilder, setShowBuilder] = useState(false);
  const [formSlot, setFormSlot] = useState({
    batch_id: '',
    subject_id: '',
    faculty_id: '',
    room_id: '',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
  });

  // Conflict state (HTTP 409)
  const [conflictError, setConflictError] = useState<{
    hasConflict: boolean;
    reason?: string;
    existingSlot?: any;
  } | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [batchRes, roomRes, subRes, userRes] = await Promise.all([
        fetch('/api/org/batches', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/academic/classrooms', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/academic/subjects', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/auth/demo-users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (batchRes.ok) {
        const b = await batchRes.json();
        setBatches(b);
        if (b.length > 0 && !selectedBatchId) {
          setSelectedBatchId(b[0].id);
          setFormSlot((prev) => ({ ...prev, batch_id: b[0].id }));
        }
      }
      if (roomRes.ok) {
        const r = await roomRes.json();
        setClassrooms(r);
        if (r.length > 0) setFormSlot((prev) => ({ ...prev, room_id: r[0].id }));
      }
      if (subRes.ok) {
        const s = await subRes.json();
        setSubjects(s);
        if (s.length > 0) setFormSlot((prev) => ({ ...prev, subject_id: s[0].id }));
      }
      if (userRes.ok) {
        const u = await userRes.json();
        const fac = u.all?.filter((usr: any) => usr.role === 'faculty') || [];
        setFacultyUsers(fac);
        if (fac.length > 0) setFormSlot((prev) => ({ ...prev, faculty_id: fac[0].id }));
      }
    } catch (e) {
      console.error('Error loading timetable assets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatchTimetable = async (batchId: string) => {
    if (!token || !batchId) return;
    try {
      const res = await fetch(`/api/academic/timetable/batch/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTimetables(data);
      }
    } catch (e) {
      console.error('Error loading batch schedule:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchTimetable(selectedBatchId);
    }
  }, [selectedBatchId, token]);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/academic/timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formSlot),
      });

      if (res.status === 409) {
        // Collision detected
        const errorJson = await res.json();
        setConflictError({
          hasConflict: true,
          reason: errorJson.reason || 'Schedule collision detected.',
          existingSlot: errorJson.existingSlot,
        });
        return;
      }

      if (res.ok) {
        setSuccessMessage('Timetable slot successfully scheduled without conflicts.');
        setShowBuilder(false);
        if (formSlot.batch_id === selectedBatchId) {
          fetchBatchTimetable(selectedBatchId);
        } else {
          setSelectedBatchId(formSlot.batch_id);
        }
      }
    } catch (err) {
      console.error('Failed to create timetable slot:', err);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const filteredSlots = timetables.filter((t) => (selectedDay === 'All' ? true : t.day_of_week === selectedDay));

  return (
    <div id="erp_timetable_view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Timetable & Conflict Engine</h2>
          <p className="text-xs text-slate-500">
            Real-time multi-dimensional collision prevention (Room, Faculty, & Batch constraints with HTTP 409 enforcement).
          </p>
        </div>

        {(isAdmin || isFaculty) && (
          <button
            onClick={() => {
              setShowBuilder(!showBuilder);
              setConflictError(null);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Book Class Slot
          </button>
        )}
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Slot Builder & Conflict Tester */}
      {showBuilder && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Schedule Matrix Allocation Form
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Strict ACID Conflict Detection</span>
          </div>

          <form onSubmit={handleCreateSlot} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Batch / Cohort</label>
              <select
                value={formSlot.batch_id}
                onChange={(e) => setFormSlot({ ...formSlot, batch_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <select
                value={formSlot.subject_id}
                onChange={(e) => setFormSlot({ ...formSlot, subject_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Faculty Professor</label>
              <select
                value={formSlot.faculty_id}
                onChange={(e) => setFormSlot({ ...formSlot, faculty_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
              >
                {facultyUsers.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Classroom / Lab</label>
              <select
                value={formSlot.room_id}
                onChange={(e) => setFormSlot({ ...formSlot, room_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
              >
                {classrooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.room_number} ({r.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Day of Week</label>
              <select
                value={formSlot.day_of_week}
                onChange={(e) => setFormSlot({ ...formSlot, day_of_week: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
              >
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
              <input
                type="time"
                value={formSlot.start_time}
                onChange={(e) => setFormSlot({ ...formSlot, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label>
              <input
                type="time"
                value={formSlot.end_time}
                onChange={(e) => setFormSlot({ ...formSlot, end_time: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Validate & Save Slot
              </button>
            </div>
          </form>

          {/* HTTP 409 Collision Alert */}
          {conflictError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-rose-700 dark:text-rose-300">
                  HTTP 409 Conflict: Schedule Collision Detected
                </h4>
                <p className="mt-1 leading-relaxed">{conflictError.reason}</p>
                <p className="mt-1.5 font-mono text-[11px] text-rose-600 dark:text-rose-400">
                  Transaction rolled back. Please select a non-overlapping time or alternate room.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Batch:</span>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-medium text-slate-900 dark:text-white"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Day selector */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {['All', ...days].map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedDay === d
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="space-y-4">
        {days
          .filter((d) => (selectedDay === 'All' ? true : d === selectedDay))
          .map((day) => {
            const daySlots = timetables
              .filter((t) => t.day_of_week === day)
              .sort((a, b) => a.start_time.localeCompare(b.start_time));

            return (
              <div key={day} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    {day}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">{daySlots.length} Scheduled Slots</span>
                </div>

                {daySlots.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No classes scheduled for {day}.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-2 hover:border-indigo-400/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                            {slot.start_time} - {slot.end_time}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">{slot.subject?.code}</span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {slot.subject?.name}
                        </h4>

                        <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1 truncate max-w-[130px]">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{slot.faculty?.name || 'Faculty'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{slot.classroom?.room_number || 'Room'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
