import { GoogleGenAI, Type } from '@google/genai';
import { classifyMatchConfidence } from '../../src/utils/attendanceCalculations';
import type { AIRecognitionMatch, AIRecognitionResponse, Student } from '../../src/types';
import { decryptBiometricPayload } from '../core/security';
import type { StoredFaceTemplate } from '../types';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function stripDataUrlPrefix(base64: string): { mimeType: string; data: string } {
  const match = base64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: 'image/jpeg', data: base64 };
}

export async function analyzeEnrollmentFrame(imageBase64: string): Promise<{
  validFaceDetected: boolean;
  livenessStatus: 'pass' | 'warn' | 'fail';
  qualityNotes: string;
  usedAiVision: boolean;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      validFaceDetected: true,
      livenessStatus: 'pass',
      qualityNotes: 'Captured locally (AI vision service not configured; template encrypted with AES-256-GCM).',
      usedAiVision: false,
    };
  }

  try {
    const img = stripDataUrlPrefix(imageBase64);
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          { inlineData: { mimeType: img.mimeType, data: img.data } },
          {
            text: 'Inspect this biometric enrollment photo. Determine if there is exactly one clear, forward-facing human face suitable for attendance enrollment, and check for spoofing cues (e.g. photo of a screen, moire grid, printed paper edge, or extreme occlusion). Respond strictly in JSON.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faceCount: { type: Type.INTEGER },
            isClearPortrait: { type: Type.BOOLEAN },
            livenessStatus: { type: Type.STRING, enum: ['pass', 'warn', 'fail'] },
            qualityNotes: { type: Type.STRING },
          },
          required: ['faceCount', 'isClearPortrait', 'livenessStatus', 'qualityNotes'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      faceCount?: number;
      isClearPortrait?: boolean;
      livenessStatus?: 'pass' | 'warn' | 'fail';
      qualityNotes?: string;
    };

    return {
      validFaceDetected: (parsed.faceCount ?? 0) === 1 && Boolean(parsed.isClearPortrait),
      livenessStatus: parsed.livenessStatus ?? 'warn',
      qualityNotes: parsed.qualityNotes ?? 'Enrollment frame analyzed.',
      usedAiVision: true,
    };
  } catch (err) {
    console.warn('Gemini enrollment frame analysis failed:', err);
    return {
      validFaceDetected: true,
      livenessStatus: 'warn',
      qualityNotes: 'Fallback capture validation used because AI vision request failed.',
      usedAiVision: false,
    };
  }
}

export async function recognizeClassroomFrame(params: {
  imageBase64?: string;
  mode: 'ai' | 'demo';
  classStudents: Student[];
  storedTemplates: StoredFaceTemplate[];
}): Promise<AIRecognitionResponse> {
  const { imageBase64, mode, classStudents, storedTemplates } = params;
  const now = new Date().toISOString();

  // Explicit Demo Simulation Mode (honestly badged, never pretending to be real recognition)
  if (mode === 'demo' || !imageBase64) {
    const enrolled = classStudents.filter((s) => s.faceEnrolled);
    const matches: AIRecognitionMatch[] = classStudents.map((student, idx) => {
      let confidence = 0.35;
      let rationale = 'No biometric enrollment template on file (Demo Simulation).';
      if (student.faceEnrolled) {
        if (idx % 4 === 3) {
          confidence = 0.72;
          rationale = 'Partial angle / occlusion in demo scenario — manual review required.';
        } else if (idx % 5 === 4) {
          confidence = 0.42;
          rationale = 'Student not detected in simulated classroom frame.';
        } else {
          confidence = 0.91 + ((idx % 3) * 0.02);
          rationale = 'High-similarity simulated feature vector in Demo Mode.';
        }
      }
      const cls = classifyMatchConfidence(confidence);
      return {
        studentId: student.studentId,
        studentName: student.name,
        confidence: Number(confidence.toFixed(2)),
        classification: cls.classification,
        suggestedStatus: cls.suggestedStatus,
        livenessScore: student.faceEnrolled ? 0.95 : 0,
        rationale,
      };
    });

    return {
      mode: 'demo_simulation',
      isDemo: true,
      detectedFacesCount: Math.max(1, enrolled.length - 1),
      livenessStatus: 'pass',
      livenessNote: 'DEMO MODE: Simulated biometric confidence scores generated for classroom workflow testing.',
      matches,
      unmatchedCount: matches.filter((m) => m.classification === 'unmatched').length,
      processedAt: now,
    };
  }

  // Real AI Vision Mode via @google/genai
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error(
      'AI Vision service unavailable: GEMINI_API_KEY is not configured. Switch to Demo Simulation Mode or configure GEMINI_API_KEY.'
    );
  }

  const capturedImg = stripDataUrlPrefix(imageBase64);
  const enrolledWithImages: { student: Student; imagePart: { mimeType: string; data: string } }[] = [];

  for (const student of classStudents) {
    const tpl = storedTemplates.find((t) => t.studentId === student.studentId && t.consentGranted);
    if (!tpl) continue;
    try {
      const rawRef = decryptBiometricPayload(tpl.encryptedTemplate);
      if (rawRef.startsWith('data:image/')) {
        enrolledWithImages.push({
          student,
          imagePart: stripDataUrlPrefix(rawRef),
        });
      }
    } catch {
      // Ignore malformed/non-image template
    }
  }

  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
    { inlineData: { mimeType: capturedImg.mimeType, data: capturedImg.data } },
  ];

  let refRosterText = 'No live reference photos enrolled for this class yet.';
  if (enrolledWithImages.length > 0) {
    const limited = enrolledWithImages.slice(0, 6);
    refRosterText = limited
      .map((item, i) => `Reference Image ${i + 1}: studentId="${item.student.studentId}", name="${item.student.name}"`)
      .join('\n');
    for (const item of limited) {
      parts.push({ inlineData: { mimeType: item.imagePart.mimeType, data: item.imagePart.data } });
    }
  }

  parts.push({
    text: `You are an honest classroom attendance vision analyzer.
Image 1 is the captured classroom/webcam frame.
${enrolledWithImages.length > 0 ? `Subsequent images are enrolled student reference portraits:\n${refRosterText}` : refRosterText}

Tasks:
1. Count the real human faces clearly visible in Image 1.
2. Perform anti-spoofing/liveness assessment on Image 1 (check for phone screens, moire lines, printed photo edges, or unnatural flat glare).
3. Only if Reference Images were provided, compare faces in Image 1 against each Reference Image and output a visual similarity confidence between 0.0 and 1.0. If no reference images match or none were provided, return an empty matchedStudents array — NEVER fabricate matches.

Respond strictly in JSON.`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedFacesCount: { type: Type.INTEGER },
          livenessStatus: { type: Type.STRING, enum: ['pass', 'warn', 'fail'] },
          livenessNote: { type: Type.STRING },
          livenessScore: { type: Type.NUMBER },
          matchedStudents: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                studentId: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                rationale: { type: Type.STRING },
              },
              required: ['studentId', 'confidence', 'rationale'],
            },
          },
        },
        required: ['detectedFacesCount', 'livenessStatus', 'livenessNote', 'matchedStudents'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    detectedFacesCount?: number;
    livenessStatus?: 'pass' | 'warn' | 'fail';
    livenessNote?: string;
    livenessScore?: number;
    matchedStudents?: Array<{ studentId: string; confidence: number; rationale: string }>;
  };

  const aiMatchedMap = new Map(
    (parsed.matchedStudents ?? []).map((m) => [m.studentId, m])
  );

  const matches: AIRecognitionMatch[] = classStudents.map((student) => {
    const found = aiMatchedMap.get(student.studentId);
    const confidence = found ? Math.max(0, Math.min(1, found.confidence)) : 0;
    const cls = classifyMatchConfidence(confidence);
    return {
      studentId: student.studentId,
      studentName: student.name,
      confidence: Number(confidence.toFixed(2)),
      classification: cls.classification,
      suggestedStatus: cls.suggestedStatus,
      livenessScore: parsed.livenessScore ?? (parsed.livenessStatus === 'pass' ? 0.94 : 0.55),
      rationale:
        found?.rationale ??
        (student.faceEnrolled
          ? 'No visual match detected against enrolled references in this frame.'
          : 'Student does not have a live portrait enrolled for visual comparison.'),
    };
  });

  return {
    mode: 'ai_vision',
    isDemo: false,
    detectedFacesCount: parsed.detectedFacesCount ?? 0,
    livenessStatus: parsed.livenessStatus ?? 'warn',
    livenessNote: parsed.livenessNote ?? 'Classroom frame analyzed via AI Vision.',
    matches,
    unmatchedCount: matches.filter((m) => m.classification === 'unmatched').length,
    processedAt: now,
  };
}
