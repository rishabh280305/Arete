import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  LmsAssignment,
  LmsAttempt,
  LmsAttendanceRecord,
  LmsClass,
  LmsEnrollment,
  LmsMaterial,
  LmsQuestion,
  LmsQuiz,
  LmsQuizAttempt,
  LmsSubmission
} from "../modules/lms/lms-state";
import type { MigrationWizard } from "../modules/migration/migration-state";

export type LocalUser = {
  id: string;
  email: string;
  displayName: string;
  roles: Array<"student" | "teacher" | "parent" | "school_admin" | "platform_admin">;
};

export type LocalMembership = {
  id: string;
  schoolId: string;
  userId: string;
  roles: LocalUser["roles"];
};

type LocalStoreData = {
  schools: Array<{ id: string; name: string; slug: string }>;
  users: LocalUser[];
  memberships: LocalMembership[];
  parentLinks: Array<{ id: string; schoolId: string; parentUserId: string; studentUserId: string; createdAt: string }>;
  classes: LmsClass[];
  assignments: LmsAssignment[];
  enrollments: LmsEnrollment[];
  attendance: LmsAttendanceRecord[];
  materials: LmsMaterial[];
  questions: LmsQuestion[];
  quizzes: LmsQuiz[];
  quizAttempts: LmsQuizAttempt[];
  attempts: LmsAttempt[];
  submissions: LmsSubmission[];
  migrations: MigrationWizard[];
  notifications: Array<{ id: string; schoolId: string; userId?: string; role?: string; message: string; read: boolean; createdAt: string }>;
  auditEvents: Array<{ id: string; schoolId: string; actorUserId: string; action: string; targetType: string; targetId?: string; createdAt: string }>;
  aiUsage: Array<{ schoolId: string; requests: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }>;
};

const storeNamespace = process.env.VITEST_WORKER_ID ? `test-${process.env.VITEST_WORKER_ID}` : "";
const storeDir = path.resolve(process.cwd(), ".arete-dev", storeNamespace);
const storePath = path.join(storeDir, "store.json");

const initialData: LocalStoreData = {
  schools: [{ id: "demo-school-northview", name: "Northview", slug: "northview" }],
  users: [
    { id: "demo-student", email: "student@arete.local", displayName: "Anika Rao", roles: ["student"] },
    { id: "demo-teacher", email: "teacher@arete.local", displayName: "Maya Iyer", roles: ["teacher"] },
    { id: "demo-parent", email: "parent@arete.local", displayName: "Dev Rao", roles: ["parent"] },
    { id: "demo-admin", email: "admin@arete.local", displayName: "Elena Carter", roles: ["school_admin"] },
    { id: "demo-owner", email: "owner@arete.local", displayName: "Rishabh", roles: ["platform_admin"] }
  ],
  memberships: [
    { id: "demo-student-membership", schoolId: "demo-school-northview", userId: "demo-student", roles: ["student"] },
    { id: "demo-teacher-membership", schoolId: "demo-school-northview", userId: "demo-teacher", roles: ["teacher"] },
    { id: "demo-parent-membership", schoolId: "demo-school-northview", userId: "demo-parent", roles: ["parent"] },
    { id: "demo-admin-membership", schoolId: "demo-school-northview", userId: "demo-admin", roles: ["school_admin"] },
    { id: "demo-owner-membership", schoolId: "demo-school-northview", userId: "demo-owner", roles: ["platform_admin"] }
  ],
  parentLinks: [
    {
      id: "parent-link-demo",
      schoolId: "demo-school-northview",
      parentUserId: "demo-parent",
      studentUserId: "demo-student",
      createdAt: new Date().toISOString()
    }
  ],
  classes: [
    {
      id: "class-8a",
      schoolId: "demo-school-northview",
      name: "Grade 8",
      section: "A",
      subject: "Mathematics",
      teacher: "Maya Iyer",
      teacherUserId: "demo-teacher",
      studentCount: 31
    },
    {
      id: "class-9b",
      schoolId: "demo-school-northview",
      name: "Grade 9",
      section: "B",
      subject: "Science",
      teacher: "Maya Iyer",
      teacherUserId: "demo-teacher",
      studentCount: 28
    }
  ],
  assignments: [
    {
      id: "assignment-1",
      schoolId: "demo-school-northview",
      classId: "class-8a",
      title: "Equation practice set",
      instructions: "Complete problems 1-12.",
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      createdByUserId: "demo-teacher",
      submissions: 18
    }
  ],
  enrollments: [
    {
      id: "enrollment-demo-student-8a",
      schoolId: "demo-school-northview",
      classId: "class-8a",
      studentUserId: "demo-student",
      studentName: "Anika Rao",
      status: "active",
      enrolledAt: new Date().toISOString()
    }
  ],
  attendance: [],
  materials: [
    {
      id: "material-1",
      schoolId: "demo-school-northview",
      classId: "class-8a",
      title: "Solving linear equations",
      kind: "note",
      content: "Balance both sides of the equation and isolate the variable.",
      uploadedByUserId: "demo-teacher",
      createdAt: new Date().toISOString()
    }
  ],
  questions: [
    {
      id: "practice-1",
      schoolId: "demo-school-northview",
      prompt: "What is x if 3x + 6 = 21?",
      options: ["3", "5", "7", "9"],
      correctIndex: 1,
      explanation: "Subtract 6 from both sides, then divide 15 by 3.",
      approved: true
    },
    {
      id: "practice-2",
      schoolId: "demo-school-northview",
      prompt: "Which expression is equivalent to 2(x + 4)?",
      options: ["2x + 4", "x + 8", "2x + 8", "4x + 2"],
      correctIndex: 2,
      explanation: "Distribute 2 to both x and 4.",
      approved: true
    },
    {
      id: "draft-1",
      schoolId: "demo-school-northview",
      prompt: "Which operation isolates x in 3x + 6 = 21?",
      options: ["Subtract 6", "Add 6", "Multiply by 3", "Divide by 6"],
      correctIndex: 0,
      explanation: "Teacher approval required before students see this.",
      approved: false
    }
  ],
  quizzes: [
    {
      id: "quiz-1",
      schoolId: "demo-school-northview",
      classId: "class-8a",
      title: "Linear equations check",
      status: "published",
      createdByUserId: "demo-teacher",
      createdAt: new Date().toISOString(),
      questions: [
        {
          id: "quiz-1-q1",
          prompt: "Solve: 2x + 4 = 12",
          options: ["2", "3", "4", "8"],
          correctIndex: 2,
          explanation: "Subtract 4, then divide 8 by 2."
        },
        {
          id: "quiz-1-q2",
          prompt: "What is the first step to solve x - 7 = 11?",
          options: ["Subtract 7", "Add 7", "Divide by 7", "Multiply by 11"],
          correctIndex: 1,
          explanation: "Add 7 to both sides."
        }
      ]
    }
  ],
  quizAttempts: [],
  attempts: [],
  submissions: [],
  migrations: [],
  notifications: [
    {
      id: "notice-1",
      schoolId: "demo-school-northview",
      role: "student",
      message: "Equation practice set is due tomorrow.",
      read: false,
      createdAt: new Date().toISOString()
    }
  ],
  auditEvents: [
    {
      id: "audit-1",
      schoolId: "demo-school-northview",
      actorUserId: "demo-admin",
      action: "school.seeded",
      targetType: "school",
      targetId: "demo-school-northview",
      createdAt: new Date().toISOString()
    }
  ],
  aiUsage: [{ schoolId: "demo-school-northview", requests: 1, inputTokens: 12340, outputTokens: 6420, estimatedCostUsd: 21.42 }]
};

function ensureStore(): void {
  if (!existsSync(storeDir)) {
    mkdirSync(storeDir, { recursive: true });
  }

  if (!existsSync(storePath)) {
    writeFileSync(storePath, JSON.stringify(initialData, null, 2));
  }
}

function normalizeStore(data: Partial<LocalStoreData>): LocalStoreData {
  return {
    ...initialData,
    ...data,
    schools: data.schools ?? initialData.schools,
    users: data.users ?? initialData.users,
    memberships: data.memberships ?? initialData.users.map((user) => ({
      id: `${user.id}-membership`,
      schoolId: "demo-school-northview",
      userId: user.id,
      roles: user.roles
    })),
    parentLinks: data.parentLinks ?? initialData.parentLinks,
    classes: data.classes ?? initialData.classes,
    assignments: data.assignments ?? initialData.assignments,
    enrollments: data.enrollments ?? initialData.enrollments,
    attendance: data.attendance ?? initialData.attendance,
    materials: data.materials ?? initialData.materials,
    questions: data.questions ?? initialData.questions,
    quizzes: data.quizzes ?? initialData.quizzes,
    quizAttempts: data.quizAttempts ?? [],
    attempts: data.attempts ?? initialData.attempts,
    submissions: data.submissions ?? [],
    migrations: data.migrations ?? initialData.migrations,
    notifications: data.notifications ?? [],
    auditEvents: data.auditEvents ?? [],
    aiUsage: data.aiUsage ?? initialData.aiUsage
  };
}

export function readLocalStore(): LocalStoreData {
  ensureStore();
  return normalizeStore(JSON.parse(readFileSync(storePath, "utf8")) as Partial<LocalStoreData>);
}

export function writeLocalStore(nextData: LocalStoreData): void {
  ensureStore();
  const tmpPath = `${storePath}.${randomUUID()}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(nextData, null, 2));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      renameSync(tmpPath, storePath);
      return;
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : undefined;
      if (code !== "EPERM" || attempt === 2) {
        throw error;
      }
      rmSync(storePath, { force: true });
    }
  }
}

export function updateLocalStore<T>(updater: (data: LocalStoreData) => T): T {
  const data = readLocalStore();
  const result = updater(data);
  writeLocalStore(data);
  return result;
}

export function recordAuditEvent(input: {
  schoolId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
}): void {
  updateLocalStore((store) => {
    store.auditEvents.unshift({
      id: `audit-${randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...input
    });
  });
}

export function createNotification(input: {
  schoolId: string;
  userId?: string;
  role?: string;
  message: string;
}): void {
  updateLocalStore((store) => {
    store.notifications.unshift({
      id: `notice-${randomUUID()}`,
      read: false,
      createdAt: new Date().toISOString(),
      ...input
    });
  });
}

export function markNotificationRead(input: { schoolId: string; userId: string; roles: string[]; id: string }) {
  return updateLocalStore((store) => {
    const notification = store.notifications.find((candidate) => {
      const sameNotice = candidate.id === input.id;
      const sameSchool = candidate.schoolId === input.schoolId;
      const targetedUser = candidate.userId ? candidate.userId === input.userId : true;
      const targetedRole = candidate.role ? input.roles.includes(candidate.role) : true;
      return sameNotice && sameSchool && targetedUser && targetedRole;
    });

    if (!notification) {
      return undefined;
    }

    notification.read = true;
    return notification;
  });
}

export function createLocalUser(input: Omit<LocalUser, "id"> & { id?: string }, schoolId = "demo-school-northview") {
  return updateLocalStore((store) => {
    const user = createOrUpdateUserInStore(store, input);
    upsertMembershipInStore(store, schoolId, user.id, input.roles);
    return user;
  });
}

export function createLocalSchool(input: { id?: string; name: string; slug: string; admin: { email: string; displayName: string } }) {
  return updateLocalStore((store) => {
    const slug = input.slug.toLowerCase();
    let school = store.schools.find((candidate) => candidate.slug === slug);
    if (!school) {
      school = { id: input.id ?? `school-${randomUUID()}`, name: input.name, slug };
      store.schools.push(school);
      store.aiUsage.push({ schoolId: school.id, requests: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 });
    }

    const admin = createOrUpdateUserInStore(store, {
      email: input.admin.email,
      displayName: input.admin.displayName,
      roles: ["school_admin"]
    });
    upsertMembershipInStore(store, school.id, admin.id, ["school_admin"]);

    return { school, admin };
  });
}

export function linkParentToStudent(input: { schoolId: string; parentUserId: string; studentUserId: string }) {
  return updateLocalStore((store) => {
    const parentMembership = store.memberships.find(
      (membership) =>
        membership.schoolId === input.schoolId &&
        membership.userId === input.parentUserId &&
        membership.roles.includes("parent")
    );
    const studentMembership = store.memberships.find(
      (membership) =>
        membership.schoolId === input.schoolId &&
        membership.userId === input.studentUserId &&
        membership.roles.includes("student")
    );
    if (!parentMembership || !studentMembership) {
      return undefined;
    }
    const existing = store.parentLinks.find(
      (link) =>
        link.schoolId === input.schoolId &&
        link.parentUserId === input.parentUserId &&
        link.studentUserId === input.studentUserId
    );
    if (existing) {
      return existing;
    }
    const link = {
      id: `parent-link-${randomUUID()}`,
      schoolId: input.schoolId,
      parentUserId: input.parentUserId,
      studentUserId: input.studentUserId,
      createdAt: new Date().toISOString()
    };
    store.parentLinks.unshift(link);
    return link;
  });
}

function createOrUpdateUserInStore(store: LocalStoreData, input: Omit<LocalUser, "id"> & { id?: string }) {
  const email = input.email.toLowerCase();
  const existing = store.users.find((candidate) => candidate.email === email);
  if (existing) {
    existing.displayName = input.displayName;
    existing.roles = input.roles;
    return existing;
  }
  const user: LocalUser = {
    ...input,
    email,
    id: input.id ?? `user-${randomUUID()}`
  };
  store.users.push(user);
  return user;
}

function upsertMembershipInStore(store: LocalStoreData, schoolId: string, userId: string, roles: LocalUser["roles"]) {
  const existing = store.memberships.find((membership) => membership.schoolId === schoolId && membership.userId === userId);
  if (existing) {
    existing.roles = roles;
    return existing;
  }
  const membership: LocalMembership = {
    id: `membership-${randomUUID()}`,
    schoolId,
    userId,
    roles
  };
  store.memberships.push(membership);
  return membership;
}

export function resetLocalStore(): LocalStoreData {
  if (!existsSync(storeDir)) {
    mkdirSync(storeDir, { recursive: true });
  }
  writeFileSync(storePath, JSON.stringify(initialData, null, 2));
  return readLocalStore();
}
