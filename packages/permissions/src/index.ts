import type { UserRole } from "@arete/types";

export const permissions = [
  "dashboard:read",
  "learning:read",
  "learning:attempt",
  "classes:read",
  "classes:manage",
  "materials:read",
  "materials:manage",
  "assignments:read",
  "assignments:manage",
  "attendance:read",
  "attendance:manage",
  "quizzes:attempt",
  "quizzes:manage",
  "questions:approve_ai",
  "progress:read_own",
  "progress:read_assigned",
  "progress:read_child",
  "progress:read_school",
  "users:manage_school",
  "settings:manage_school",
  "imports:manage",
  "exports:manage",
  "audit:read_school",
  "platform:read",
  "platform:manage"
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<UserRole, Permission[]> = {
  student: [
    "dashboard:read",
    "learning:read",
    "learning:attempt",
    "classes:read",
    "materials:read",
    "assignments:read",
    "attendance:read",
    "quizzes:attempt",
    "progress:read_own"
  ],
  teacher: [
    "dashboard:read",
    "classes:read",
    "materials:read",
    "materials:manage",
    "assignments:read",
    "assignments:manage",
    "attendance:read",
    "attendance:manage",
    "quizzes:manage",
    "questions:approve_ai",
    "progress:read_assigned"
  ],
  parent: ["dashboard:read", "progress:read_child", "assignments:read", "attendance:read"],
  school_admin: [
    "dashboard:read",
    "classes:read",
    "classes:manage",
    "materials:read",
    "materials:manage",
    "assignments:read",
    "assignments:manage",
    "attendance:read",
    "attendance:manage",
    "quizzes:manage",
    "questions:approve_ai",
    "progress:read_school",
    "users:manage_school",
    "settings:manage_school",
    "imports:manage",
    "exports:manage",
    "audit:read_school"
  ],
  platform_admin: ["platform:read", "platform:manage"]
};

export function hasPermission(roles: UserRole[], permission: Permission): boolean {
  return roles.some((role) => rolePermissions[role].includes(permission));
}
