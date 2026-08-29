import { ConflictException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { MigrationService } from "../../apps/api/src/modules/migration/migration.service";
import type { ActiveTenantContext } from "@arete/types";

const service = new MigrationService();

const studentContext: ActiveTenantContext = {
  schoolId: "demo-school-northview",
  userId: "demo-student",
  membershipId: "demo-student-membership",
  roles: ["student"]
};

const adminContext: ActiveTenantContext = {
  ...studentContext,
  userId: "demo-admin",
  roles: ["school_admin"]
};

describe("migration authorization and safety", () => {
  it("blocks students from creating migration wizards", () => {
    expect(() => service.create(studentContext, "csv")).toThrow(ForbiddenException);
  });

  it("blocks commit while validation has unresolved errors", () => {
    const wizard = service.create(adminContext, "csv");
    service.analyze(adminContext, wizard.id);

    expect(() => service.commit(adminContext, wizard.id)).toThrow(ConflictException);
  });

  it("allows commit after invalid rows are explicitly skipped", () => {
    const wizard = service.create(adminContext, "csv");
    service.analyze(adminContext, wizard.id);
    service.skipInvalidRows(adminContext, wizard.id);

    const committed = service.commit(adminContext, wizard.id);

    expect(committed.step).toBe("committed");
    expect(committed.imported?.users).toBe(3);
    expect(committed.imported?.classes).toBe(1);
  });
});
