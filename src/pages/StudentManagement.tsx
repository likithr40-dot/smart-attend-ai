import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react';
import { Layout } from '../components/Layout';
import { apiRequest } from '../services/api';
import type { ClassroomClass, Department, Student } from '../types';

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassroomClass[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [semFilter, setSemFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({
    studentId: '',
    name: '',
    email: '',
    department: 'CSE',
    semester: 5,
    classId: 'CLS_CSE_5A',
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (deptFilter !== 'ALL') params.set('department', deptFilter);
      if (semFilter !== 'ALL') params.set('semester', semFilter);
      if (search.trim()) params.set('search', search.trim());

      const [stuRes, acadRes] = await Promise.all([
        apiRequest<{ students: Student[] }>(`/api/students?${params.toString()}`),
        apiRequest<{ departments: Department[]; classes: ClassroomClass[] }>('/api/academics'),
      ]);
      setStudents(stuRes.students);
      setDepartments(acadRes.departments);
      setClasses(acadRes.classes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [deptFilter, semFilter, search]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      studentId: '',
      name: '',
      email: '',
      department: 'CSE',
      semester: 5,
      classId: 'CLS_CSE_5A',
    });
    setModalOpen(true);
  };

  const openEditModal = (stu: Student) => {
    setEditing(stu);
    setForm({
      studentId: stu.studentId,
      name: stu.name,
      email: stu.email,
      department: stu.department,
      semester: stu.semester,
      classId: stu.classId,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await apiRequest(`/api/students/${editing.studentId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            department: form.department,
            semester: form.semester,
            classId: form.classId,
          }),
        });
      } else {
        await apiRequest('/api/students', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save student.');
    }
  };

  const toggleActive = async (stu: Student) => {
    await apiRequest(`/api/students/${stu.studentId}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !stu.isActive }),
    });
    await loadStudents();
  };

  const handleDelete = async (stu: Student) => {
    await apiRequest(`/api/students/${stu.studentId}`, { method: 'DELETE' });
    await loadStudents();
  };

  return (
    <Layout
      title="Student Management"
      breadcrumb="Administration / Student Roster"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Student</span>
        </button>
      }
    >
      <div className="space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
            {error}
          </div>
        )}

        {/* Search and filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search students by name, ID, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, USN, or email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by department"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by semester"
              value={semFilter}
              onChange={(e) => setSemFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Roster Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6 font-medium">Student ID</th>
                  <th className="py-3 px-4 font-medium">Name &amp; Email</th>
                  <th className="py-3 px-4 font-medium">Department</th>
                  <th className="py-3 px-4 font-medium">Biometric</th>
                  <th className="py-3 px-4 font-medium">Account</th>
                  <th className="py-3 px-6 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      Loading student records...
                    </td>
                  </tr>
                ) : (
                  students.map((stu) => (
                    <tr key={stu.studentId} className="hover:bg-slate-50/70">
                      <td className="py-3 px-6 font-mono text-xs font-semibold text-slate-800">
                        {stu.studentId}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{stu.name}</p>
                        <p className="text-xs text-slate-500">{stu.email}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {stu.department} · Sem {stu.semester}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className={stu.faceEnrolled ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                          {stu.faceEnrolled ? 'Enrolled' : 'Not enrolled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className={stu.isActive ? 'text-blue-700 font-medium' : 'text-rose-700 font-medium'}>
                          {stu.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(stu)}
                          aria-label={`Edit ${stu.name}`}
                          className="p-1.5 text-slate-600 hover:text-blue-600 rounded-md hover:bg-slate-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(stu)}
                          aria-label={stu.isActive ? `Deactivate ${stu.name}` : `Activate ${stu.name}`}
                          className="p-1.5 text-slate-600 hover:text-amber-700 rounded-md hover:bg-slate-100"
                        >
                          {stu.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(stu)}
                          aria-label={`Delete ${stu.name}`}
                          className="p-1.5 text-slate-600 hover:text-rose-700 rounded-md hover:bg-slate-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && students.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      No students found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              {editing ? `Edit Student (${editing.studentId})` : 'Add New Student'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              {!editing && (
                <div>
                  <label htmlFor="stu-id" className="block text-xs font-medium text-slate-700 mb-1">
                    USN / Student ID (optional)
                  </label>
                  <input
                    id="stu-id"
                    type="text"
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                    placeholder="Auto-generated if blank (e.g. STU021)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label htmlFor="stu-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="stu-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="stu-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  id="stu-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="stu-dept" className="block text-xs font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    id="stu-dept"
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
                  <label htmlFor="stu-sem" className="block text-xs font-medium text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    id="stu-sem"
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
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
                <label htmlFor="stu-class" className="block text-xs font-medium text-slate-700 mb-1">
                  Class Section
                </label>
                <select
                  id="stu-class"
                  value={form.classId}
                  onChange={(e) => setForm({ ...form, classId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {classes.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.name} ({c.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {editing ? 'Save Changes' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
