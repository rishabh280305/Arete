import { ForbiddenException, Injectable } from "@nestjs/common";
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
    if (!this.canManagePeople(context)) {
      throw new ForbiddenException("You cannot manage people in this school context");
    }

    const store = readLocalStore();
    const schoolMemberships = context.roles.includes("platform_admin")
      ? store.memberships
      : store.memberships.filter((membership) => membership.schoolId === context.schoolId);
    const userIds = new Set(schoolMemberships.map((membership) => membership.userId));

    return store.users.filter((user) => userIds.has(user.id)).map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: schoolMemberships.find((membership) => membership.userId === user.id)?.roles ?? user.roles
    }));
  }

  createSchool(input: CreateSchoolInput) {
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
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        displayName: result.admin.displayName,
        roles: result.admin.roles
      }
    };
  }

  create(context: ActiveTenantContext, input: CreateUserInput) {
    if (!this.canManagePeople(context)) {
      throw new ForbiddenException("You cannot manage people in this school context");
    }

    const user = createLocalUser(input, context.schoolId);
    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "user.upserted",
      targetType: "user",
      targetId: user.id
    });
    createNotification({
      schoolId: context.schoolId,
      userId: user.id,
      message: "Your Arete account is ready."
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles
    };
  }

  linkParent(context: ActiveTenantContext, input: LinkParentInput) {
    if (!this.canManagePeople(context)) {
      throw new ForbiddenException("You cannot manage people in this school context");
    }

    const link = linkParentToStudent({
      schoolId: context.schoolId,
      parentUserId: input.parentUserId,
      studentUserId: input.studentUserId
    });
    if (!link) {
      throw new ForbiddenException("Parent or student role is invalid");
    }
    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "parent.linked_student",
      targetType: "parent_link",
      targetId: link.id
    });
    createNotification({ schoolId: context.schoolId, userId: input.parentUserId, message: "A student was linked to your account." });
    return link;
  }

  private canManagePeople(context: ActiveTenantContext) {
    return hasPermission(context.roles, "users:manage_school") || hasPermission(context.roles, "platform:manage");
  }
}
