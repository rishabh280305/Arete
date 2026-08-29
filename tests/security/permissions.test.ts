import { describe, expect, it } from "vitest";
import { hasPermission } from "@arete/permissions";

describe("role permissions", () => {
  it("does not let students manage quizzes", () => {
    expect(hasPermission(["student"], "quizzes:manage")).toBe(false);
  });

  it("lets school admins manage imports", () => {
    expect(hasPermission(["school_admin"], "imports:manage")).toBe(true);
  });

  it("keeps platform permissions separate from school admins", () => {
    expect(hasPermission(["school_admin"], "platform:manage")).toBe(false);
  });
});
