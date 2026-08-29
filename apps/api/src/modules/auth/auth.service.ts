import { Injectable } from "@nestjs/common";
import { Difficulty, ImportJobStatus, ImportSource, MembershipStatus, QuestionType, UserRole } from "@prisma/client";
import { hashPassword, signAccessToken, verifyPassword } from "@arete/auth";
import { prisma } from "@arete/database";
import type { ActiveTenantContext, UserRole as ClientRole } from "@arete/types";
import { createLocalUser, readLocalStore, resetLocalStore } from "../../dev-store/local-store";

const devAccessSecret =
  process.env.JWT_ACCESS_SECRET ?? "development_access_secret_change_before_production";

const demoPassword = "Arete@12345";

const roleMap: Record<UserRole, ClientRole> = {
  STUDENT: "student",
  TEACHER: "teacher",
  PARENT: "parent",
  SCHOOL_ADMIN: "school_admin",
  PLATFORM_ADMIN: "platform_admin"
};

function toClientRoles(roles: UserRole[]): ClientRole[] {
  return roles.map((role) => roleMap[role]);
}

function fromClientRole(role?: string): UserRole | undefined {
  const normalized = role?.toUpperCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === "SCHOOL_ADMIN") {
    return UserRole.SCHOOL_ADMIN;
  }
  if (normalized === "PLATFORM_ADMIN") {
    return UserRole.PLATFORM_ADMIN;
  }

  return Object.values(UserRole).find((candidate) => candidate === normalized);
}

@Injectable()
export class AuthService {
  async seedDemoData() {
    const passwordHash = await hashPassword(demoPassword);

    const school = await prisma.school.upsert({
      where: { slug: "northview" },
      update: {},
      create: {
        name: "Northview",
        slug: "northview",
        settings: {
          parentAccess: true,
          leaderboardVisible: false,
          aiMonthlyQuestionLimit: 5000,
          fileUploadLimitMb: 100
        }
      }
    });

    const [student, teacher, parent, admin, owner] = await Promise.all([
      this.upsertUser("student@arete.local", "Anika Rao", passwordHash),
      this.upsertUser("teacher@arete.local", "Maya Iyer", passwordHash),
      this.upsertUser("parent@arete.local", "Dev Rao", passwordHash),
      this.upsertUser("admin@arete.local", "Elena Carter", passwordHash),
      this.upsertUser("owner@arete.local", "Rishabh", passwordHash)
    ]);

    const studentMembership = await this.upsertMembership(school.id, student.id, [UserRole.STUDENT]);
    const teacherMembership = await this.upsertMembership(school.id, teacher.id, [UserRole.TEACHER]);
    const parentMembership = await this.upsertMembership(school.id, parent.id, [UserRole.PARENT]);
    await this.upsertMembership(school.id, admin.id, [UserRole.SCHOOL_ADMIN]);
    await this.upsertMembership(school.id, owner.id, [UserRole.PLATFORM_ADMIN]);

    const math = await prisma.subject.upsert({
      where: { schoolId_name: { schoolId: school.id, name: "Mathematics" } },
      update: {},
      create: { schoolId: school.id, name: "Mathematics", code: "MATH" }
    });

    const science = await prisma.subject.upsert({
      where: { schoolId_name: { schoolId: school.id, name: "Science" } },
      update: {},
      create: { schoolId: school.id, name: "Science", code: "SCI" }
    });

    const class8a = await prisma.class.upsert({
      where: { schoolId_name_section: { schoolId: school.id, name: "Grade 8", section: "A" } },
      update: {},
      create: { schoolId: school.id, name: "Grade 8", grade: "8", section: "A" }
    });

    await prisma.enrollment.upsert({
      where: {
        schoolId_classId_studentMembershipId: {
          schoolId: school.id,
          classId: class8a.id,
          studentMembershipId: studentMembership.id
        }
      },
      update: {},
      create: { schoolId: school.id, classId: class8a.id, studentMembershipId: studentMembership.id }
    });

    await prisma.teacherAssignment.upsert({
      where: {
        schoolId_classId_subjectId_teacherMembershipId: {
          schoolId: school.id,
          classId: class8a.id,
          subjectId: math.id,
          teacherMembershipId: teacherMembership.id
        }
      },
      update: {},
      create: {
        schoolId: school.id,
        classId: class8a.id,
        subjectId: math.id,
        teacherMembershipId: teacherMembership.id
      }
    });

    await prisma.parentStudentLink.upsert({
      where: {
        schoolId_parentMembershipId_studentMembershipId: {
          schoolId: school.id,
          parentMembershipId: parentMembership.id,
          studentMembershipId: studentMembership.id
        }
      },
      update: {},
      create: {
        schoolId: school.id,
        parentMembershipId: parentMembership.id,
        studentMembershipId: studentMembership.id
      }
    });

    const algebra = await prisma.topic.create({
      data: { schoolId: school.id, subjectId: math.id, title: `Linear equations ${Date.now()}`, order: 1 }
    });

    await prisma.learningMaterial.createMany({
      data: [
        {
          schoolId: school.id,
          subjectId: math.id,
          topicId: algebra.id,
          title: "Solving equations notes",
          description: "Teacher-uploaded chapter notes",
          publishedAt: new Date(),
          createdByMembershipId: teacherMembership.id
        },
        {
          schoolId: school.id,
          subjectId: science.id,
          title: "Photosynthesis reading",
          publishedAt: new Date(),
          createdByMembershipId: teacherMembership.id
        }
      ]
    });

    await prisma.assignment.create({
      data: {
        schoolId: school.id,
        classId: class8a.id,
        subjectId: math.id,
        title: "Equation practice set",
        instructions: "Complete problems 1-12.",
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        publishedAt: new Date(),
        createdByMembershipId: teacherMembership.id
      }
    });

    await prisma.question.createMany({
      data: [
        {
          schoolId: school.id,
          subjectId: math.id,
          topicId: algebra.id,
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: Difficulty.MEDIUM,
          prompt: "Which operation isolates x in 3x + 6 = 21?",
          answer: { correct: "Subtract 6, then divide by 3" },
          explanation: "Undo addition before division.",
          createdByMembershipId: teacherMembership.id
        },
        {
          schoolId: school.id,
          subjectId: science.id,
          type: QuestionType.TRUE_FALSE,
          difficulty: Difficulty.EASY,
          prompt: "The nucleus contains most of a cell's genetic material.",
          answer: { correct: true },
          explanation: "DNA is stored mainly in the nucleus.",
          createdByMembershipId: teacherMembership.id
        },
        {
          schoolId: school.id,
          subjectId: math.id,
          topicId: algebra.id,
          type: QuestionType.SHORT_ANSWER,
          difficulty: Difficulty.HARD,
          prompt: "Explain why inverse operations solve linear equations.",
          answer: { rubric: "Mentions preserving equality while undoing operations." },
          explanation: "Each inverse step keeps both sides equivalent.",
          approvedAt: new Date(),
          createdByMembershipId: teacherMembership.id
        }
      ]
    });

    await prisma.importJob.create({
      data: {
        schoolId: school.id,
        source: ImportSource.CSV,
        status: ImportJobStatus.PREVIEW_READY,
        initiatedByMembershipId: teacherMembership.id,
        mapping: { email: "student.email", name: "student.full_name", class: "class.name" },
        preview: {
          students: 418,
          teachers: 32,
          classes: 18,
          subjects: 11,
          enrollments: 1226,
          invalidRecords: 7
        }
      }
    });

    await prisma.aiUsageRecord.create({
      data: {
        schoolId: school.id,
        feature: "quiz_generation",
        provider: "openai",
        model: "configured-later",
        inputTokens: 12340,
        outputTokens: 6420,
        estimatedCostUsd: 21.42
      }
    });

    await prisma.auditLog.create({
      data: {
        schoolId: school.id,
        actorUserId: admin.id,
        action: "demo.seeded",
        targetType: "school",
        targetId: school.id
      }
    });

    return {
      ok: true,
      school: school.slug,
      password: demoPassword,
      accounts: [
        "student@arete.local",
        "teacher@arete.local",
        "parent@arete.local",
        "admin@arete.local",
        "owner@arete.local"
      ]
    };
  }

  async login(body: { email: string; password: string; schoolSlug?: string; role?: string }) {
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: {
        memberships: {
          include: { school: true }
        }
      }
    });

    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, body.password))) {
      return null;
    }

    const requestedRole = fromClientRole(body.role);
    const membership = user.memberships.find((candidate) => {
      const schoolMatches = body.schoolSlug ? candidate.school.slug === body.schoolSlug : true;
      const roleMatches = requestedRole ? candidate.roles.includes(requestedRole) : true;
      return schoolMatches && roleMatches && candidate.status === MembershipStatus.ACTIVE;
    });

    if (!membership) {
      return null;
    }

    const roles = toClientRoles(membership.roles);
    const accessToken = await signAccessToken(
      {
        schoolId: membership.schoolId,
        userId: user.id,
        membershipId: membership.id,
        roles
      },
      devAccessSecret
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      },
      activeContext: {
        schoolId: membership.schoolId,
        schoolName: membership.school.name,
        membershipId: membership.id,
        roles
      }
    };
  }

  async clerkLogin(body: { email: string; displayName: string; schoolSlug?: string; role: string }) {
    const requestedRole = fromClientRole(body.role);
    if (!requestedRole) {
      return null;
    }

    const school = await prisma.school.upsert({
      where: { slug: body.schoolSlug ?? "northview" },
      update: {},
      create: {
        name: body.schoolSlug === "northview" || !body.schoolSlug ? "Northview" : body.schoolSlug,
        slug: body.schoolSlug ?? "northview",
        settings: {}
      }
    });
    const user = await prisma.user.upsert({
      where: { email: body.email.toLowerCase() },
      update: { displayName: body.displayName, emailVerifiedAt: new Date() },
      create: { email: body.email.toLowerCase(), displayName: body.displayName, emailVerifiedAt: new Date() }
    });
    const membership = await prisma.membership.upsert({
      where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
      update: { roles: [requestedRole], status: MembershipStatus.ACTIVE },
      create: { schoolId: school.id, userId: user.id, roles: [requestedRole], status: MembershipStatus.ACTIVE }
    });
    const roles = toClientRoles(membership.roles);
    const accessToken = await signAccessToken(
      {
        schoolId: membership.schoolId,
        userId: user.id,
        membershipId: membership.id,
        roles
      },
      devAccessSecret
    );

    return {
      accessToken,
      user: { id: user.id, email: user.email, displayName: user.displayName },
      activeContext: {
        schoolId: membership.schoolId,
        schoolName: school.name,
        membershipId: membership.id,
        roles
      }
    };
  }

  async me(context: ActiveTenantContext) {
    const membership = await prisma.membership.findUnique({
      where: { id: context.membershipId },
      include: { user: true, school: true }
    });

    return {
      user: membership
        ? { id: membership.user.id, email: membership.user.email, displayName: membership.user.displayName }
        : null,
      school: membership ? { id: membership.school.id, name: membership.school.name } : null,
      roles: context.roles
    };
  }

  async fallbackLogin(body: { email: string; password: string; role?: string; schoolSlug?: string }) {
    if (body.password !== demoPassword) {
      return null;
    }

    const store = readLocalStore();
    const account = store.users.find((user) => user.email === body.email.toLowerCase());
    const school = store.schools.find((candidate) => candidate.slug === (body.schoolSlug ?? "northview"));

    if (!account || !school) {
      return null;
    }

    const requestedRole = body.role as ClientRole | undefined;
    const membership = store.memberships.find((candidate) => candidate.schoolId === school.id && candidate.userId === account.id);
    if (!membership || (requestedRole && !membership.roles.includes(requestedRole))) {
      return null;
    }

    const accessToken = await signAccessToken(
      {
        schoolId: school.id,
        userId: account.id,
        membershipId: membership.id,
        roles: membership.roles
      },
      devAccessSecret
    );

    return {
      accessToken,
      user: {
        id: account.id,
        email: body.email.toLowerCase(),
        displayName: account.displayName
      },
      activeContext: {
        schoolId: school.id,
        schoolName: school.name,
        membershipId: membership.id,
        roles: membership.roles
      }
    };
  }

  async fallbackClerkLogin(body: { email: string; displayName: string; role: string; schoolSlug?: string }) {
    const store = readLocalStore();
    const school = store.schools.find((candidate) => candidate.slug === (body.schoolSlug ?? "northview")) ?? store.schools[0];
    if (!school) {
      return null;
    }
    const role = body.role as ClientRole;
    const user = createLocalUser({ email: body.email, displayName: body.displayName, roles: [role] }, school.id);
    const membership = readLocalStore().memberships.find(
      (candidate) => candidate.schoolId === school.id && candidate.userId === user.id
    );
    if (!membership) {
      return null;
    }
    const accessToken = await signAccessToken(
      {
        schoolId: school.id,
        userId: user.id,
        membershipId: membership.id,
        roles: membership.roles
      },
      devAccessSecret
    );
    return {
      accessToken,
      user: { id: user.id, email: user.email, displayName: user.displayName },
      activeContext: {
        schoolId: school.id,
        schoolName: school.name,
        membershipId: membership.id,
        roles: membership.roles
      }
    };
  }

  fallbackMe(context: ActiveTenantContext) {
    const store = readLocalStore();
    const user = store.users.find((candidate) => candidate.id === context.userId);
    const school = store.schools.find((candidate) => candidate.id === context.schoolId);

    return {
      user: {
        id: context.userId,
        email: user?.email ?? `${context.roles[0]}@arete.local`,
        displayName: user?.displayName ?? "Demo User"
      },
      school: { id: context.schoolId, name: school?.name ?? "Northview" },
      roles: context.roles
    };
  }

  seedFallbackData() {
    const store = resetLocalStore();
    return {
      ok: true,
      mode: "development-fallback",
      school: store.schools[0]?.slug ?? "northview",
      password: demoPassword,
      accounts: store.users.map((user) => user.email)
    };
  }

  private upsertUser(email: string, displayName: string, passwordHash: string) {
    return prisma.user.upsert({
      where: { email },
      update: { displayName, passwordHash, emailVerifiedAt: new Date() },
      create: { email, displayName, passwordHash, emailVerifiedAt: new Date() }
    });
  }

  private upsertMembership(schoolId: string, userId: string, roles: UserRole[]) {
    return prisma.membership.upsert({
      where: { schoolId_userId: { schoolId, userId } },
      update: { roles, status: MembershipStatus.ACTIVE },
      create: { schoolId, userId, roles, status: MembershipStatus.ACTIVE }
    });
  }
}
