import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Save } from 'lucide-react';
import { Layout } from '../components/Layout';
import { StatusIndicator } from '../components/StatusIndicator';
import { apiRequest } from '../services/api';
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  Student,
  Subject,
} from '../types';

export function ManualAttendancePage() {
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState(
    searchParams.get('sessionId') || ''
  );
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [allowCorrection, setAllowCorrection] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiRequest<{ sessions: AttendanceSession[] }>('/api/attendance/sessions'),
      apiRequest<{ subjects: Subject[] }>('/api/academics'),
    ]).then(([sesRes, acadRes]) => {
      setSessions(sesRes.sessions);
      setSubjects(acadRes.subjects);
      if (!selectedSessionId && sesRes.sessions.length > 0) {
        const active = sesRes.sessions.find((s) => s.status === 'active') || sesRes.sessions[0];
        setSelectedSessionId(active.sessionId);
      }
    });
  }, [selectedSessionId]);

  useEffect(() => {
    const ses = sessions.find((s) => s.sessionId === selectedSessionId);
    if (!ses) return;

    Promise.all([
      apiRequest<{ students: Student[] }>(`/api/students?classId=${ses.classId}`),
      apiRequest<{ records: AttendanceRecord[] }>(`/api/attendance/records?sessionId=${ses.sessionId}`),
    ]).then(([stuRes, recRes]) => {
      setStudents(stuRes.students);
      const map: Record<string, AttendanceStatus> = {};
      for (const s of stuRes.students) {
        const existing = recRes.records.find((r) => r.studentId === s.studentId);
        map[s.studentId] = existing ? existing.status : 'Present';
      }
      setStatuses(map);
    });
  }, [selectedSessionId, sessions]);

  const markAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    for (const s of students) {
      next[s.studentId] = status;
    }
    setStatuses(next);
  };

  const handleSave = async () => {
    if (!selectedSessionId || students.length === 0) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const entries = students.map((s) => ({
        studentId: s.studentId,
        status: statuses[s.studentId] || 'Present',
        verificationMethod: 'Manual' as const,
      }));
      const res = await apiRequest<{ saved: AttendanceRecord[]; duplicates: string[] }>(
        '/api/attendance/mark',
        {
          method: 'POST',
          body: JSON.stringify({
            sessionId: selectedSessionId,
            entries,
            allowUpdate: allowCorrection,
          }),
        }
      );
      setMessage(`Saved ${res.saved.length} manual attendance records for ${selectedSessionId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save manual attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout
      title="Manual Attendance"
      breadcrumb="Faculty / Manual Roll Call"
      actions={
        <button
          type="button"
          disabled={saving || students.length === 0}
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          <Save className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{saving ? 'Saving...' : 'Save Roll Call'}</span>
        </button>
      }
    >
      <div className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label htmlFor="manual-session" className="block text-xs font-medium text-slate-700 mb-1.5">
              Select Session
            </label>
            <select
              id="manual-session"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {sessions.map((s) => {
                const subj = subjects.find((sub) => sub.subjectId === s.subjectId);
                return (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.sessionId} · {subj?.code || s.subjectId} ({s.date})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={allowCorrection}
                onChange={(e) => setAllowCorrection(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Authorize editing existing records</span>
            </label>
            <button
              type="button"
              onClick={() => markAll('Present')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => markAll('Absent')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
            >
              Mark All Absent
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6 font-medium">Student ID</th>
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Current Status</th>
                  <th className="py-3 px-6 font-medium text-right">Mark Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((stu) => {
                  const st = statuses[stu.studentId] || 'Present';
                  return (
                    <tr key={stu.studentId} className="hover:bg-slate-50/70">
                      <td className="py-3 px-6 font-mono text-xs text-slate-700">{stu.studentId}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{stu.name}</td>
                      <td className="py-3 px-4">
                        <StatusIndicator status={st} />
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="inline-flex gap-1 p-1 bg-slate-100 rounded-lg">
                          {(['Present', 'Absent', 'Pending Review'] as AttendanceStatus[]).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setStatuses((prev) => ({ ...prev, [stu.studentId]: opt }))
                              }
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                st === opt
                                  ? 'bg-white text-slate-900 shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
