import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Layout } from '../components/Layout';
import { apiRequest } from '../services/api';
import type { ClassroomClass, Department, Faculty, Subject } from '../types';

export function ClassManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassroomClass[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [error, setError] = useState('');

  const [deptForm, setDeptForm] = useState({ code: '', name: '', headName: '' });
  const [classForm, setClassForm] = useState({ name: '', department: 'CSE', semester: 5, room: '' });
  const [subjForm, setSubjForm] = useState({ code: '', name: '', department: 'CSE', semester: 5, facultyId: '' });

  const loadAll = async () => {
    const res = await apiRequest<{
      departments: Department[];
      subjects: Subject[];
      classes: ClassroomClass[];
      faculty: Faculty[];
    }>('/api/academics');
    setDepartments(res.departments);
    setSubjects(res.subjects);
    setClasses(res.classes);
    setFaculty(res.faculty);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const addDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/api/departments', { method: 'POST', body: JSON.stringify(deptForm) });
      setDeptForm({ code: '', name: '', headName: '' });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create department.');
    }
  };

  const addClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/api/classes', { method: 'POST', body: JSON.stringify(classForm) });
      setClassForm({ name: '', department: 'CSE', semester: 5, room: '' });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class.');
    }
  };

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/api/subjects', { method: 'POST', body: JSON.stringify(subjForm) });
      setSubjForm({ code: '', name: '', department: 'CSE', semester: 5, facultyId: '' });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subject.');
    }
  };

  return (
    <Layout title="Classes, Departments & Subjects" breadcrumb="Administration / Academic Structure">
      {error && (
        <div role="alert" className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Departments */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Departments</h2>
            <p className="text-xs text-slate-500">Academic divisions</p>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {departments.map((d) => (
              <li key={d.departmentId} className="py-2.5 flex justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{d.code}</p>
                  <p className="text-xs text-slate-500">{d.name}</p>
                </div>
                <span className="text-xs text-slate-600">{d.headName}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={addDepartment} className="pt-3 border-t border-slate-100 space-y-2.5">
            <input
              type="text"
              required
              placeholder="Code (e.g. ISE)"
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              placeholder="Department Name"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Department Head"
              value={deptForm.headName}
              onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Department</span>
            </button>
          </form>
        </section>

        {/* Classes */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Classes</h2>
            <p className="text-xs text-slate-500">Classroom sections and rooms</p>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {classes.map((c) => (
              <li key={c.classId} className="py-2.5 flex justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c.department} · Sem {c.semester}
                  </p>
                </div>
                <span className="text-xs text-slate-600 font-mono">{c.room}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={addClass} className="pt-3 border-t border-slate-100 space-y-2.5">
            <input
              type="text"
              required
              placeholder="Class Name (e.g. CSE-6A)"
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={classForm.department}
                onChange={(e) => setClassForm({ ...classForm, department: e.target.value })}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {departments.map((d) => (
                  <option key={d.departmentId} value={d.code}>
                    {d.code}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={8}
                value={classForm.semester}
                onChange={(e) => setClassForm({ ...classForm, semester: Number(e.target.value) })}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <input
              type="text"
              placeholder="Room (e.g. Block C-102)"
              value={classForm.room}
              onChange={(e) => setClassForm({ ...classForm, room: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Class</span>
            </button>
          </form>
        </section>

        {/* Subjects */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Subjects</h2>
            <p className="text-xs text-slate-500">Courses &amp; faculty assignments</p>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {subjects.map((s) => {
              const fac = faculty.find((f) => f.facultyId === s.facultyId);
              return (
                <li key={s.subjectId} className="py-2.5 flex justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {s.code} · {s.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.department} · Sem {s.semester}
                    </p>
                  </div>
                  <span className="text-xs text-slate-600 shrink-0">{fac?.name || 'Unassigned'}</span>
                </li>
              );
            })}
          </ul>
          <form onSubmit={addSubject} className="pt-3 border-t border-slate-100 space-y-2.5">
            <input
              type="text"
              required
              placeholder="Code (e.g. CS601)"
              value={subjForm.code}
              onChange={(e) => setSubjForm({ ...subjForm, code: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              placeholder="Subject Name"
              value={subjForm.name}
              onChange={(e) => setSubjForm({ ...subjForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={subjForm.department}
                onChange={(e) => setSubjForm({ ...subjForm, department: e.target.value })}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {departments.map((d) => (
                  <option key={d.departmentId} value={d.code}>
                    {d.code}
                  </option>
                ))}
              </select>
              <select
                value={subjForm.facultyId}
                onChange={(e) => setSubjForm({ ...subjForm, facultyId: e.target.value })}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Assign Faculty</option>
                {faculty.map((f) => (
                  <option key={f.facultyId} value={f.facultyId}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Subject</span>
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
