import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { LmsService } from "../../apps/api/src/modules/lms/lms.service";
import type { ActiveTenantContext } from "@arete/types";
import { createLocalSchool, createLocalUser } from "../../apps/api/src/dev-store/local-store";

const service = new LmsService();

const baseContext: ActiveTenantContext = {
  schoolId: "demo-school-northview",
  userId: "demo-user",
  membershipId: "demo-membership",
  roles: ["student"]
};

function withContext(roles: ActiveTenantContext["roles"], userId: string): ActiveTenantContext {
  return {
    ...baseContext,
    userId,
    roles
  };
}

describe("LMS authorization", () => {
  it("allows students to submit practice attempts", () => {
    const result = service.submitPractice(baseContext, {
      questionId: "practice-1",
      selectedIndex: 1
    });

    expect(result.correct).toBe(true);
  });

  it("blocks students from creating assignments", () => {
    expect(() =>
      service.createAssignment(baseContext, {
        classId: "class-8a",
        title: "Unauthorized",
        instructions: "Nope",
        dueAt: new Date().toISOString()
      })
    ).toThrow(ForbiddenException);
  });

  it("blocks students from enrolling classmates", () => {
    expect(() =>
      service.enrollStudent(baseContext, {
        classId: "class-8a",
        studentUserId: "demo-student"
      })
    ).toThrow(ForbiddenException);
  });

  it("allows teachers to create AI drafts", async () => {
    const drafts = await service.createAiDraft(
      { ...baseContext, roles: ["teacher"] },
      { topic: "Linear equations", questionCount: 2 }
    );

    expect(drafts).toHaveLength(2);
  });

  it("allows student submission and teacher grading", () => {
    const service = new LmsService();
    const student = withContext(["student"], "demo-student");
    const teacher = withContext(["teacher"], "demo-teacher");
    const overview = service.overview(student);

    const submission = service.submitAssignment(student, {
      assignmentId: overview.assignments[0].id,
      response: "My completed work"
    });
    const graded = service.gradeSubmission(teacher, {
      submissionId: submission.id,
      score: 88,
      feedback: "Good correction."
    });

    expect(graded.status).toBe("graded");
    expect(graded.score).toBe(88);
  });

  it("allows school admins to enroll students into classes", () => {
    const service = new LmsService();
    const enrollment = service.enrollStudent(withContext(["school_admin"], "demo-admin"), {
      classId: "class-9b",
      studentUserId: "demo-student"
    });

    expect(enrollment.classId).toBe("class-9b");
    expect(enrollment.status).toBe("active");
  });

  it("supports teacher material upload and published quiz scoring", () => {
    const service = new LmsService();
    const teacher = withContext(["teacher"], "demo-teacher");
    const student = withContext(["student"], "demo-student");
    const classId = service.overview(teacher).classes[0].id;

    const material = service.createMaterial(teacher, {
      classId,
      title: "Quiz prep",
      kind: "note",
      content: "Review inverse operations."
    });
    const quiz = service.createQuiz(teacher, {
      classId,
      title: "Inverse operations",
      questions: [
        {
          prompt: "Solve: x + 2 = 7",
          options: ["3", "4", "5", "9"],
          correctIndex: 2,
          explanation: "Subtract 2 from both sides."
        }
      ]
    });
    service.publishQuiz(teacher, quiz.id);
    const result = service.submitQuiz(student, { quizId: quiz.id, answers: [2] });

    expect(material.title).toBe("Quiz prep");
    expect(result.score).toBe(100);
  });

  it("promotes approved question bank items into a quiz", () => {
    const service = new LmsService();
    const teacher = withContext(["teacher"], "demo-teacher");
    const student = withContext(["student"], "demo-student");
    const overview = service.overview(teacher);
    const approvedQuestion = overview.questionBank.find((question) => question.approved);

    expect(approvedQuestion).toBeTruthy();
    const quiz = service.createQuizFromBank(teacher, {
      classId: overview.classes[0].id,
      title: "Bank quiz",
      questionIds: [approvedQuestion!.id]
    });
    service.publishQuiz(teacher, quiz.id);
    const attempt = service.submitQuiz(student, { quizId: quiz.id, answers: [approvedQuestion!.correctIndex] });

    expect(attempt.score).toBe(100);
  });

  it("tracks XP, levels, achievements, and leaderboard", () => {
    const service = new LmsService();
    const teacher = withContext(["teacher"], "demo-teacher");
    const student = withContext(["student"], "demo-student");
    const quiz = service.createQuiz(teacher, {
      classId: "class-8a",
      title: "Progress quiz",
      questions: [{ prompt: "2+2?", options: ["1", "2", "3", "4"], correctIndex: 3, explanation: "Four." }]
    });
    service.publishQuiz(teacher, quiz.id);
    service.submitQuiz(student, { quizId: quiz.id, answers: [3] });

    const studentOverview = service.overview(student);
    const teacherOverview = service.overview(teacher);

    expect(studentOverview.progress.xp).toBeGreaterThan(0);
    expect(studentOverview.progress.achievements).toContain("Quiz finisher");
    expect(teacherOverview.leaderboard[0].studentName).toBe("Anika Rao");
  });

  it("summarizes enrolled students in the teacher gradebook", () => {
    const service = new LmsService();
    const teacher = withContext(["teacher"], "demo-teacher");
    const student = withContext(["student"], "demo-student");
    const overview = service.overview(teacher);
    const assignment = service.createAssignment(teacher, {
      classId: overview.classes[0].id,
      title: "Gradebook assignment",
      instructions: "Submit one answer.",
      dueAt: new Date(Date.now() + 86_400_000).toISOString()
    });
    const submission = service.submitAssignment(student, {
      assignmentId: assignment.id,
      response: "Completed"
    });
    service.gradeSubmission(teacher, {
      submissionId: submission.id,
      score: 91,
      feedback: "Clear work."
    });

    const row = service.overview(teacher).gradebook.find((item) => item.studentUserId === "demo-student");

    expect(row).toMatchObject({
      studentName: "Anika Rao",
      assignmentsSubmitted: expect.any(Number),
      assignmentAverage: expect.any(Number)
    });
    expect(row?.assignmentsSubmitted).toBeGreaterThan(0);
    expect(row?.classes.length).toBeGreaterThan(0);
  });

  it("allows staff to mark attendance and scopes visibility to students and parents", () => {
    const service = new LmsService();
    const teacher = withContext(["teacher"], "demo-teacher");
    const student = withContext(["student"], "demo-student");
    const parent = withContext(["parent"], "demo-parent");
    const date = new Date().toISOString().slice(0, 10);

    const records = service.markAttendance(teacher, {
      classId: "class-8a",
      date,
      records: [{ studentUserId: "demo-student", status: "present" }]
    });
    const studentOverview = service.overview(student);
    const parentOverview = service.overview(parent);

    expect(records).toHaveLength(1);
    expect(studentOverview.attendance[0]).toMatchObject({ studentUserId: "demo-student", status: "present" });
    expect(parentOverview.attendance[0]).toMatchObject({ studentUserId: "demo-student", status: "present" });
    expect(parentOverview.attendanceSummary.presentRate).toBeGreaterThan(0);
  });

  it("blocks students from marking attendance", () => {
    const service = new LmsService();
    const student = withContext(["student"], "demo-student");

    expect(() =>
      service.markAttendance(student, {
        classId: "class-8a",
        date: new Date().toISOString().slice(0, 10),
        records: [{ studentUserId: "demo-student", status: "present" }]
      })
    ).toThrow(ForbiddenException);
  });

  it("blocks students from creating quizzes", () => {
    const service = new LmsService();
    const student = withContext(["student"], "demo-student");
    expect(() =>
      service.createQuiz(student, {
        classId: "class-8a",
        title: "No",
        questions: [{ prompt: "No", options: ["a", "b", "c", "d"], correctIndex: 0, explanation: "No" }]
      })
    ).toThrow(ForbiddenException);
  });

  it("blocks students from grading submissions", () => {
    const service = new LmsService();
    const student = withContext(["student"], "demo-student");
    const overview = service.overview(student);
    const submission = service.submitAssignment(student, {
      assignmentId: overview.assignments[0].id,
      response: "My completed work"
    });

    expect(() =>
      service.gradeSubmission(student, {
        submissionId: submission.id,
        score: 100,
        feedback: "Nope"
      })
    ).toThrow("You cannot grade submissions");
  });

  it("blocks cross-school roster and teacher assignment writes", () => {
    const service = new LmsService();
    const suffix = Date.now();
    const otherSchool = createLocalSchool({
      name: `Other School ${suffix}`,
      slug: `other-school-${suffix}`,
      admin: { email: `other.admin.${suffix}@arete.local`, displayName: "Other Admin" }
    });
    const otherStudent = createLocalUser(
      { email: `other.student.${suffix}@arete.local`, displayName: "Other Student", roles: ["student"] },
      otherSchool.school.id
    );
    const otherTeacher = createLocalUser(
      { email: `other.teacher.${suffix}@arete.local`, displayName: "Other Teacher", roles: ["teacher"] },
      otherSchool.school.id
    );
    const admin = withContext(["school_admin"], "demo-admin");

    expect(() =>
      service.enrollStudent(admin, {
        classId: "class-8a",
        studentUserId: otherStudent.id
      })
    ).toThrow("Class or student not found");
    expect(() =>
      service.createClass(admin, {
        name: "Cross tenant class",
        section: "X",
        subject: "Security",
        teacherUserId: otherTeacher.id
      })
    ).toThrow("Teacher not found");
  });
});
