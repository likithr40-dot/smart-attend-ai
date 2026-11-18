# Smart Attend Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Default Deny**: Unauthenticated requests cannot read or write any document.
2. **Identity Integrity**: Users can never self-assign `role: 'admin'` or `role: 'faculty'` in `users/{uid}` on creation or update.
3. **PII Isolation**: `users/{uid}` and `students/{studentId}` contain PII (`email`); reads are restricted to the owner (`uid == request.auth.uid`), verified faculty/admin (`isAdmin()` / `isFaculty()`).
4. **Biometric Isolation**: `face_templates/{templateId}` can only be read, created, or deleted by the template's `ownerUid` (with verified consent) or an Admin. Never publicly listable.
5. **Duplicate Prevention & Session Locking**: `attendance_records/{recordId}` uses deterministic IDs (`${sessionId}_${studentId}`) and verifies the parent `attendance_sessions/{sessionId}` exists. Once a session reaches `status == 'completed'`, non-admins cannot mutate it unless explicitly authorized.
6. **Path & Size Hardening**: All document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and all strings enforce `.size()` upper bounds.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. Unauthenticated read of `/students/STU001`
2. Unauthenticated list of `/face_templates`
3. Self-escalation creating `/users/{myUid}` with `role: "admin"`
4. Shadow update adding `isAdmin: true` to `/users/{myUid}`
5. Student reading another student's `/face_templates/TPL_STU002`
6. Student creating `/attendance_records/REC_01` for themselves
7. Faculty writing an attendance record referencing a non-existent `sessionId`
8. Unverified email user writing to `/attendance_sessions`
9. Updating immutable `createdAt` or `ownerUid` on `/attendance_sessions/{id}`
10. Overlong 50KB payload injection in `student.name`
11. Invalid path ID containing `/` or spaces
12. Student reading `/notifications` belonging to another `recipientUid`
