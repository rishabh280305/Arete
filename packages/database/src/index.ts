import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export type TenantWhere = {
  schoolId: string;
};

export function tenantWhere(schoolId: string): TenantWhere {
  return { schoolId };
}
