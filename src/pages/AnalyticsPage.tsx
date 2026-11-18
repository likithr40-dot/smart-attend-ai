import { useEffect, useState } from 'react';
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
import { Activity, AlertTriangle, CalendarCheck, Layers } from 'lucide-react';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { apiRequest } from '../services/api';
import type { Department, Subject } from '../types';

interface AnalyticsOverview {
  averageAttendanceRate: number;
  todaysAttendanceRate: number;
  departmentComparison: Array<{ department: string; rate: number }>;
  subjectComparison: Array<{ code: string; name: string; rate: number }>;
  studentsRequiringReview: Array<{
    studentId: string;
    name: string;
    department: string;
    semester: number;
    percentage: number;
    pendingReviews: number;
  }>;
}

export function AnalyticsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [weekly, setWeekly] = useState<Array<{ label: string; rate: number }>>([]);
  const [monthly, setMonthly] = useState<Array<{ month: string; rate: number }>>([]);

  useEffect(() => {
    apiRequest<{ departments: Department[]; subjects: Subject[] }>('/api/academics').then((res) => {
      setDepartments(res.departments);
      setSubjects(res.subjects);
    });
    apiRequest<{ weekly: Array<{ label: string; rate: number }> }>('/api/analytics/weekly').then((r) =>
      setWeekly(r.weekly)
    );
    apiRequest<{ monthly: Array<{ month: string; rate: number }> }>('/api/analytics/monthly').then((r) =>
      setMonthly(r.monthly)
    );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (deptFilter !== 'ALL') params.set('department', deptFilter);
    if (subjectFilter !== 'ALL') params.set('subjectId', subjectFilter);

    apiRequest<AnalyticsOverview>(`/api/analytics/overview?${params.toString()}`).then(setOverview);
  }, [deptFilter, subjectFilter]);

  return (
    <Layout title="Attendance Analytics" breadcrumb="Insights / Performance Metrics">
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter analytics by department"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.code}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter analytics by subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>

        {overview && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Overall Attendance" value={`${overview.averageAttendanceRate}%`} icon={Activity} tone="blue" detail="Calculated from records" />
              <StatCard label="Today's Rate" value={`${overview.todaysAttendanceRate}%`} icon={CalendarCheck} tone="emerald" detail="Latest session date" />
              <StatCard label="Subjects Tracked" value={overview.subjectComparison.length} icon={Layers} tone="cyan" detail="Active curriculum" />
              <StatCard label="Students Below 75%" value={overview.studentsRequiringReview.length} icon={AlertTriangle} tone="amber" detail="Require review" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Weekly Attendance Trend</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip />
                      <Bar dataKey="rate" name="Attendance %" fill="#2563EB" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Monthly Attendance Growth</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="rate" name="Rate %" stroke="#0891B2" strokeWidth={2.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Subject-wise Attendance (%)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.subjectComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="code" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip />
                      <Bar dataKey="rate" name="Rate %" fill="#2563EB" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Department Comparison (%)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.departmentComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="department" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip />
                      <Bar dataKey="rate" name="Rate %" fill="#0891B2" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
