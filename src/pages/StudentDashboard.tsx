import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, BookOpen, CheckCircle2, ScanFace } from 'lucide-react';
import { CircularProgress } from '../components/CircularProgress';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { StatusIndicator } from '../components/StatusIndicator';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { AttendanceRecord, Faculty, Student, Subject } from '../types';

interface StudentAttendanceResponse {
  student: Student;
  summary: {
    totalClasses: number;
    classesAttended: number;
    pendingCount: number;
    absentCount: number;
    percentage: number;
    isLowAttendance: boolean;
    subjectBreakdown: Array<{
      subjectId: string;
      subjectCode: string;
      subjectName: string;
      total: number;
      present: number;
      percentage: number;
    }>;
  };
  monthlyTrend: Array<{ month: string; rate: number }>;
  records: AttendanceRecord[];
  subjects: Subject[];
  faculty: Faculty[];
}

export function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<StudentAttendanceResponse | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sid = user?.studentId || 'STU001';
    apiRequest<StudentAttendanceResponse>(`/api/attendance/student/${sid}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [user]);

  const filteredRecords = useMemo(() => {
    if (!data) return [];
    return data.records.filter((r) => {
      if (subjectFilter !== 'ALL' && r.subjectId !== subjectFilter) return false;
      if (dateFilter && r.date !== dateFilter) return false;
      return true;
    });
  }, [data, subjectFilter, dateFilter]);

  return (
    <Layout
      title="Student Dashboard"
      breadcrumb="Student Portal / Academic Attendance"
      actions={
        <Link
          to="/settings"
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          Biometric Enrollment
        </Link>
      }
    >
      {loading || !data ? (
        <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
      ) : (
        <div className="space-y-6">
          {data.summary.isLowAttendance && (
            <div
              role="alert"
              className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Low Attendance Warning</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Your overall attendance ({data.summary.percentage}%) is currently below the 75% academic requirement.
                </p>
              </div>
            </div>
          )}

          {/* Profile + Circular Progress + Summary Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center">
              <CircularProgress percentage={data.summary.percentage} />
              <div className="mt-5 w-full pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span>USN / Student ID</span>
                  <span className="font-mono font-semibold text-slate-900">{data.student.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Department &amp; Sem</span>
                  <span className="font-medium text-slate-900">
                    {data.student.department} · Sem {data.student.semester}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Face Template</span>
                  <span className={data.student.faceEnrolled ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                    {data.student.faceEnrolled ? 'Enrolled (Consented)' : 'Not Enrolled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Classes" value={data.summary.totalClasses} icon={BookOpen} detail="Recorded sessions" />
                <StatCard label="Classes Attended" value={data.summary.classesAttended} icon={CheckCircle2} tone="emerald" detail="Verified Present" />
                <StatCard label="Biometric Status" value={data.student.faceEnrolled ? 'Active' : 'Pending'} icon={ScanFace} tone="blue" detail={data.student.biometricConsent ? 'Consent granted' : 'Opt-in available'} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h2 className="text-sm font-bold text-slate-900 mb-3">Subject-wise Attendance (%)</h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.summary.subjectBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="subjectCode" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip />
                        <Bar dataKey="percentage" name="Attendance %" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h2 className="text-sm font-bold text-slate-900 mb-3">Monthly Attendance Graph</h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="rate" name="Rate %" stroke="#0891B2" strokeWidth={2.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance History Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Attendance History</h2>
                <p className="text-xs text-slate-500">Filter by subject or session date</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter by subject"
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ALL">All Subjects</option>
                  {data.subjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  aria-label="Filter by date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
                {(subjectFilter !== 'ALL' || dateFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubjectFilter('ALL');
                      setDateFilter('');
                    }}
                    className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-6 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Subject</th>
                    <th className="py-3 px-4 font-medium">Faculty</th>
                    <th className="py-3 px-4 font-medium">Method</th>
                    <th className="py-3 px-6 font-medium text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((rec) => {
                    const subj = data.subjects.find((s) => s.subjectId === rec.subjectId);
                    const fac = data.faculty.find((f) => f.facultyId === rec.facultyId);
                    return (
                      <tr key={rec.attendanceId} className="hover:bg-slate-50/70">
                        <td className="py-3 px-6 font-mono text-xs text-slate-700 tabular-nums">
                          {rec.date} · {rec.time}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {subj ? `${subj.code} — ${subj.name}` : rec.subjectId}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{fac?.name || rec.facultyId}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{rec.verificationMethod}</td>
                        <td className="py-3 px-6 text-right">
                          <StatusIndicator status={rec.status} />
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                        No attendance records match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
