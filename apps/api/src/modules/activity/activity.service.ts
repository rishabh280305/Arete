import { Injectable, NotFoundException } from "@nestjs/common";
import type { ActiveTenantContext } from "@arete/types";
import { markNotificationRead, readLocalStore } from "../../dev-store/local-store";

@Injectable()
export class ActivityService {
  list(context: ActiveTenantContext) {
    const store = readLocalStore();
    const notifications = store.notifications
      .filter((notification) => {
        const sameSchool = notification.schoolId === context.schoolId;
        const targetedUser = notification.userId ? notification.userId === context.userId : true;
        const targetedRole = notification.role ? context.roles.includes(notification.role as never) : true;
        return sameSchool && targetedUser && targetedRole;
      })
      .slice(0, 20);

    const canSeeAudit = context.roles.includes("school_admin") || context.roles.includes("platform_admin");
    const auditEvents = canSeeAudit
      ? store.auditEvents.filter((event) => event.schoolId === context.schoolId).slice(0, 30)
      : [];

    return { notifications, auditEvents };
  }

  markRead(context: ActiveTenantContext, id: string) {
    const notification = markNotificationRead({
      schoolId: context.schoolId,
      userId: context.userId,
      roles: context.roles,
      id
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    return notification;
  }
}
