import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, CalendarCheck, Camera, CheckSquare, Plus, Users } from 'lucide-react';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { apiRequest } from '../services/api';
import type { AttendanceSession, ClassroomClass, Department, Subject } from '../types';

export function FacultyDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassroomClass[]>([]);
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    todaysAttendanceRate: 0,
    averageAttendanceRate: 0,
  });

  const [department, setDepartment] = useState('CSE');
  const [semester, setSemester] = useState(5);
  const [subjectId, setSubjectId] = useState('SUB_CS501');
  const [classId, setClassId] = useState('CLS_CSE_5A');
  const [date, setDate] = useState('2026-11-18');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadData = async () => {
    const [sesRes, acadRes, ovRes] = await Promise.all([
      apiRequest<{ sessions: AttendanceSession[] }>('/api/attendance/sessions'),
      apiRequest<{ departments: Department[]; subjects: Subject[]; classes: ClassroomClass[] }>('/api/academics'),
      apiRequest<{ totalStudents: number; todaysAttendanceRate: number; averageAttendanceRate: number }>('/api/analytics/overview'),
    ]);
    setSessions(sesRes.sessions);
    setDepartments(acadRes.departments);
    setSubjects(acadRes.subjects);
    setClasses(acadRes.classes);
    setMetrics(ovRes);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback('');
    try {
      const res = await apiRequest<{ session: AttendanceSession }>('/api/attendance/sessions', {
        method: 'POST',
        body: JSON.stringify({
          department,
          semester,
          subjectId,
          classId,
          date,
          durationMinutes,
          mode,
        }),
      });
      await loadData();
      setFeedback(`Created session ${res.session.sessionId}`);
      if (mode === 'ai') {
        navigate(`/ai-attendance?sessionId=${res.session.sessionId}`);
      } else {
        navigate(`/manual-attendance?sessionId=${res.session.sessionId}`);
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to create session.');
    } finally {
      setCreating(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    await apiRequest(`/api/attendance/sessions/${sessionId}/end`, { method: 'PATCH' });
    await loadData();
  };

  const filteredSubjects = subjects.filter((s) => s.department === department);
  const filteredClasses = classes.filter((c) => c.department === department);

  return (
    <Layout
      title="Faculty Dashboard"
      breadcrumb="Faculty / Classroom Operations"
      actions={
        <Link
          to="/ai-attendance"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Launch AI Attendance</span>
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Assigned Classes" value={classes.length} icon={BookOpen} tone="blue" detail="Active academic sections" />
          <StatCard label="Enrolled Students" value={metrics.totalStudents} icon={Users} tone="cyan" detail="Across assigned rosters" />
          <StatCard label="Today's Attendance" value={`${metrics.todaysAttendanceRate}%`} icon={CalendarCheck} tone="emerald" detail="Live daily rate" />
          <StatCard label="Average Attendance" value={`${metrics.averageAttendanceRate}%`} icon={CheckSquare} detail="All faculty sessions" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Attendance Session */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Create Attendance Session</h2>
            <p className="text-xs text-slate-500 mb-5">Configure class parameters and start AI or manual roll call.</p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fac-dept" className="block text-xs font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    id="fac-dept"
                    value={department}
                    onChange={(e) => {
                      const nextDept = e.target.value;
                      setDepartment(nextDept);
                      const firstSubj = subjects.find((s) => s.department === nextDept);
                      const firstCls = classes.find((c) => c.department === nextDept);
                      if (firstSubj) setSubjectId(firstSubj.subjectId);
                      if (firstCls) setClassId(firstCls.classId);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.departmentId} value={d.code}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="fac-sem" className="block text-xs font-medium text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    id="fac-sem"
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="fac-subject" className="block text-xs font-medium text-slate-700 mb-1">
                  Subject
                </label>
                <select
                  id="fac-subject"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {(filteredSubjects.length > 0 ? filteredSubjects : subjects).map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="fac-class" className="block text-xs font-medium text-slate-700 mb-1">
                  Class Section
                </label>
                <select
                  id="fac-class"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {(filteredClasses.length > 0 ? filteredClasses : classes).map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.name} ({c.room})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fac-date" className="block text-xs font-medium text-slate-700 mb-1">
                    Session Date
                  </label>
                  <input
                    id="fac-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="fac-duration" className="block text-xs font-medium text-slate-700 mb-1">
                    Duration (min)
                  </label>
                  <input
                    id="fac-duration"
                    type="number"
                    min={10}
                    max={240}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">Capture Mode</span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMode('ai')}
                    className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                      mode === 'ai' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    AI Face Recognition
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                      mode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Manual Roll Call
                  </button>
                </div>
              </div>

              {feedback && (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                  {feedback}
                </p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{creating ? 'Starting Session...' : 'Start Attendance Session'}</span>
              </button>
            </form>
          </div>

          {/* Sessions Table */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Attendance Sessions</h2>
                <p className="text-xs text-slate-500">Active and completed classroom registers</p>
              </div>
              <Link to="/reports" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                View Reports
              </Link>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-5 font-medium">Session</th>
                    <th className="py-3 px-4 font-medium">Subject / Class</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.slice(0, 8).map((ses) => {
                    const subj = subjects.find((s) => s.subjectId === ses.subjectId);
                    const cls = classes.find((c) => c.classId === ses.classId);
                    return (
                      <tr key={ses.sessionId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-5 font-mono text-xs text-slate-700">{ses.sessionId}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{subj?.code || ses.subjectId}</p>
                          <p className="text-xs text-slate-500">{cls?.name || ses.classId}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">{ses.date}</td>
                        <td className="py-3 px-4 text-xs font-medium">
                          <span className={ses.status === 'active' ? 'text-blue-700' : 'text-slate-600'}>
                            {ses.status === 'active' ? 'Active' : 'Completed'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right space-x-2 whitespace-nowrap">
                          <Link
                            to={`/ai-attendance?sessionId=${ses.sessionId}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            AI Scan
                          </Link>
                          <Link
                            to={`/manual-attendance?sessionId=${ses.sessionId}`}
                            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Manual
                          </Link>
                          {ses.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleEndSession(ses.sessionId)}
                              className="text-xs font-semibold text-rose-700 hover:text-rose-900"
                            >
                              End
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
