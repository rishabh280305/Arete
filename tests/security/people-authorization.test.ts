import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { ActiveTenantContext } from "@arete/types";
import { PeopleService } from "../../apps/api/src/modules/people/people.service";
import { createLocalSchool, createLocalUser } from "../../apps/api/src/dev-store/local-store";

const baseContext: ActiveTenantContext = {
  schoolId: "demo-school-northview",
  userId: "demo-student",
  membershipId: "demo-membership",
  roles: ["student"]
};

describe("people authorization", () => {
  it("blocks students from listing people", () => {
    const service = new PeopleService();
    expect(() => service.list(baseContext)).toThrow(ForbiddenException);
  });

  it("allows school admins to create people", () => {
    const service = new PeopleService();
    const user = service.create(
      { ...baseContext, userId: "demo-admin", roles: ["school_admin"] },
      {
        email: `created.${Date.now()}@arete.local`,
        displayName: "Created Learner",
        roles: ["student"]
      }
    );

    expect(user.email).toContain("@arete.local");
    expect(user.roles).toContain("student");
  });

  it("creates schools with an admin account", () => {
    const service = new PeopleService();
    const suffix = Date.now();
    const result = service.createSchool({
      name: `Test School ${suffix}`,
      slug: `test-school-${suffix}`,
      adminEmail: `admin.${suffix}@arete.local`,
      adminName: "Test Admin"
    });

    expect(result.school.slug).toBe(`test-school-${suffix}`);
    expect(result.admin.roles).toContain("school_admin");
  });

  it("allows school admins to link parents to students", () => {
    const service = new PeopleService();
    const admin = { ...baseContext, userId: "demo-admin", roles: ["school_admin"] as const };
    const link = service.linkParent(admin, {
      parentUserId: "demo-parent",
      studentUserId: "demo-student"
    });

    expect(link.parentUserId).toBe("demo-parent");
    expect(link.studentUserId).toBe("demo-student");
  });

  it("blocks parent links to users outside the active school", () => {
    const service = new PeopleService();
    const suffix = Date.now();
    const otherSchool = createLocalSchool({
      name: `People Other ${suffix}`,
      slug: `people-other-${suffix}`,
      admin: { email: `people.other.admin.${suffix}@arete.local`, displayName: "Other Admin" }
    });
    const otherStudent = createLocalUser(
      { email: `people.other.student.${suffix}@arete.local`, displayName: "Other Student", roles: ["student"] },
      otherSchool.school.id
    );

    expect(() =>
      service.linkParent({ ...baseContext, userId: "demo-admin", roles: ["school_admin"] }, {
        parentUserId: "demo-parent",
        studentUserId: otherStudent.id
      })
    ).toThrow(ForbiddenException);
  });
});
