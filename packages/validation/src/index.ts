import { z } from "zod";

export { z };

export const uuidSchema = z.uuid();

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export const tenantScopedIdSchema = z.object({
  schoolId: uuidSchema,
  id: uuidSchema
});

export const aiQuestionDraftSchema = z.object({
  type: z.enum(["multiple_choice", "true_false", "short_answer", "fill_blank", "matching"]),
  prompt: z.string().min(1).max(4000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topicRef: z.string().min(1),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(500),
        isCorrect: z.boolean()
      })
    )
    .default([]),
  answer: z.string().min(1).max(2000),
  explanation: z.string().min(1).max(4000)
});

export const createAssignmentSchema = z.object({
  classId: z.string().min(1).max(120),
  title: z.string().min(3).max(160),
  instructions: z.string().min(1).max(2000),
  dueAt: z.iso.datetime()
});

export const createSchoolSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  adminEmail: z.email().max(254),
  adminName: z.string().min(2).max(120)
});

export const createClassSchema = z.object({
  name: z.string().min(2).max(120),
  section: z.string().min(1).max(40),
  subject: z.string().min(2).max(120),
  teacherUserId: z.string().min(1).max(120).optional()
});

export const createMaterialSchema = z.object({
  classId: z.string().min(1).max(120),
  title: z.string().min(2).max(160),
  kind: z.enum(["link", "note", "file"]),
  content: z.string().min(1).max(8000)
});

export const uploadMaterialSchema = z.object({
  classId: z.string().min(1).max(120),
  title: z.string().min(2).max(160),
  filename: z.string().min(1).max(240),
  contentType: z.string().min(1).max(160),
  dataBase64: z.string().min(1).max(25_000_000)
});

export const clerkSessionSchema = z.object({
  email: z.email().max(254),
  displayName: z.string().min(1).max(120),
  role: z.enum(["student", "teacher", "parent", "school_admin", "platform_admin"]),
  schoolSlug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).default("northview")
});

export const createQuizSchema = z.object({
  classId: z.string().min(1).max(120),
  title: z.string().min(2).max(160),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(2).max(1000),
        options: z.array(z.string().min(1).max(300)).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string().min(1).max(1000)
      })
    )
    .min(1)
    .max(25)
});

export const createQuizFromBankSchema = z.object({
  classId: z.string().min(1).max(120),
  title: z.string().min(2).max(160),
  questionIds: z.array(z.string().min(1).max(120)).min(1).max(25)
});

export const submitQuizSchema = z.object({
  quizId: z.string().min(1).max(120),
  answers: z.array(z.number().int().min(0).max(3)).min(1).max(25)
});

export const linkParentSchema = z.object({
  parentUserId: z.string().min(1).max(120),
  studentUserId: z.string().min(1).max(120)
});

export const submitPracticeAttemptSchema = z.object({
  questionId: z.string().min(1).max(120),
  selectedIndex: z.number().int().min(0).max(9)
});

export const submitAssignmentSchema = z.object({
  assignmentId: z.string().min(1).max(120),
  response: z.string().min(1).max(8000)
});

export const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1).max(120),
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(1).max(2000)
});

export const markAttendanceSchema = z.object({
  classId: z.string().min(1).max(120),
  date: z.iso.date(),
  records: z
    .array(
      z.object({
        studentUserId: z.string().min(1).max(120),
        status: z.enum(["present", "absent", "late", "excused"]),
        note: z.string().max(500).optional()
      })
    )
    .min(1)
    .max(250)
});

export const enrollStudentSchema = z.object({
  classId: z.string().min(1).max(120),
  studentUserId: z.string().min(1).max(120)
});

export const createUserSchema = z.object({
  email: z.email().max(254),
  displayName: z.string().min(2).max(120),
  roles: z
    .array(z.enum(["student", "teacher", "parent", "school_admin"]))
    .min(1)
    .max(2)
});

export const createAiDraftRequestSchema = z.object({
  topic: z.string().min(2).max(120),
  questionCount: z.number().int().min(1).max(10)
});

export const migrationSourceSchema = z.enum(["google_classroom", "microsoft_education", "csv", "excel", "manual"]);

export const createMigrationWizardSchema = z.object({
  source: migrationSourceSchema
});

export const migrationMappingSchema = z.object({
  sourceField: z.string().min(1).max(120),
  targetField: z.string().min(1).max(120),
  confidence: z.number().int().min(0).max(100)
});

export const applyMigrationMappingsSchema = z.object({
  mappings: z.array(migrationMappingSchema).min(1).max(50)
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UploadMaterialInput = z.infer<typeof uploadMaterialSchema>;
export type ClerkSessionInput = z.infer<typeof clerkSessionSchema>;
export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type CreateQuizFromBankInput = z.infer<typeof createQuizFromBankSchema>;
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
export type LinkParentInput = z.infer<typeof linkParentSchema>;
export type SubmitPracticeAttemptInput = z.infer<typeof submitPracticeAttemptSchema>;
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateAiDraftRequest = z.infer<typeof createAiDraftRequestSchema>;
export type MigrationSourceInput = z.infer<typeof migrationSourceSchema>;
export type ApplyMigrationMappingsInput = z.infer<typeof applyMigrationMappingsSchema>;
