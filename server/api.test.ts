import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server';
import { resetDbForTesting } from './database/store';

async function withServer(fn: (baseUrl: string) => Promise<void>) {
  resetDbForTesting();
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await fn(baseUrl);
  } finally {
    resetDbForTesting();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
}

test('API auth, RBAC enforcement, student CRUD, duplicate prevention, AI demo & CSV report', async () => {
  await withServer(async (baseUrl) => {
    // 1. Login as Admin
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smartattend.edu', password: 'Admin@123' }),
    });
    assert.equal(adminLoginRes.status, 200);
    const { token: adminToken } = (await adminLoginRes.json()) as { token: string };
    assert.ok(adminToken);

    // 2. Login as Student and verify RBAC blocks admin-only endpoint
    const stuLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aarav.sharma@smartattend.edu', password: 'Student@123' }),
    });
    assert.equal(stuLoginRes.status, 200);
    const { token: stuToken } = (await stuLoginRes.json()) as { token: string };

    const forbiddenAdd = await fetch(`${baseUrl}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stuToken}`,
      },
      body: JSON.stringify({ name: 'Hacker', email: 'h@x.edu', department: 'CSE' }),
    });
    assert.equal(forbiddenAdd.status, 403);

    // 3. Admin creates and edits a student
    const createStuRes = await fetch(`${baseUrl}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Nikhil Rao',
        email: 'nikhil.rao@smartattend.edu',
        department: 'CSE',
        semester: 5,
      }),
    });
    assert.equal(createStuRes.status, 201);
    const { student } = (await createStuRes.json()) as { student: { studentId: string } };

    const editStuRes = await fetch(`${baseUrl}/api/students/${student.studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'Nikhil K. Rao' }),
    });
    assert.equal(editStuRes.status, 200);

    // 4. Faculty creates session & prevents duplicate attendance when allowUpdate=false
    const facLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ananya.rao@smartattend.edu', password: 'Faculty@123' }),
    });
    const { token: facToken } = (await facLoginRes.json()) as { token: string };

    const sesRes = await fetch(`${baseUrl}/api/attendance/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facToken}`,
      },
      body: JSON.stringify({
        department: 'CSE',
        semester: 5,
        subjectId: 'SUB_CS501',
        classId: 'CLS_CSE_5A',
        date: '2026-11-18',
        durationMinutes: 60,
        mode: 'ai',
      }),
    });
    assert.equal(sesRes.status, 201);
    const { session } = (await sesRes.json()) as { session: { sessionId: string } };

    // Mark STU001 Present
    const mark1 = await fetch(`${baseUrl}/api/attendance/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facToken}`,
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        entries: [{ studentId: 'STU001', status: 'Present', verificationMethod: 'Manual' }],
        allowUpdate: false,
      }),
    });
    assert.equal(mark1.status, 201);

    // Duplicate mark without allowUpdate returns 409 Conflict
    const markDup = await fetch(`${baseUrl}/api/attendance/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facToken}`,
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        entries: [{ studentId: 'STU001', status: 'Absent', verificationMethod: 'Manual' }],
        allowUpdate: false,
      }),
    });
    assert.equal(markDup.status, 409);

    // 5. AI Demo Simulation returns clearly flagged demo mode
    const aiDemoRes = await fetch(`${baseUrl}/api/ai/recognize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facToken}`,
      },
      body: JSON.stringify({ sessionId: session.sessionId, mode: 'demo' }),
    });
    assert.equal(aiDemoRes.status, 200);
    const aiData = (await aiDemoRes.json()) as { isDemo: boolean; matches: unknown[] };
    assert.equal(aiData.isDemo, true);
    assert.ok(aiData.matches.length > 0);

    // 6. CSV Report endpoint
    const csvRes = await fetch(`${baseUrl}/api/attendance/reports?format=csv`, {
      headers: { Authorization: `Bearer ${facToken}` },
    });
    assert.equal(csvRes.status, 200);
    const csvText = await csvRes.text();
    assert.ok(csvText.startsWith('Attendance ID,Student ID'));
  });
});
