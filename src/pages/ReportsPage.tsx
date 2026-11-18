import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Layout } from '../components/Layout';
import { StatusIndicator } from '../components/StatusIndicator';
import { apiRequest } from '../services/api';
import type { AttendanceRecord, Department, Subject } from '../types';

interface ReportResponse {
  records: AttendanceRecord[];
  overallRate: number;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  pendingCount: number;
}

export function ReportsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [department, setDepartment] = useState('ALL');
  const [subjectId, setSubjectId] = useState('ALL');
  const [preset, setPreset] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<ReportResponse | null>(null);

  useEffect(() => {
    apiRequest<{ departments: Department[]; subjects: Subject[] }>('/api/academics').then((res) => {
      setDepartments(res.departments);
      setSubjects(res.subjects);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (department !== 'ALL') params.set('department', department);
    if (subjectId !== 'ALL') params.set('subjectId', subjectId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    apiRequest<ReportResponse>(`/api/attendance/reports?${params.toString()}`).then(setReport);
  }, [department, subjectId, startDate, endDate]);

  const applyPreset = (p: 'all' | 'daily' | 'weekly' | 'monthly') => {
    setPreset(p);
    if (p === 'daily') {
      setStartDate('2026-11-18');
      setEndDate('2026-11-18');
    } else if (p === 'weekly') {
      setStartDate('2026-11-11');
      setEndDate('2026-11-18');
    } else if (p === 'monthly') {
      setStartDate('2026-11-01');
      setEndDate('2026-11-30');
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleExportCsv = async () => {
    const params = new URLSearchParams();
    if (department !== 'ALL') params.set('department', department);
    if (subjectId !== 'ALL') params.set('subjectId', subjectId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('format', 'csv');

    const csvText = await apiRequest<string>(`/api/attendance/reports?${params.toString()}`);
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-attend-report-${preset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout
      title="Attendance Reports"
      breadcrumb="Reports / Audit & Export"
      actions={
        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                  preset === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                {p === 'all' ? 'All Dates' : p}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter report by department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter report by subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.code}
                </option>
              ))}
            </select>

            <input
              type="date"
              aria-label="Start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
            <input
              type="date"
              aria-label="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {report && (
          <>
            {/* Summary strip */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-500">Overall Attendance Rate</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{report.overallRate}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Records</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{report.totalRecords}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Present Count</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">{report.presentCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Absent / Pending</p>
                <p className="mt-1 text-2xl font-bold text-rose-700 tabular-nums">
                  {report.absentCount} / {report.pendingCount}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-6 font-medium">Student ID</th>
                      <th className="py-3 px-4 font-medium">Student Name</th>
                      <th className="py-3 px-4 font-medium">Subject</th>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">Method</th>
                      <th className="py-3 px-6 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.records.slice(0, 80).map((rec) => {
                      const subj = subjects.find((s) => s.subjectId === rec.subjectId);
                      return (
                        <tr key={rec.attendanceId}>
                          <td className="py-2.5 px-6 font-mono text-xs text-slate-700">{rec.studentId}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">{rec.studentName}</td>
                          <td className="py-2.5 px-4 text-slate-600">{subj?.code || rec.subjectId}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-600 tabular-nums">{rec.date}</td>
                          <td className="py-2.5 px-4 text-xs text-slate-600">{rec.verificationMethod}</td>
                          <td className="py-2.5 px-6 text-right">
                            <StatusIndicator status={rec.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
