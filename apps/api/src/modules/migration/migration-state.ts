export type MigrationSource = "google_classroom" | "microsoft_education" | "csv" | "excel" | "manual";

export type MigrationWizard = {
  id: string;
  schoolId: string;
  source: MigrationSource;
  step: "source" | "analyzed" | "mapped" | "validated" | "committed";
  detected: {
    students: number;
    teachers: number;
    classes: number;
    subjects: number;
    enrollments: number;
    materials: number;
    assignments: number;
  };
  mappings: Array<{ sourceField: string; targetField: string; confidence: number }>;
  issues: Array<{ row: number; field: string; message: string; severity: "warning" | "error" }>;
  committedAt?: string;
  imported?: {
    users: number;
    classes: number;
    enrollments: number;
    parentLinks: number;
    materials: number;
    assignments: number;
  };
};

import { randomUUID } from "node:crypto";
import { readLocalStore, updateLocalStore } from "../../dev-store/local-store";

const supportedSources: Array<{ id: MigrationSource; label: string; automaticImport: string[] }> = [
  {
    id: "google_classroom",
    label: "Google Classroom",
    automaticImport: ["courses", "teachers", "students", "coursework", "materials", "announcements"]
  },
  {
    id: "microsoft_education",
    label: "Microsoft 365 Education",
    automaticImport: ["classes", "members", "teachers", "assignments", "submissions"]
  },
  {
    id: "csv",
    label: "CSV",
    automaticImport: ["users", "classes", "subjects", "enrollments", "parent links"]
  },
  {
    id: "excel",
    label: "Excel",
    automaticImport: ["users", "classes", "subjects", "enrollments", "parent links"]
  },
  {
    id: "manual",
    label: "Manual setup",
    automaticImport: []
  }
];

export const migrationState = {
  supportedSources,

  create(schoolId: string, source: MigrationSource) {
    return updateLocalStore((store) => {
      const wizard: MigrationWizard = {
        id: `migration-${randomUUID()}`,
        schoolId,
        source,
        step: "source",
        detected: {
          students: 0,
          teachers: 0,
          classes: 0,
          subjects: 0,
          enrollments: 0,
          materials: 0,
          assignments: 0
        },
        mappings: [],
        issues: []
      };
      store.migrations.unshift(wizard);
      return wizard;
    });
  },

  analyze(schoolId: string, id: string) {
    return updateLocalStore((store) => {
      const wizard = findInStore(store.migrations, schoolId, id);
      wizard.step = "analyzed";
      wizard.detected = {
        students: 418,
        teachers: 32,
        classes: 18,
        subjects: 11,
        enrollments: 1226,
        materials: wizard.source === "manual" ? 0 : 84,
        assignments: wizard.source === "manual" ? 0 : 39
      };
      wizard.mappings = [
        { sourceField: "Student Full Name", targetField: "student.full_name", confidence: 94 },
        { sourceField: "Email", targetField: "user.email", confidence: 99 },
        { sourceField: "Grade Section", targetField: "class.section", confidence: 81 },
        { sourceField: "Guardian Email", targetField: "parent.email", confidence: 76 }
      ];
      wizard.issues = [
        { row: 14, field: "Email", message: "Invalid email format", severity: "error" },
        { row: 92, field: "Guardian Email", message: "Missing parent email", severity: "warning" },
        { row: 203, field: "Grade Section", message: "Could not split class and section", severity: "error" }
      ];
      return wizard;
    });
  },

  applyMappings(schoolId: string, id: string, mappings: MigrationWizard["mappings"]) {
    return updateLocalStore((store) => {
      const wizard = findInStore(store.migrations, schoolId, id);
      wizard.step = "mapped";
      wizard.mappings = mappings;
      return wizard;
    });
  },

  validate(schoolId: string, id: string) {
    return updateLocalStore((store) => {
      const wizard = findInStore(store.migrations, schoolId, id);
      wizard.step = "validated";
      return {
        ...wizard,
        canCommit: wizard.issues.every((issue) => issue.severity !== "error")
      };
    });
  },

  skipInvalidRows(schoolId: string, id: string) {
    return updateLocalStore((store) => {
      const wizard = findInStore(store.migrations, schoolId, id);
      wizard.issues = wizard.issues.map((issue) =>
        issue.severity === "error"
          ? { ...issue, severity: "warning", message: `${issue.message}. Row will be skipped.` }
          : issue
      );
      return {
        ...wizard,
        canCommit: true
      };
    });
  },

  commit(schoolId: string, id: string) {
    return updateLocalStore((store) => {
      const wizard = findInStore(store.migrations, schoolId, id);
      const hasBlockingErrors = wizard.issues.some((issue) => issue.severity === "error");
      if (hasBlockingErrors) {
        throw new Error("Migration has unresolved validation errors");
      }

      wizard.step = "committed";
      wizard.committedAt = new Date().toISOString();
      const stamp = randomUUID().slice(0, 8);
      const teacher = {
        id: `imported-teacher-${stamp}`,
        email: `imported.teacher.${stamp}@arete.local`,
        displayName: "Imported Teacher",
        roles: ["teacher" as const]
      };
      const student = {
        id: `imported-student-${stamp}`,
        email: `imported.student.${stamp}@arete.local`,
        displayName: "Imported Student",
        roles: ["student" as const]
      };
      const parent = {
        id: `imported-parent-${stamp}`,
        email: `imported.parent.${stamp}@arete.local`,
        displayName: "Imported Parent",
        roles: ["parent" as const]
      };
      const importedClass = {
        id: `imported-class-${stamp}`,
        schoolId,
        name: "Imported Grade",
        section: "A",
        subject: "Imported Subject",
        teacher: teacher.displayName,
        teacherUserId: teacher.id,
        studentCount: 1
      };
      const enrollment = {
        id: `imported-enrollment-${stamp}`,
        schoolId,
        classId: importedClass.id,
        studentUserId: student.id,
        studentName: student.displayName,
        status: "active" as const,
        enrolledAt: new Date().toISOString()
      };
      const parentLink = {
        id: `imported-parent-link-${stamp}`,
        schoolId,
        parentUserId: parent.id,
        studentUserId: student.id,
        createdAt: new Date().toISOString()
      };
      const material = {
        id: `imported-material-${stamp}`,
        schoolId,
        classId: importedClass.id,
        title: "Imported lesson material",
        kind: "note" as const,
        content: "Imported from migration wizard.",
        uploadedByUserId: teacher.id,
        createdAt: new Date().toISOString()
      };
      const assignment = {
        id: `imported-assignment-${stamp}`,
        schoolId,
        classId: importedClass.id,
        title: "Imported assignment",
        instructions: "Review imported material.",
        dueAt: new Date(Date.now() + 86_400_000).toISOString(),
        createdByUserId: teacher.id,
        submissions: 0
      };

      store.users.push(teacher, student, parent);
      store.memberships.push(
        { id: `imported-teacher-membership-${stamp}`, schoolId, userId: teacher.id, roles: ["teacher"] },
        { id: `imported-student-membership-${stamp}`, schoolId, userId: student.id, roles: ["student"] },
        { id: `imported-parent-membership-${stamp}`, schoolId, userId: parent.id, roles: ["parent"] }
      );
      store.classes.unshift(importedClass);
      store.enrollments.unshift(enrollment);
      store.parentLinks.unshift(parentLink);
      store.materials.unshift(material);
      store.assignments.unshift(assignment);
      wizard.imported = {
        users: 3,
        classes: 1,
        enrollments: 1,
        parentLinks: 1,
        materials: 1,
        assignments: 1
      };
      return wizard;
    });
  },

  latest(schoolId: string) {
    return readLocalStore().migrations.find((wizard) => wizard.schoolId === schoolId);
  },

  find(schoolId: string, id: string) {
    return findInStore(readLocalStore().migrations, schoolId, id);
  }
};

function findInStore(migrations: MigrationWizard[], schoolId: string, id: string): MigrationWizard {
  const wizard = migrations.find((candidate) => candidate.schoolId === schoolId && candidate.id === id);
  if (!wizard) {
    throw new Error("Migration not found");
  }
  return wizard;
}
