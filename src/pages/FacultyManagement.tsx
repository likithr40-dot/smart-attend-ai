import React, { useEffect, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Layout } from '../components/Layout';
import { apiRequest } from '../services/api';
import type { Department, Faculty, Subject } from '../types';

export function FacultyManagement() {
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [assigning, setAssigning] = useState<Faculty | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    department: 'CSE',
    designation: 'Assistant Professor',
    assignedSubjectIds: [] as string[],
  });

  const loadData = async () => {
    const [facRes, acadRes] = await Promise.all([
      apiRequest<{ faculty: Faculty[] }>('/api/faculty'),
      apiRequest<{ departments: Department[]; subjects: Subject[] }>('/api/academics'),
    ]);
    setFacultyList(facRes.faculty);
    setDepartments(acadRes.departments);
    setSubjects(acadRes.subjects);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/api/faculty', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setModalOpen(false);
      setForm({ name: '', email: '', department: 'CSE', designation: 'Assistant Professor', assignedSubjectIds: [] });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add faculty.');
    }
  };

  const openAssignModal = (fac: Faculty) => {
    setAssigning(fac);
    setSelectedSubjects(fac.assignedSubjectIds || []);
  };

  const handleAssignSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigning) return;
    await apiRequest(`/api/faculty/${assigning.facultyId}`, {
      method: 'PUT',
      body: JSON.stringify({ assignedSubjectIds: selectedSubjects }),
    });
    setAssigning(null);
    await loadData();
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  return (
    <Layout
      title="Faculty Management"
      breadcrumb="Administration / Faculty Directory"
      actions={
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Faculty</span>
        </button>
      }
    >
      {error && (
        <div role="alert" className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-6 font-medium">Faculty ID</th>
                <th className="py-3 px-4 font-medium">Name &amp; Email</th>
                <th className="py-3 px-4 font-medium">Department</th>
                <th className="py-3 px-4 font-medium">Assigned Subjects</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facultyList.map((fac) => (
                <tr key={fac.facultyId} className="hover:bg-slate-50/70">
                  <td className="py-3 px-6 font-mono text-xs font-semibold text-slate-800">
                    {fac.facultyId}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-900">{fac.name}</p>
                    <p className="text-xs text-slate-500">
                      {fac.designation} · {fac.email}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{fac.department}</td>
                  <td className="py-3 px-4 text-xs text-slate-700">
                    {fac.assignedSubjectIds.length > 0
                      ? fac.assignedSubjectIds
                          .map((id) => subjects.find((s) => s.subjectId === id)?.code || id)
                          .join(', ')
                      : 'Unassigned'}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => openAssignModal(fac)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Assign Subjects</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Faculty Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">Add Faculty Member</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor="fac-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="fac-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="fac-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  id="fac-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fac-dept-select" className="block text-xs font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    id="fac-dept-select"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
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
                  <label htmlFor="fac-desig" className="block text-xs font-medium text-slate-700 mb-1">
                    Designation
                  </label>
                  <input
                    id="fac-desig"
                    type="text"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Create Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Subjects Modal */}
      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Assign Subjects — {assigning.name}
            </h2>
            <p className="text-xs text-slate-500 mb-4">Select subjects taught by this faculty member.</p>
            <form onSubmit={handleAssignSave} className="space-y-2">
              {subjects.map((subj) => (
                <label
                  key={subj.subjectId}
                  className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(subj.subjectId)}
                    onChange={() => toggleSubject(subj.subjectId)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900">
                      {subj.code} — {subj.name}
                    </p>
                    <p className="text-slate-500">
                      {subj.department} · Semester {subj.semester}
                    </p>
                  </div>
                </label>
              ))}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAssigning(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
