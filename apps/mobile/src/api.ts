import Constants from "expo-constants";

export type MobileDashboard = {
  school: { id: string; name: string };
  user: { displayName: string; roles: string[] };
  student: {
    streakDays: number;
    xp: number;
    dueToday: Array<{ id: string; title: string; subject: string; progress: number }>;
  };
  teacher: {
    drafts: Array<{ id: string; prompt: string; topic: string; status: "draft" | "approved" }>;
  };
  parent: {
    children: Array<{
      name: string;
      streakDays: number;
      quizAverage: string;
      assignmentsDue: number;
      focusAreas: string[];
    }>;
    announcements: string[];
  };
  admin: {
    imports: Array<{ id: string; source: string; progress: number; detected: Record<string, number> }>;
  };
  platform: {
    schools: number;
    aiRequestsToday: number;
    estimatedAiCostUsd: number;
    failedJobs: number;
  };
};

export type MobileLmsOverview = {
  classes: Array<{ id: string; name: string; section: string; subject: string; studentCount: number }>;
  enrollments: Array<{
    id: string;
    classId: string;
    studentUserId: string;
    studentName: string;
    status: "active" | "removed";
  }>;
  materials: Array<{ id: string; classId: string; title: string; kind: "link" | "note" | "file"; content: string }>;
  quizzes: Array<{
    id: string;
    classId: string;
    title: string;
    status: "draft" | "published";
    questions: Array<{ id: string; prompt: string; options: string[]; explanation: string; correctIndex?: number }>;
  }>;
  quizAttempts: Array<{ id: string; quizId: string; studentName: string; score: number; correct: number; total: number }>;
  attendance: Array<{
    id: string;
    classId: string;
    date: string;
    studentUserId: string;
    studentName: string;
    status: "present" | "absent" | "late" | "excused";
    note?: string;
    markedAt: string;
  }>;
  attendanceSummary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    presentRate: number;
  };
  questionBank: Array<{
    id: string;
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    approved: boolean;
    topic?: string;
    source?: "manual" | "ai";
  }>;
  leaderboard: Array<{ studentUserId: string; studentName: string; xp: number; average: number; attempts: number }>;
  gradebook: Array<{
    studentUserId: string;
    studentName: string;
    classes: string[];
    assignmentsSubmitted: number;
    assignmentsTotal: number;
    missingAssignments: number;
    assignmentAverage: number;
    quizAverage: number;
    quizAttempts: number;
    practiceAccuracy: number;
    xp: number;
    level: number;
  }>;
  assignments: Array<{ id: string; title: string; dueAt: string; submissions: number }>;
  submissions: Array<{
    id: string;
    assignmentId: string;
    studentName: string;
    response: string;
    status: "submitted" | "graded";
    score?: number;
    feedback?: string;
  }>;
  practice: Array<{ id: string; prompt: string; options: string[] }>;
  progress: { attempts: number; accuracy: number; xp: number; level: number; streakDays: number; achievements: string[] };
};

export type MobileActivity = {
  notifications: Array<{ id: string; message: string; read: boolean; createdAt: string }>;
  auditEvents: Array<{ id: string; action: string; targetType: string; targetId?: string; createdAt: string }>;
};

export type MobileMigrationSource = {
  id: "google_classroom" | "microsoft_education" | "csv" | "excel" | "manual";
  label: string;
  automaticImport: string[];
};

export type MobileMigrationWizard = {
  id: string;
  source: MobileMigrationSource["id"];
  step: "source" | "analyzed" | "mapped" | "validated" | "committed";
  detected: Record<string, number>;
  issues: Array<{ row: number; field: string; message: string; severity: "warning" | "error" }>;
  canCommit?: boolean;
  imported?: { users: number; classes: number; enrollments: number; parentLinks: number; materials: number; assignments: number };
};

export type MobilePerson = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
};

const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "http://localhost:4000/api/v1";
const apiBaseUrl = configuredApiBaseUrl.replace(/\/$/, "");

export async function loginMobile(email: string, role: string, schoolSlug = "northview") {
  await fetch(`${apiBaseUrl}/auth/dev/seed`, { method: "POST" });
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Arete@12345", schoolSlug, role })
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  return response.json() as Promise<{ accessToken: string }>;
}

export async function createMobileSchool(input: {
  name: string;
  slug: string;
  adminEmail: string;
  adminName: string;
}): Promise<{ school: { id: string; name: string; slug: string }; admin: MobilePerson }> {
  const response = await fetch(`${apiBaseUrl}/people/schools`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("School save failed");
  }

  return response.json() as Promise<{ school: { id: string; name: string; slug: string }; admin: MobilePerson }>;
}

export async function linkMobileParent(
  token: string,
  input: { parentUserId: string; studentUserId: string }
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/people/parent-links`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Parent link failed");
  }
}

export async function fetchMobileDashboard(token: string): Promise<MobileDashboard> {
  const response = await fetch(`${apiBaseUrl}/dashboard`, {
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Dashboard failed");
  }

  return response.json() as Promise<MobileDashboard>;
}

export async function approveMobileQuestion(token: string, id: string): Promise<void> {
  await fetch(`${apiBaseUrl}/dashboard/questions/${id}/approve`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
}

export async function createMobileAssignment(
  token: string,
  input: { classId: string; title: string; instructions: string; dueAt: string }
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/lms/assignments`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Assignment failed");
  }
}

export async function createMobileClass(
  token: string,
  input: { name: string; section: string; subject: string; teacherUserId?: string }
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/lms/classes`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Class save failed");
  }
}

export async function enrollMobileStudent(
  token: string,
  input: { classId: string; studentUserId: string }
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/lms/classes/enrollments`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Enrollment failed");
  }
}

export async function markMobileAttendance(
  token: string,
  input: {
    classId: string;
    date: string;
    records: Array<{ studentUserId: string; status: "present" | "absent" | "late" | "excused"; note?: string }>;
  }
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/lms/attendance`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Attendance save failed");
  }
}

export async function createMobileMaterial(
  token: string,
  input: { classId: string; title: string; kind: "link" | "note" | "file"; content: string }
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/lms/materials`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Material failed");
  }
}

export async function createMobileQuiz(
  token: string,
  input: {
    classId: string;
    title: string;
    questions: Array<{ prompt: string; options: string[]; correctIndex: number; explanation: string }>;
  }
): Promise<{ id: string }> {
  const response = await fetch(`${apiBaseUrl}/lms/quizzes`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Quiz failed");
  }
  return response.json() as Promise<{ id: string }>;
}

export async function createMobileQuizFromBank(
  token: string,
  input: { classId: string; title: string; questionIds: string[] }
): Promise<{ id: string }> {
  const response = await fetch(`${apiBaseUrl}/lms/quizzes/from-bank`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Bank quiz failed");
  }
  return response.json() as Promise<{ id: string }>;
}

export async function publishMobileQuiz(token: string, id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/lms/quizzes/${id}/publish`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Publish failed");
  }
}

export async function submitMobileQuiz(
  token: string,
  input: { quizId: string; answers: number[] }
): Promise<{ score: number; correct: number; total: number }> {
  const response = await fetch(`${apiBaseUrl}/lms/quizzes/attempts`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Quiz submit failed");
  }
  return response.json() as Promise<{ score: number; correct: number; total: number }>;
}

export async function generateMobileAiDrafts(
  token: string,
  input: { topic: string; questionCount: number }
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/lms/ai/drafts`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Draft generation failed");
  }
}

export async function startMobileImport(token: string, id: string): Promise<void> {
  await fetch(`${apiBaseUrl}/dashboard/imports/${id}/start`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
}

export async function fetchMobileLms(token: string): Promise<MobileLmsOverview> {
  const response = await fetch(`${apiBaseUrl}/lms/overview`, {
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("LMS overview failed");
  }

  return response.json() as Promise<MobileLmsOverview>;
}

export async function fetchMobileActivity(token: string): Promise<MobileActivity> {
  const response = await fetch(`${apiBaseUrl}/activity`, {
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Activity failed");
  }

  return response.json() as Promise<MobileActivity>;
}

export async function markMobileNotificationRead(token: string, id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/activity/notifications/${id}/read`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Notification update failed");
  }
}

export async function fetchMobilePeople(token: string): Promise<MobilePerson[]> {
  const response = await fetch(`${apiBaseUrl}/people`, {
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    return [];
  }

  return response.json() as Promise<MobilePerson[]>;
}

export async function createMobilePerson(
  token: string,
  input: { email: string; displayName: string; roles: string[] }
): Promise<MobilePerson> {
  const response = await fetch(`${apiBaseUrl}/people`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Person save failed");
  }

  return response.json() as Promise<MobilePerson>;
}

export async function fetchMobileMigrationSources(): Promise<MobileMigrationSource[]> {
  const response = await fetch(`${apiBaseUrl}/migration/sources`);

  if (!response.ok) {
    throw new Error("Sources failed");
  }

  return response.json() as Promise<MobileMigrationSource[]>;
}

export async function createMobileMigrationWizard(
  token: string,
  source: MobileMigrationSource["id"]
): Promise<MobileMigrationWizard> {
  const response = await fetch(`${apiBaseUrl}/migration/wizards`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ source })
  });

  if (!response.ok) {
    throw new Error("Migration wizard failed");
  }

  return response.json() as Promise<MobileMigrationWizard>;
}

export async function analyzeMobileMigration(token: string, id: string): Promise<MobileMigrationWizard> {
  const response = await fetch(`${apiBaseUrl}/migration/wizards/${id}/analyze`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Analyze failed");
  }

  return response.json() as Promise<MobileMigrationWizard>;
}

export async function skipInvalidMobileRows(token: string, id: string): Promise<MobileMigrationWizard> {
  const response = await fetch(`${apiBaseUrl}/migration/wizards/${id}/skip-invalid`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Skip rows failed");
  }

  return response.json() as Promise<MobileMigrationWizard>;
}

export async function commitMobileMigration(token: string, id: string): Promise<MobileMigrationWizard> {
  const response = await fetch(`${apiBaseUrl}/migration/wizards/${id}/commit`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Commit failed");
  }

  return response.json() as Promise<MobileMigrationWizard>;
}

export async function submitMobilePractice(
  token: string,
  input: { questionId: string; selectedIndex: number }
): Promise<{ correct: boolean; explanation: string }> {
  const response = await fetch(`${apiBaseUrl}/lms/practice/attempts`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Practice attempt failed");
  }

  return response.json() as Promise<{ correct: boolean; explanation: string }>;
}

export async function submitMobileAssignment(
  token: string,
  input: { assignmentId: string; response: string }
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/lms/assignments/submissions`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Assignment submit failed");
  }
}

export async function gradeMobileSubmission(
  token: string,
  input: { submissionId: string; score: number; feedback: string }
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/lms/assignments/submissions/grade`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Grade failed");
  }
}
