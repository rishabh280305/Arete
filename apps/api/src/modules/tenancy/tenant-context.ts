import type { ActiveTenantContext } from "@arete/types";

export function requireTenantContext(context?: ActiveTenantContext): ActiveTenantContext {
  if (!context?.schoolId || !context.userId || !context.membershipId) {
    throw new Error("Missing tenant context");
  }

  return context;
}
