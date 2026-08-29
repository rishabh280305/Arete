import { ForbiddenException, Injectable } from "@nestjs/common";
import { ImportJobStatus, UserRole } from "@prisma/client";
import { prisma } from "@arete/database";
import type { ActiveTenantContext } from "@arete/types";
import { demoState } from "../demo/demo-state";
import { hasPermission } from "@arete/permissions";
import { lmsState } from "../lms/lms-state";
import { migrationState } from "../migration/migration-state";
import { readLocalStore } from "../../dev-store/local-store";

@Injectable()
export class DashboardService {
  async getDashboard(context: ActiveTenantContext) {
    try {
      return await this.getDatabaseDashboard(context);
    } catch {
      const store = readLocalStore();
      const fallback = demoState.getDashboard();
      const school = store.schools.find((candidate) => candidate.id === context.schoolId) ?? store.schools[0];
      const user = store.users.find((candidate) => candidate.id === context.userId);
      const schoolMemberships = store.memberships.filter((membership) => membership.schoolId === context.schoolId);
      const drafts = lmsState.listDrafts(context.schoolId);
      const assignments = lmsState.listAssignments(context.schoolId);
      const submissions = lmsState.listSubmissions(context.schoolId);
      const quizzes = lmsState.listQuizzes(context.schoolId);
      const quizAttempts = lmsState.listQuizAttempts(context.schoolId);
      const materials = lmsState.listMaterials(context.schoolId);
      const enrollments = lmsState.listEnrollments(context.schoolId);
      const latestMigration = migrationState.latest(context.schoolId);
      const aiUsage = store.aiUsage.find((candidate) => candidate.schoolId === context.schoolId);
      const linkedStudentIds = store.parentLinks
        .filter((link) => link.schoolId === context.schoolId && link.parentUserId === context.userId)
        .map((link) => link.studentUserId);
      const parentChildren = linkedStudentIds
        .map((studentId) => store.users.find((candidate) => candidate.id === studentId))
        .filter(Boolean)
        .map((student) => {
          const attempts = quizAttempts.filter((attempt) => attempt.studentUserId === student!.id);
          const average = attempts.length
            ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)
            : 0;
          return {
            name: student!.displayName,
            streakDays: lmsState.getStudentProgress(context.schoolId, student!.id).attempts,
            quizAverage: `${average}%`,
            assignmentsDue: assignments.length - submissions.filter((submission) => submission.studentUserId === student!.id).length,
            focusAreas: ["Recent quiz review", "Assignment completion"]
          };
        });
      const classSignals = lmsState.listClasses(context.schoolId).map((item) => {
        const classQuizzes = quizzes.filter((quiz) => quiz.classId === item.id);
        const classAttempts = quizAttempts.filter((attempt) => classQuizzes.some((quiz) => quiz.id === attempt.quizId));
        const average = classAttempts.length
          ? Math.round(classAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / classAttempts.length)
          : 0;
        return {
          label: `${item.name} ${item.section}`,
          value: classAttempts.length ? `${average}% average` : "No quiz attempts",
          severity: average && average < 70 ? "High" : "Normal"
        };
      });

      return {
        ...fallback,
        school: {
          id: context.schoolId,
          name: school?.name ?? "Northview"
        },
        user: {
          id: context.userId,
          email: user?.email ?? `${context.roles[0]}@arete.local`,
          displayName: user?.displayName ?? "Demo User",
          roles: context.roles
        },
        metrics: [
          { label: "Students active today", value: new Set([...quizAttempts, ...store.attempts].map((attempt) => attempt.studentUserId)).size, delta: "Local store" },
          { label: "Assignments due", value: assignments.length, delta: "Protected LMS" },
          { label: "Open teacher reviews", value: drafts.length, delta: "Approval required" },
          { label: "Import issues", value: latestMigration?.issues.filter((issue) => issue.severity === "error").length ?? 0, delta: "Latest wizard" }
        ],
        teacher: {
          ...fallback.teacher,
          drafts: drafts.map((draft) => ({
            id: draft.id,
            topic: "Teacher review",
            type: "AI draft",
            difficulty: "Medium",
            prompt: draft.prompt,
            status: "draft" as const
          })),
          approvedQuestions: lmsState.listPractice(context.schoolId).length,
          classSignals
        },
        parent: {
          children: parentChildren.length
            ? parentChildren
            : [
                {
                  name: "Anika Rao",
                  streakDays: 12,
                  quizAverage: "0%",
                  assignmentsDue: assignments.length,
                  focusAreas: ["Recent quiz review", "Assignment completion"]
                }
              ],
          announcements: store.notifications
            .filter((notification) => notification.schoolId === context.schoolId && (notification.role === "parent" || notification.userId === context.userId))
            .map((notification) => notification.message)
            .slice(0, 5)
        }
        ,
        admin: {
          ...fallback.admin,
          imports: fallback.admin.imports
        },
        platform: {
          schools: store.schools.length,
          aiRequestsToday: aiUsage?.requests ?? 0,
          inputTokens: aiUsage?.inputTokens ?? 0,
          outputTokens: aiUsage?.outputTokens ?? 0,
          estimatedAiCostUsd: aiUsage?.estimatedCostUsd ?? 0,
          failedJobs: 0
        },
        operational: {
          users: store.users.length,
          schoolUsers: new Set(schoolMemberships.map((membership) => membership.userId)).size,
          classes: lmsState.listClasses(context.schoolId).length,
          enrollments: enrollments.length,
          materials: materials.length,
          quizzes: quizzes.length,
          quizAttempts: quizAttempts.length,
          submissions: submissions.length
        }
      };
    }
  }

  private async getDatabaseDashboard(context: ActiveTenantContext) {
    const membership = await prisma.membership.findUniqueOrThrow({
      where: { id: context.membershipId },
      include: { school: true, user: true }
    });

    const [activeStudents, assignments, questionDrafts, approvedQuestions, latestImport, aiUsage] =
      await Promise.all([
        prisma.membership.count({
          where: { schoolId: context.schoolId, status: "ACTIVE", roles: { has: UserRole.STUDENT } }
        }),
        prisma.assignment.findMany({
          where: { schoolId: context.schoolId },
          orderBy: { dueAt: "asc" },
          take: 5
        }),
        prisma.question.findMany({
          where: { schoolId: context.schoolId, approvedAt: null },
          orderBy: { createdAt: "desc" },
          take: 10
        }),
        prisma.question.count({
          where: { schoolId: context.schoolId, NOT: { approvedAt: null } }
        }),
        prisma.importJob.findFirst({
          where: { schoolId: context.schoolId },
          orderBy: { createdAt: "desc" }
        }),
        prisma.aiUsageRecord.aggregate({
          where: { schoolId: context.schoolId },
          _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true },
          _count: true
        })
      ]);

    const importPreview = (latestImport?.preview ?? {}) as Record<string, number>;

    return {
      school: {
        id: membership.school.id,
        name: membership.school.name
      },
      user: {
        id: membership.user.id,
        email: membership.user.email,
        displayName: membership.user.displayName,
        roles: context.roles
      },
      metrics: [
        { label: "Students active today", value: activeStudents, delta: "Live tenant count" },
        { label: "Assignments due", value: assignments.length, delta: "Next 5 loaded" },
        { label: "Open teacher reviews", value: questionDrafts.length, delta: "Approval required" },
        { label: "Import issues", value: importPreview.invalidRecords ?? 0, delta: "Latest import" }
      ],
      student: {
        streakDays: 12,
        xp: 2840,
        level: 8,
        dueToday: assignments.map((assignment, index) => ({
          id: assignment.id,
          title: assignment.title,
          subject: index === 0 ? "Mathematics" : "General",
          progress: index === 0 ? 72 : 0
        })),
        weakAreas: ["Fractions", "Cell transport", "Evidence selection"]
      },
      parent: {
        children: [
          {
            name: "Anika Rao",
            streakDays: 12,
            quizAverage: "84%",
            assignmentsDue: assignments.length,
            focusAreas: ["Fractions", "Evidence selection"]
          }
        ],
        announcements: ["Equation practice set is due tomorrow."]
      },
      teacher: {
        drafts: questionDrafts.map((question) => ({
          id: question.id,
          topic: "Teacher review",
          type: question.type,
          difficulty: question.difficulty,
          prompt: question.prompt,
          status: "draft" as const
        })),
        approvedQuestions,
        classSignals: [
          { label: "Grade 8 A", value: "Fractions", severity: "High" },
          { label: "Grade 9 B", value: "Chemical equations", severity: "Medium" }
        ]
      },
      admin: {
        imports: latestImport
          ? [
              {
                id: latestImport.id,
                source: latestImport.source,
                status: latestImport.status,
                detected: importPreview,
                progress: latestImport.progress
              }
            ]
          : [],
        tenantControls: ["Parent access", "Leaderboard visibility", "AI quota", "File limits"]
      },
      platform: {
        schools: await prisma.school.count(),
        aiRequestsToday: aiUsage._count,
        inputTokens: aiUsage._sum.inputTokens ?? 0,
        outputTokens: aiUsage._sum.outputTokens ?? 0,
        estimatedAiCostUsd: Number(aiUsage._sum.estimatedCostUsd ?? 0),
        failedJobs: 0
      }
    };
  }

  async approveQuestion(context: ActiveTenantContext, questionId: string) {
    if (!hasPermission(context.roles, "questions:approve_ai")) {
      throw new ForbiddenException("You cannot approve questions in this school context");
    }

    try {
      return await prisma.question.updateMany({
        where: {
          id: questionId,
          schoolId: context.schoolId,
          approvedAt: null
        },
        data: {
          approvedAt: new Date()
        }
      });
    } catch {
      const question = lmsState.approveQuestion(context.schoolId, questionId) ?? demoState.approveQuestion(questionId);
      return { count: question ? 1 : 0 };
    }
  }

  async startImport(context: ActiveTenantContext, importId: string) {
    if (!hasPermission(context.roles, "imports:manage")) {
      throw new ForbiddenException("You cannot manage imports in this school context");
    }

    try {
      const job = await prisma.importJob.findFirstOrThrow({
        where: { id: importId, schoolId: context.schoolId }
      });

      return prisma.importJob.update({
        where: { id: importId },
        data: {
          status: job.progress + 35 >= 100 ? ImportJobStatus.COMPLETED : ImportJobStatus.IMPORTING,
          progress: Math.min(100, job.progress + 35)
        }
      });
    } catch {
      return demoState.startImport(importId);
    }
  }
}
