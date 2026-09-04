import { ForbiddenException, Injectable } from "@nestjs/common";
import { MembershipStatus, UserRole } from "@prisma/client";
import { hashPassword } from "@arete/auth";
import { prisma } from "@arete/database";
import { hasPermission } from "@arete/permissions";
import type { ActiveTenantContext } from "@arete/types";
import type { CreateSchoolInput, CreateUserInput, LinkParentInput } from "@arete/validation";
import {
  createLocalSchool,
  createLocalUser,
  createNotification,
  linkParentToStudent,
  readLocalStore,
  recordAuditEvent
} from "../../dev-store/local-store";

@Injectable()
export class PeopleService {
  list(context: ActiveTenantContext) {
    if (!process.env.DATABASE_URL) {
      return this.listLocal(context);
    }
    return this.listPersistent(context);
  }

  createSchool(
    contextOrInput: ActiveTenantContext | Omit<CreateSchoolInput, "initialPassword">,
    maybeInput?: CreateSchoolInput
  ) {
    if (!maybeInput || !process.env.DATABASE_URL) {
      return this.createSchoolLocal(maybeInput ?? contextOrInput as Omit<CreateSchoolInput, "initialPassword">);
    }
    return this.createSchoolPersistent(contextOrInput as ActiveTenantContext, maybeInput);
  }

  create(context: ActiveTenantContext, input: CreateUserInput) {
    if (!process.env.DATABASE_URL) {
      return this.createLocal(context, input);
    }
    return this.createPersistent(context, input);
  }

  linkParent(context: ActiveTenantContext, input: LinkParentInput) {
    if (!process.env.DATABASE_URL) {
      return this.linkParentLocal(context, input);
    }
    return this.linkParentPersistent(context, input);
  }

  private async listPersistent(context: ActiveTenantContext) {
    if (!this.canManagePeople(context)) {
      throw new ForbiddenException("You cannot manage people in this school context");
    }

    const memberships = await prisma.membership.findMany({
      where: context.roles.includes("platform_admin") ? {} : { schoolId: context.schoolId },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });

    return memberships.map((membership) => ({
      id: membership.user.id,
      email: membership.user.email,
      displayName: membership.user.displayName,
      roles: membership.roles.map((role) => this.toClientRole(role))
    }));
  }

  private async createSchoolPersistent(context: ActiveTenantContext, input: CreateSchoolInput) {
    if (!context.roles.includes("platform_admin")) {
      throw new ForbiddenException("Only platform owners can create schools");
    }

    const passwordHash = await hashPassword(input.initialPassword);
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.upsert({
        where: { slug: input.slug.toLowerCase() },
        update: { name: input.name },
        create: {
          name: input.name,
          slug: input.slug.toLowerCase(),
          settings: { parentAccess: true, leaderboardVisible: false, aiMonthlyQuestionLimit: 5000, fileUploadLimitMb: 100 }
        }
      });
      const admin = await tx.user.upsert({
        where: { email: input.adminEmail.toLowerCase() },
        update: { displayName: input.adminName },
        create: {
          email: input.adminEmail.toLowerCase(),
          displayName: input.adminName,
          passwordHash,
          emailVerifiedAt: new Date()
        }
      });

      await tx.membership.upsert({
        where: { schoolId_userId: { schoolId: school.id, userId: admin.id } },
        update: { roles: [UserRole.SCHOOL_ADMIN], status: MembershipStatus.ACTIVE },
        create: { schoolId: school.id, userId: admin.id, roles: [UserRole.SCHOOL_ADMIN], status: MembershipStatus.ACTIVE }
      });
      await tx.membership.upsert({
        where: { schoolId_userId: { schoolId: school.id, userId: context.userId } },
        update: { roles: [UserRole.SCHOOL_ADMIN, UserRole.PLATFORM_ADMIN], status: MembershipStatus.ACTIVE },
        create: {
          schoolId: school.id,
          userId: context.userId,
          roles: [UserRole.SCHOOL_ADMIN, UserRole.PLATFORM_ADMIN],
          status: MembershipStatus.ACTIVE
        }
      });
      await tx.auditLog.create({
        data: {
          schoolId: school.id,
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          action: "school.created",
          targetType: "school",
          targetId: school.id
        }
      });
      return { school, admin };
    });

    createLocalSchool({
      id: result.school.id,
      name: result.school.name,
      slug: result.school.slug,
      admin: { email: result.admin.email, displayName: result.admin.displayName }
    });
    recordAuditEvent({
      schoolId: result.school.id,
      actorUserId: context.userId,
      action: "school.created",
      targetType: "school",
      targetId: result.school.id
    });

    return {
      school: { id: result.school.id, name: result.school.name, slug: result.school.slug },
      admin: { id: result.admin.id, email: result.admin.email, displayName: result.admin.displayName, roles: ["school_admin"] }
    };
  }

  private async createPersistent(context: ActiveTenantContext, input: CreateUserInput) {
    if (!this.canManagePeople(context)) {
      throw new ForbiddenException("You cannot manage people in this school context");
    }

    const roles = input.roles.map((role) => this.toDatabaseRole(role));
    const user = await prisma.user.upsert({
      where: { email: input.email.toLowerCase() },
      update: { displayName: input.displayName },
      create: { email: input.email.toLowerCase(), displayName: input.displayName }
    });
    await prisma.membership.upsert({
      where: { schoolId_userId: { schoolId: context.schoolId, userId: user.id } },
      update: { roles, status: MembershipStatus.ACTIVE },
      create: { schoolId: context.schoolId, userId: user.id, roles, status: MembershipStatus.ACTIVE }
    });
    await prisma.auditLog.create({
      data: {
        schoolId: context.schoolId,
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        action: "user.upserted",
        targetType: "user",
        targetId: user.id
      }
    });

    createLocalUser(input, context.schoolId);
    recordAuditEvent({ schoolId: context.schoolId, actorUserId: context.userId, action: "user.upserted", targetType: "user", targetId: user.id });
    createNotification({ schoolId: context.schoolId, userId: user.id, message: "Your Arete account is ready." });

    return { id: user.id, email: user.email, displayName: user.displayName, roles: input.roles };
  }

  private async linkParentPersistent(context: ActiveTenantContext, input: LinkParentInput) {
    if (!this.canManagePeople(context)) {
      throw new ForbiddenException("You cannot manage people in this school context");
    }

    const [parent, student] = await Promise.all([
      prisma.membership.findUnique({ where: { schoolId_userId: { schoolId: context.schoolId, userId: input.parentUserId } } }),
      prisma.membership.findUnique({ where: { schoolId_userId: { schoolId: context.schoolId, userId: input.studentUserId } } })
    ]);
    if (!parent?.roles.includes(UserRole.PARENT) || !student?.roles.includes(UserRole.STUDENT)) {
      throw new ForbiddenException("Parent or student role is invalid");
    }
    const link = await prisma.parentStudentLink.upsert({
      where: {
        schoolId_parentMembershipId_studentMembershipId: {
          schoolId: context.schoolId,
          parentMembershipId: parent.id,
          studentMembershipId: student.id
        }
      },
      update: {},
      create: { schoolId: context.schoolId, parentMembershipId: parent.id, studentMembershipId: student.id }
    });
    await prisma.auditLog.create({
      data: {
        schoolId: context.schoolId,
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        action: "parent.linked_student",
        targetType: "parent_link",
        targetId: link.id
      }
    });

    linkParentToStudent({ schoolId: context.schoolId, parentUserId: input.parentUserId, studentUserId: input.studentUserId });
    recordAuditEvent({ schoolId: context.schoolId, actorUserId: context.userId, action: "parent.linked_student", targetType: "parent_link", targetId: link.id });
    createNotification({ schoolId: context.schoolId, userId: input.parentUserId, message: "A student was linked to your account." });
    return link;
  }

  private listLocal(context: ActiveTenantContext) {
    if (!this.canManagePeople(context)) {
      throw new ForbiddenException("You cannot manage people in this school context");
    }
    const store = readLocalStore();
    const memberships = context.roles.includes("platform_admin")
      ? store.memberships
      : store.memberships.filter((membership) => membership.schoolId === context.schoolId);
    const userIds = new Set(memberships.map((membership) => membership.userId));
    return store.users.filter((user) => userIds.has(user.id)).map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: memberships.find((membership) => membership.userId === user.id)?.roles ?? user.roles
    }));
  }

  private createSchoolLocal(input: Omit<CreateSchoolInput, "initialPassword">) {
    const result = createLocalSchool({
      name: input.name,
      slug: input.slug,
      admin: { email: input.adminEmail, displayName: input.adminName }
    });
    recordAuditEvent({
      schoolId: result.school.id,
      actorUserId: result.admin.id,
      action: "school.created",
      targetType: "school",
      targetId: result.school.id
    });
    return {
      school: result.school,
      admin: { id: result.admin.id, email: result.admin.email, displayName: result.admin.displayName, roles: result.admin.roles }
    };
  }

  private createLocal(context: ActiveTenantContext, input: CreateUserInput) {
    if (!this.canManagePeople(context)) {
      throw new ForbiddenException("You cannot manage people in this school context");
    }
    const user = createLocalUser(input, context.schoolId);
    recordAuditEvent({ schoolId: context.schoolId, actorUserId: context.userId, action: "user.upserted", targetType: "user", targetId: user.id });
    createNotification({ schoolId: context.schoolId, userId: user.id, message: "Your Arete account is ready." });
    return { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles };
  }

  private linkParentLocal(context: ActiveTenantContext, input: LinkParentInput) {
    if (!this.canManagePeople(context)) {
      throw new ForbiddenException("You cannot manage people in this school context");
    }
    const link = linkParentToStudent({ schoolId: context.schoolId, parentUserId: input.parentUserId, studentUserId: input.studentUserId });
    if (!link) {
      throw new ForbiddenException("Parent or student role is invalid");
    }
    recordAuditEvent({ schoolId: context.schoolId, actorUserId: context.userId, action: "parent.linked_student", targetType: "parent_link", targetId: link.id });
    createNotification({ schoolId: context.schoolId, userId: input.parentUserId, message: "A student was linked to your account." });
    return link;
  }

  private canManagePeople(context: ActiveTenantContext) {
    return hasPermission(context.roles, "users:manage_school") || hasPermission(context.roles, "platform:manage");
  }

  private toDatabaseRole(role: CreateUserInput["roles"][number]): UserRole {
    return {
      student: UserRole.STUDENT,
      teacher: UserRole.TEACHER,
      parent: UserRole.PARENT,
      school_admin: UserRole.SCHOOL_ADMIN
    }[role];
  }

  private toClientRole(role: UserRole) {
    return {
      [UserRole.STUDENT]: "student",
      [UserRole.TEACHER]: "teacher",
      [UserRole.PARENT]: "parent",
      [UserRole.SCHOOL_ADMIN]: "school_admin",
      [UserRole.PLATFORM_ADMIN]: "platform_admin"
    }[role];
  }
}
