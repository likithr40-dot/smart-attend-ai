import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { StatusIndicator } from '../components/StatusIndicator';
import { apiRequest } from '../services/api';
import type { AttendanceRecord, Subject } from '../types';

export function AttendanceHistoryPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (subjectId !== 'ALL') params.set('subjectId', subjectId);
    if (status !== 'ALL') params.set('status', status);
    if (date) params.set('date', date);

    Promise.all([
      apiRequest<{ records: AttendanceRecord[] }>(`/api/attendance/records?${params.toString()}`),
      apiRequest<{ subjects: Subject[] }>('/api/academics'),
    ])
      .then(([recRes, acadRes]) => {
        setRecords(recRes.records);
        setSubjects(acadRes.subjects);
      })
      .finally(() => setLoading(false));
  }, [subjectId, status, date]);

  return (
    <Layout title="Attendance History" breadcrumb="Records / Session Register">
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter by subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Pending Review">Pending Review</option>
          </select>

          <input
            type="date"
            aria-label="Filter by date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />

          {(subjectId !== 'ALL' || status !== 'ALL' || date) && (
            <button
              type="button"
              onClick={() => {
                setSubjectId('ALL');
                setStatus('ALL');
                setDate('');
              }}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6 font-medium">ID &amp; Session</th>
                  <th className="py-3 px-4 font-medium">Student</th>
                  <th className="py-3 px-4 font-medium">Subject</th>
                  <th className="py-3 px-4 font-medium">Date &amp; Time</th>
                  <th className="py-3 px-4 font-medium">Verification</th>
                  <th className="py-3 px-6 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : (
                  records.slice(0, 60).map((rec) => {
                    const subj = subjects.find((s) => s.subjectId === rec.subjectId);
                    return (
                      <tr key={rec.attendanceId} className="hover:bg-slate-50/70">
                        <td className="py-3 px-6 font-mono text-xs text-slate-600">
                          {rec.sessionId}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{rec.studentName}</p>
                          <p className="font-mono text-xs text-slate-500">{rec.studentId}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {subj ? `${subj.code} — ${subj.name}` : rec.subjectId}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">
                          {rec.date} · {rec.time}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {rec.verificationMethod}
                          {rec.confidence !== undefined
                            ? ` (${Math.round(rec.confidence * 100)}%)`
                            : ''}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <StatusIndicator status={rec.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
                {!loading && records.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      No matching attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
