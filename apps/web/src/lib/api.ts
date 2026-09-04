export type AreteDashboard = {
  school: { id: string; name: string };
  user: {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
  };
  metrics: Array<{ label: string; value: number | string; delta: string }>;
  student: {
    streakDays: number;
    xp: number;
    level: number;
    dueToday: Array<{ id: string; title: string; subject: string; progress: number }>;
    weakAreas: string[];
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
  teacher: {
    drafts: Array<{
      id: string;
      topic: string;
      type: string;
      difficulty: string;
      prompt: string;
      status: "draft" | "approved";
    }>;
    approvedQuestions: number;
    classSignals: Array<{ label: string; value: string; severity: string }>;
  };
  admin: {
    imports: Array<{
      id: string;
      source: string;
      status: string;
      detected: Record<string, number>;
      progress: number;
    }>;
    tenantControls: string[];
  };
  platform: {
    schools: number;
    aiRequestsToday: number;
    inputTokens: number;
    outputTokens: number;
    estimatedAiCostUsd: number;
    failedJobs: number;
  };
  operational?: {
    users: number;
    classes: number;
    enrollments: number;
    materials: number;
    quizzes: number;
    quizAttempts: number;
    submissions: number;
  };
};

export type LoginResult = {
  accessToken: string;
  user: { id: string; email: string; displayName: string };
  activeContext: {
    schoolId: string;
    schoolName: string;
    membershipId: string;
    roles: string[];
  };
};

export type LmsOverview = {
  classes: Array<{
    id: string;
    name: string;
    section: string;
    subject: string;
    teacher: string;
    studentCount: number;
  }>;
  enrollments: Array<{
    id: string;
    classId: string;
    studentUserId: string;
    studentName: string;
    status: "active" | "removed";
  }>;
  materials: Array<{
    id: string;
    classId: string;
    title: string;
    kind: "link" | "note" | "file";
    content: string;
    filename?: string;
    contentType?: string;
    byteSize?: number;
    storageKey?: string;
    createdAt: string;
  }>;
  quizzes: Array<{
    id: string;
    classId: string;
    title: string;
    status: "draft" | "published";
    questions: Array<{
      id: string;
      prompt: string;
      options: string[];
      explanation: string;
      correctIndex?: number;
    }>;
  }>;
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
  quizAttempts: Array<{
    id: string;
    quizId: string;
    studentName: string;
    score: number;
    correct: number;
    total: number;
    submittedAt: string;
  }>;
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
  leaderboard: Array<{
    studentUserId: string;
    studentName: string;
    xp: number;
    average: number;
    attempts: number;
  }>;
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
  students: Array<{
    id: string;
    displayName: string;
    email: string;
  }>;
  assignments: Array<{
    id: string;
    classId: string;
    title: string;
    instructions: string;
    dueAt: string;
    submissions: number;
  }>;
  submissions: Array<{
    id: string;
    assignmentId: string;
    studentUserId: string;
    studentName: string;
    response: string;
    status: "submitted" | "graded";
    score?: number;
    feedback?: string;
    submittedAt: string;
  }>;
  practice: Array<{
    id: string;
    prompt: string;
    options: string[];
    explanation: string;
    approved: boolean;
  }>;
  progress: {
    attempts: number;
    correct: number;
    accuracy: number;
    xp: number;
    level: number;
    streakDays: number;
    achievements: string[];
  };
};

export type MigrationSource = {
  id: "google_classroom" | "microsoft_education" | "csv" | "excel" | "manual";
  label: string;
  automaticImport: string[];
};

export type MigrationWizard = {
  id: string;
  source: MigrationSource["id"];
  step: "source" | "analyzed" | "mapped" | "validated" | "committed";
  detected: Record<string, number>;
  mappings: Array<{ sourceField: string; targetField: string; confidence: number }>;
  issues: Array<{ row: number; field: string; message: string; severity: "warning" | "error" }>;
  canCommit?: boolean;
  imported?: {
    users: number;
    classes: number;
    enrollments: number;
    parentLinks: number;
    materials: number;
    assignments: number;
  };
};

export type ActivityFeed = {
  notifications: Array<{
    id: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
  auditEvents: Array<{
    id: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId?: string;
    createdAt: string;
  }>;
};

export type Person = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
};

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function apiUrl(path: string): string {
  const baseUrl = typeof window === "undefined" ? configuredApiBaseUrl : "/api/arete/proxy";
  return `${baseUrl}${path}`;
}

export async function seedDemoData(): Promise<void> {
  const response = await fetch(apiUrl("/auth/dev/seed"), { method: "POST" });
  if (!response.ok) {
    throw new Error("Demo accounts could not be created");
  }
}

export async function resetDemoData(): Promise<void> {
  await seedDemoData();
}

export async function login(email: string, password: string, role: string, schoolSlug = "northview"): Promise<LoginResult> {
  const response = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, schoolSlug, role })
  });
  if (!response.ok) {
    throw new Error("Login failed");
  }

  return response.json() as Promise<LoginResult>;
}

export async function createClerkSession(role: string, schoolSlug = "northview"): Promise<LoginResult> {
  const response = await fetch("/api/arete/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role, schoolSlug })
  });
  if (!response.ok) {
    throw new Error("Signed-in session could not be opened");
  }

  return response.json() as Promise<LoginResult>;
}

export async function fetchDashboard(token: string): Promise<AreteDashboard> {
  const response = await fetch(apiUrl("/dashboard"), {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Dashboard data could not be loaded");
  }

  return response.json() as Promise<AreteDashboard>;
}

export async function approveQuestion(token: string, id: string): Promise<void> {
  const response = await fetch(apiUrl(`/dashboard/questions/${id}/approve`), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Question could not be approved");
  }
}

export async function startImport(token: string, id: string): Promise<void> {
  const response = await fetch(apiUrl(`/dashboard/imports/${id}/start`), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Import could not be started");
  }
}

export async function fetchLmsOverview(token: string): Promise<LmsOverview> {
  const response = await fetch(apiUrl("/lms/overview"), {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("LMS data could not be loaded");
  }

  return response.json() as Promise<LmsOverview>;
}

export async function fetchActivity(token: string): Promise<ActivityFeed> {
  const response = await fetch(apiUrl("/activity"), {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Activity could not be loaded");
  }

  return response.json() as Promise<ActivityFeed>;
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  const response = await fetch(apiUrl(`/activity/notifications/${id}/read`), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Notification could not be updated");
  }
}

export async function fetchPeople(token: string): Promise<Person[]> {
  const response = await fetch(apiUrl("/people"), {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("People could not be loaded");
  }

  return response.json() as Promise<Person[]>;
}

export async function createPerson(
  token: string,
  input: { email: string; displayName: string; roles: string[] }
): Promise<Person> {
  const response = await fetch(apiUrl("/people"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Person could not be saved");
  }

  return response.json() as Promise<Person>;
}

export async function createSchool(input: {
  token: string;
  name: string;
  slug: string;
  adminEmail: string;
  adminName: string;
  initialPassword: string;
}): Promise<{ school: { id: string; name: string; slug: string }; admin: Person }> {
  const response = await fetch(apiUrl("/people/schools"), {
    method: "POST",
    headers: { authorization: `Bearer ${input.token}`, "content-type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      slug: input.slug,
      adminEmail: input.adminEmail,
      adminName: input.adminName,
      initialPassword: input.initialPassword
    })
  });
  if (!response.ok) {
    throw new Error("School could not be created");
  }

  return response.json() as Promise<{ school: { id: string; name: string; slug: string }; admin: Person }>;
}

export async function switchSchool(token: string, schoolSlug: string): Promise<LoginResult> {
  const response = await fetch(apiUrl("/auth/switch-school"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ schoolSlug })
  });
  if (!response.ok) {
    throw new Error("School workspace could not be opened");
  }
  return response.json() as Promise<LoginResult>;
}

export async function linkParent(token: string, input: { parentUserId: string; studentUserId: string }): Promise<void> {
  const response = await fetch(apiUrl("/people/parent-links"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Parent could not be linked");
  }
}

export async function createAssignment(
  token: string,
  input: { classId: string; title: string; instructions: string; dueAt: string }
): Promise<void> {
  const response = await fetch(apiUrl("/lms/assignments"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Assignment could not be created");
  }
}

export async function enrollStudent(
  token: string,
  input: { classId: string; studentUserId: string }
): Promise<void> {
  const response = await fetch(apiUrl("/lms/classes/enrollments"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Student could not be enrolled");
  }
}

export async function markAttendance(
  token: string,
  input: {
    classId: string;
    date: string;
    records: Array<{ studentUserId: string; status: "present" | "absent" | "late" | "excused"; note?: string }>;
  }
): Promise<void> {
  const response = await fetch(apiUrl("/lms/attendance"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Attendance could not be saved");
  }
}

export async function createClass(
  token: string,
  input: { name: string; section: string; subject: string; teacherUserId?: string }
): Promise<void> {
  const response = await fetch(apiUrl("/lms/classes"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Class could not be created");
  }
}

export async function createMaterial(
  token: string,
  input: { classId: string; title: string; kind: "link" | "note" | "file"; content: string }
): Promise<void> {
  const response = await fetch(apiUrl("/lms/materials"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Material could not be saved");
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File could not be read"));
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.includes(",") ? (value.split(",")[1] ?? "") : value);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadMaterialFile(
  token: string,
  input: { classId: string; title: string; file: File }
): Promise<void> {
  const dataBase64 = await fileToBase64(input.file);
  const response = await fetch(apiUrl("/lms/materials/upload"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      classId: input.classId,
      title: input.title,
      filename: input.file.name,
      contentType: input.file.type || "application/octet-stream",
      dataBase64
    })
  });
  if (!response.ok) {
    throw new Error("File could not be uploaded");
  }
}

export async function downloadMaterialFile(token: string, materialId: string, filename: string): Promise<void> {
  const response = await fetch(apiUrl(`/lms/materials/${materialId}/download`), {
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("File could not be downloaded");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function createQuiz(
  token: string,
  input: {
    classId: string;
    title: string;
    questions: Array<{ prompt: string; options: string[]; correctIndex: number; explanation: string }>;
  }
): Promise<{ id: string }> {
  const response = await fetch(apiUrl("/lms/quizzes"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Quiz could not be created");
  }
  return response.json() as Promise<{ id: string }>;
}

export async function createQuizFromBank(
  token: string,
  input: { classId: string; title: string; questionIds: string[] }
): Promise<{ id: string }> {
  const response = await fetch(apiUrl("/lms/quizzes/from-bank"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Quiz could not be created from question bank");
  }
  return response.json() as Promise<{ id: string }>;
}

export async function publishQuiz(token: string, id: string): Promise<void> {
  const response = await fetch(apiUrl(`/lms/quizzes/${id}/publish`), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Quiz could not be published");
  }
}

export async function submitQuiz(
  token: string,
  input: { quizId: string; answers: number[] }
): Promise<{ score: number; correct: number; total: number }> {
  const response = await fetch(apiUrl("/lms/quizzes/attempts"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Quiz could not be submitted");
  }
  return response.json() as Promise<{ score: number; correct: number; total: number }>;
}

export async function submitPracticeAttempt(
  token: string,
  input: { questionId: string; selectedIndex: number }
): Promise<{ correct: boolean; explanation: string }> {
  const response = await fetch(apiUrl("/lms/practice/attempts"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Practice answer could not be submitted");
  }

  return response.json() as Promise<{ correct: boolean; explanation: string }>;
}

export async function submitAssignment(
  token: string,
  input: { assignmentId: string; response: string }
): Promise<void> {
  const response = await fetch(apiUrl("/lms/assignments/submissions"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Assignment could not be submitted");
  }
}

export async function gradeSubmission(
  token: string,
  input: { submissionId: string; score: number; feedback: string }
): Promise<void> {
  const response = await fetch(apiUrl("/lms/assignments/submissions/grade"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Submission could not be graded");
  }
}

export async function generateAiDrafts(
  token: string,
  input: { topic: string; questionCount: number }
): Promise<void> {
  const response = await fetch(apiUrl("/lms/ai/drafts"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("AI drafts could not be generated");
  }
}

export async function fetchMigrationSources(): Promise<MigrationSource[]> {
  const response = await fetch(apiUrl("/migration/sources"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Migration sources could not be loaded");
  }

  return response.json() as Promise<MigrationSource[]>;
}

export async function createMigrationWizard(
  token: string,
  source: MigrationSource["id"]
): Promise<MigrationWizard> {
  const response = await fetch(apiUrl("/migration/wizards"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ source })
  });
  if (!response.ok) {
    throw new Error("Migration could not be created");
  }

  return response.json() as Promise<MigrationWizard>;
}

export async function analyzeMigration(token: string, id: string): Promise<MigrationWizard> {
  const response = await fetch(apiUrl(`/migration/wizards/${id}/analyze`), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Migration could not be analyzed");
  }

  return response.json() as Promise<MigrationWizard>;
}

export async function validateMigration(token: string, id: string): Promise<MigrationWizard> {
  const response = await fetch(apiUrl(`/migration/wizards/${id}/validate`), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Migration could not be validated");
  }

  return response.json() as Promise<MigrationWizard>;
}

export async function skipInvalidMigrationRows(token: string, id: string): Promise<MigrationWizard> {
  const response = await fetch(apiUrl(`/migration/wizards/${id}/skip-invalid`), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Invalid rows could not be skipped");
  }

  return response.json() as Promise<MigrationWizard>;
}

export async function commitMigration(token: string, id: string): Promise<MigrationWizard> {
  const response = await fetch(apiUrl(`/migration/wizards/${id}/commit`), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Migration could not be committed");
  }

  return response.json() as Promise<MigrationWizard>;
}
