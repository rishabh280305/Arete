export type Id = string;

export type UserRole =
  | "student"
  | "teacher"
  | "parent"
  | "school_admin"
  | "platform_admin";

export type ActiveTenantContext = {
  schoolId: Id;
  userId: Id;
  membershipId: Id;
  roles: UserRole[];
};

export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "fill_blank"
  | "matching";

export type Difficulty = "easy" | "medium" | "hard" | "mixed";

export type ImportSource =
  | "google_classroom"
  | "microsoft_education"
  | "csv"
  | "excel"
  | "json"
  | "api"
  | "manual";

export type ImportJobStatus =
  | "draft"
  | "analyzing"
  | "preview_ready"
  | "validating"
  | "importing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "rolled_back";
