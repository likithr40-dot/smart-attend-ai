# Smart Attend — AI-Powered Attendance Management System

Smart Attend is a full-stack academic attendance management platform featuring role-based portals (Admin, Faculty, Student), AI-assisted classroom verification with liveness checks, encrypted biometric enrollment with informed consent, manual roll-call, real-time analytics, CSV/printable reports, and Cloud Firestore integration.

## Architecture Overview

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Recharts + React Router + Lucide Icons
- **Backend**: Node.js + Express (`server.ts`) with JWT authentication, `bcryptjs` password hashing, AES-256-GCM biometric template encryption, and role-based access control middleware
- **AI Vision Engine**: `@google/genai` (`gemini-4-hydrogen`) multimodal vision analysis for live classroom frame face counting, anti-spoofing/liveness verification, and visual reference matching — plus a clearly labeled Demo Simulation Mode when testing without live classroom photos
- **Cloud Database & Rules**: Firebase Firestore (`firebase-applet-config.json`) with Eight Pillars security rules (`firestore.rules`) and `firebase-blueprint.json` schema

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and configure:
   - `GEMINI_API_KEY`: Google Gemini API key for live AI Vision frame analysis and liveness checks.
   - `JWT_SECRET`: Secret key for signing JWT tokens.
   - `BIOMETRIC_ENCRYPTION_KEY`: Key used to derive the AES-256-GCM cipher for biometric templates.

3. **Firebase Configuration**
   - `firebase-applet-config.json` contains your provisioned Firebase project and Firestore database ID.
   - Security rules live in `firestore.rules` and are validated with `@firebase/eslint-plugin-security-rules`.
   - Inside **Profile Settings -> Cloud Firestore Sync**, users can connect via Google Sign-In to push academic datasets directly to Firestore.

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   The full-stack Express + Vite server runs on `http://localhost:3000`.

5. **Run Tests & Build**
   ```bash
   npx tsx --test src/utils/attendanceCalculations.test.ts server/core/security.test.ts server/api.test.ts
   npm run lint
   npm run build
   ```

## Development Demo Credentials

Use these accounts during local development and evaluation (never expose in production):

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@smartattend.edu` | `Admin@123` |
| **Faculty (CSE)** | `ananya.rao@smartattend.edu` | `Faculty@123` |
| **Faculty (ECE)** | `kavita.iyer@smartattend.edu` | `Faculty@123` |
| **Student (CSE)** | `aarav.sharma@smartattend.edu` | `Student@123` |

## Key Biometric & Security Safeguards

- Uncertain AI matches (`60%–84%` confidence) automatically route to **Pending Review** and never auto-mark a student **Present**.
- Duplicate attendance records for the same `(studentId, subjectId, sessionId)` are rejected unless an authorized faculty/admin correction is explicitly requested.
- Biometric enrollments require explicit informed consent and can be permanently deleted via `DELETE /api/ai/face-template/:studentId`.
- Face templates are encrypted at rest with AES-256-GCM and never returned in public API responses.
