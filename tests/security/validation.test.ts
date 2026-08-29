import { describe, expect, it } from "vitest";
import {
  applyMigrationMappingsSchema,
  createAiDraftRequestSchema,
  createAssignmentSchema,
  createMigrationWizardSchema,
  submitPracticeAttemptSchema
} from "@arete/validation";

describe("API payload validation", () => {
  it("rejects empty or oversized LMS mutations", () => {
    expect(createAssignmentSchema.safeParse({ classId: "", title: "No", instructions: "", dueAt: "tomorrow" }).success).toBe(false);
    expect(submitPracticeAttemptSchema.safeParse({ questionId: "practice-1", selectedIndex: -1 }).success).toBe(false);
    expect(createAiDraftRequestSchema.safeParse({ topic: "x", questionCount: 25 }).success).toBe(false);
  });

  it("accepts valid LMS mutation payloads", () => {
    expect(
      createAssignmentSchema.safeParse({
        classId: "class-8a",
        title: "Practice set",
        instructions: "Complete the first ten questions.",
        dueAt: new Date(Date.now() + 86_400_000).toISOString()
      }).success
    ).toBe(true);
    expect(submitPracticeAttemptSchema.safeParse({ questionId: "practice-1", selectedIndex: 2 }).success).toBe(true);
    expect(createAiDraftRequestSchema.safeParse({ topic: "Linear equations", questionCount: 3 }).success).toBe(true);
  });

  it("rejects unknown migration sources and invalid mappings", () => {
    expect(createMigrationWizardSchema.safeParse({ source: "unknown_lms" }).success).toBe(false);
    expect(
      applyMigrationMappingsSchema.safeParse({
        mappings: [{ sourceField: "Student Name", targetField: "", confidence: 110 }]
      }).success
    ).toBe(false);
  });
});
