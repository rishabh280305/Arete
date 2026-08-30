import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { hasPermission } from "@arete/permissions";
import type { ActiveTenantContext } from "@arete/types";
import { createNotification, readLocalStore, recordAuditEvent, updateLocalStore } from "../../dev-store/local-store";
import { generateQuestionsWithAi } from "./ai-question-generator";
import { openUpload, saveUpload } from "./file-storage";
import { lmsState } from "./lms-state";

@Injectable()
export class LmsService {
  overview(context: ActiveTenantContext) {
    return {
      classes: lmsState.listClasses(context.schoolId),
      enrollments: lmsState.listEnrollments(context.schoolId),
      assignments: lmsState.listAssignments(context.schoolId),
      submissions: this.visibleSubmissions(context),
      materials: this.visibleMaterials(context),
      quizzes: this.visibleQuizzes(context),
      questionBank: this.visibleQuestionBank(context),
      quizAttempts: this.visibleQuizAttempts(context),
      attendance: this.visibleAttendance(context),
      attendanceSummary: this.attendanceSummary(context),
      leaderboard: this.leaderboard(context),
      gradebook: this.gradebook(context),
      practice: lmsState.listPractice(context.schoolId),
      progress: lmsState.getStudentProgress(context.schoolId, context.userId)
    };
  }

  private visibleMaterials(context: ActiveTenantContext) {
    return lmsState.listMaterials(context.schoolId);
  }

  private visibleQuizzes(context: ActiveTenantContext) {
    const quizzes = lmsState.listQuizzes(context.schoolId);
    if (context.roles.includes("student") || context.roles.includes("parent")) {
      return quizzes
        .filter((quiz) => quiz.status === "published")
        .map((quiz) => ({
          ...quiz,
          questions: quiz.questions.map(({ correctIndex: _correctIndex, ...question }) => question)
        }));
    }
    return quizzes;
  }

  private visibleQuizAttempts(context: ActiveTenantContext) {
    const attempts = lmsState.listQuizAttempts(context.schoolId);
    if (context.roles.includes("student")) {
      return attempts.filter((attempt) => attempt.studentUserId === context.userId);
    }
    if (context.roles.includes("parent")) {
      const linkedStudentIds = this.linkedStudentIds(context);
      return attempts.filter((attempt) => linkedStudentIds.has(attempt.studentUserId));
    }
    if (context.roles.includes("teacher") || context.roles.includes("school_admin")) {
      return attempts;
    }
    return [];
  }

  private visibleQuestionBank(context: ActiveTenantContext) {
    if (!hasPermission(context.roles, "quizzes:manage") && !hasPermission(context.roles, "questions:approve_ai")) {
      return [];
    }
    return lmsState.listQuestionBank(context.schoolId);
  }

  private visibleAttendance(context: ActiveTenantContext) {
    const attendance = lmsState.listAttendance(context.schoolId);
    if (context.roles.includes("student")) {
      return attendance.filter((record) => record.studentUserId === context.userId);
    }
    if (context.roles.includes("parent")) {
      const linkedStudentIds = this.linkedStudentIds(context);
      return attendance.filter((record) => linkedStudentIds.has(record.studentUserId));
    }
    if (hasPermission(context.roles, "attendance:read")) {
      return attendance;
    }
    return [];
  }

  private attendanceSummary(context: ActiveTenantContext) {
    const records = this.visibleAttendance(context);
    const total = records.length;
    const present = records.filter((record) => record.status === "present").length;
    const absent = records.filter((record) => record.status === "absent").length;
    const late = records.filter((record) => record.status === "late").length;
    const excused = records.filter((record) => record.status === "excused").length;
    return {
      total,
      present,
      absent,
      late,
      excused,
      presentRate: total ? Math.round((present / total) * 100) : 0
    };
  }

  private leaderboard(context: ActiveTenantContext) {
    const attempts = lmsState.listQuizAttempts(context.schoolId);
    const students = new Map<string, { studentUserId: string; studentName: string; xp: number; average: number; attempts: number }>();

    for (const attempt of attempts) {
      const current = students.get(attempt.studentUserId) ?? {
        studentUserId: attempt.studentUserId,
        studentName: attempt.studentName,
        xp: 0,
        average: 0,
        attempts: 0
      };
      current.xp += attempt.correct * 25 + 15;
      current.average = Math.round((current.average * current.attempts + attempt.score) / (current.attempts + 1));
      current.attempts += 1;
      students.set(attempt.studentUserId, current);
    }

    return [...students.values()].sort((a, b) => b.xp - a.xp).slice(0, 10);
  }

  private gradebook(context: ActiveTenantContext) {
    if (
      !context.roles.includes("teacher") &&
      !context.roles.includes("school_admin") &&
      !context.roles.includes("platform_admin")
    ) {
      return [];
    }

    const store = readLocalStore();
    const enrollments = lmsState.listEnrollments(context.schoolId);
    const assignments = lmsState.listAssignments(context.schoolId);
    const submissions = lmsState.listSubmissions(context.schoolId);
    const quizAttempts = lmsState.listQuizAttempts(context.schoolId);
    const practiceAttempts = store.attempts.filter((attempt) => attempt.schoolId === context.schoolId);

    const students = new Map<string, {
      studentUserId: string;
      studentName: string;
      classes: Set<string>;
    }>();

    for (const enrollment of enrollments) {
      const targetClass = lmsState.listClasses(context.schoolId).find((item) => item.id === enrollment.classId);
      const current = students.get(enrollment.studentUserId) ?? {
        studentUserId: enrollment.studentUserId,
        studentName: enrollment.studentName,
        classes: new Set<string>()
      };
      current.classes.add(targetClass ? `${targetClass.name} ${targetClass.section}` : enrollment.classId);
      students.set(enrollment.studentUserId, current);
    }

    return [...students.values()].map((student) => {
      const studentSubmissions = submissions.filter((submission) => submission.studentUserId === student.studentUserId);
      const gradedSubmissions = studentSubmissions.filter((submission) => submission.status === "graded" && submission.score !== undefined);
      const studentQuizAttempts = quizAttempts.filter((attempt) => attempt.studentUserId === student.studentUserId);
      const studentPracticeAttempts = practiceAttempts.filter((attempt) => attempt.studentUserId === student.studentUserId);
      const progress = lmsState.getStudentProgress(context.schoolId, student.studentUserId);
      const assignmentAverage = gradedSubmissions.length
        ? Math.round(gradedSubmissions.reduce((sum, submission) => sum + (submission.score ?? 0), 0) / gradedSubmissions.length)
        : 0;
      const quizAverage = studentQuizAttempts.length
        ? Math.round(studentQuizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / studentQuizAttempts.length)
        : 0;
      const practiceAccuracy = studentPracticeAttempts.length
        ? Math.round((studentPracticeAttempts.filter((attempt) => attempt.correct).length / studentPracticeAttempts.length) * 100)
        : 0;

      return {
        studentUserId: student.studentUserId,
        studentName: student.studentName,
        classes: [...student.classes],
        assignmentsSubmitted: studentSubmissions.length,
        assignmentsTotal: assignments.length,
        missingAssignments: Math.max(assignments.length - studentSubmissions.length, 0),
        assignmentAverage,
        quizAverage,
        quizAttempts: studentQuizAttempts.length,
        practiceAccuracy,
        xp: progress.xp,
        level: progress.level
      };
    });
  }

  private visibleSubmissions(context: ActiveTenantContext) {
    const submissions = lmsState.listSubmissions(context.schoolId);
    if (context.roles.includes("student")) {
      return submissions.filter((submission) => submission.studentUserId === context.userId);
    }
    if (context.roles.includes("parent")) {
      const linkedStudentIds = this.linkedStudentIds(context);
      return submissions.filter((submission) => linkedStudentIds.has(submission.studentUserId));
    }
    if (context.roles.includes("teacher") || context.roles.includes("school_admin")) {
      return submissions;
    }
    return [];
  }

  private linkedStudentIds(context: ActiveTenantContext) {
    return new Set(
      readLocalStore()
        .parentLinks.filter((link) => link.schoolId === context.schoolId && link.parentUserId === context.userId)
        .map((link) => link.studentUserId)
    );
  }

  createAssignment(
    context: ActiveTenantContext,
    input: { classId: string; title: string; instructions: string; dueAt: string }
  ) {
    if (!hasPermission(context.roles, "assignments:manage")) {
      throw new ForbiddenException("You cannot create assignments in this school context");
    }

    const classExists = lmsState.listClasses(context.schoolId).some((item) => item.id === input.classId);
    if (!classExists) {
      throw new NotFoundException("Class not found");
    }

    const assignment = lmsState.createAssignment({
      schoolId: context.schoolId,
      classId: input.classId,
      title: input.title,
      instructions: input.instructions,
      dueAt: input.dueAt,
      createdByUserId: context.userId
    });

    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "assignment.created",
      targetType: "assignment",
      targetId: assignment.id
    });
    createNotification({
      schoolId: context.schoolId,
      role: "student",
      message: `New assignment: ${assignment.title}`
    });

    return assignment;
  }

  createClass(context: ActiveTenantContext, input: { name: string; section: string; subject: string; teacherUserId?: string }) {
    if (!hasPermission(context.roles, "classes:manage")) {
      throw new ForbiddenException("You cannot create classes in this school context");
    }

    const classInput = {
      schoolId: context.schoolId,
      name: input.name,
      section: input.section,
      subject: input.subject,
      teacher: "Unassigned"
    };
    if (input.teacherUserId) {
      const teacherMembership = readLocalStore().memberships.find(
        (membership) =>
          membership.schoolId === context.schoolId &&
          membership.userId === input.teacherUserId &&
          membership.roles.includes("teacher")
      );
      if (!teacherMembership) {
        throw new NotFoundException("Teacher not found");
      }
    }
    const newClass = lmsState.createClass(
      input.teacherUserId ? { ...classInput, teacherUserId: input.teacherUserId } : classInput
    );
    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "class.created",
      targetType: "class",
      targetId: newClass.id
    });
    return newClass;
  }

  enrollStudent(context: ActiveTenantContext, input: { classId: string; studentUserId: string }) {
    if (!hasPermission(context.roles, "classes:manage")) {
      throw new ForbiddenException("You cannot manage class rosters in this school context");
    }

    const enrollment = lmsState.enrollStudent({
      schoolId: context.schoolId,
      classId: input.classId,
      studentUserId: input.studentUserId
    });

    if (!enrollment) {
      throw new NotFoundException("Class or student not found");
    }

    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "class.enrolled_student",
      targetType: "enrollment",
      targetId: enrollment.id
    });
    createNotification({
      schoolId: context.schoolId,
      userId: enrollment.studentUserId,
      message: `You were added to ${lmsState.listClasses(context.schoolId).find((item) => item.id === input.classId)?.name ?? "a class"}.`
    });

    return enrollment;
  }

  markAttendance(
    context: ActiveTenantContext,
    input: {
      classId: string;
      date: string;
      records: Array<{ studentUserId: string; status: "present" | "absent" | "late" | "excused"; note?: string | undefined }>;
    }
  ) {
    if (!hasPermission(context.roles, "attendance:manage")) {
      throw new ForbiddenException("You cannot mark attendance in this school context");
    }

    const records = lmsState.markAttendance({
      schoolId: context.schoolId,
      classId: input.classId,
      date: input.date,
      markedByUserId: context.userId,
      records: input.records
    });

    if (!records) {
      throw new NotFoundException("Class or enrolled student not found");
    }

    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "attendance.marked",
      targetType: "class",
      targetId: input.classId
    });
    return records;
  }

  submitPractice(context: ActiveTenantContext, input: { questionId: string; selectedIndex: number }) {
    if (!hasPermission(context.roles, "learning:attempt")) {
      throw new ForbiddenException("You cannot submit student practice in this school context");
    }

    const result = lmsState.submitAttempt({
      schoolId: context.schoolId,
      studentUserId: context.userId,
      questionId: input.questionId,
      selectedIndex: input.selectedIndex
    });

    if (!result) {
      throw new NotFoundException("Question not found");
    }

    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: result.correct ? "practice.correct" : "practice.incorrect",
      targetType: "question",
      targetId: input.questionId
    });

    return result;
  }

  createMaterial(context: ActiveTenantContext, input: { classId: string; title: string; kind: "link" | "note" | "file"; content: string }) {
    if (!hasPermission(context.roles, "materials:manage")) {
      throw new ForbiddenException("You cannot upload materials in this school context");
    }

    const classExists = lmsState.listClasses(context.schoolId).some((item) => item.id === input.classId);
    if (!classExists) {
      throw new NotFoundException("Class not found");
    }

    const material = lmsState.createMaterial({
      schoolId: context.schoolId,
      classId: input.classId,
      title: input.title,
      kind: input.kind,
      content: input.content,
      uploadedByUserId: context.userId
    });
    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "material.uploaded",
      targetType: "material",
      targetId: material.id
    });
    createNotification({ schoolId: context.schoolId, role: "student", message: `New material: ${material.title}` });
    return material;
  }

  async uploadMaterial(
    context: ActiveTenantContext,
    input: { classId: string; title: string; filename: string; contentType: string; dataBase64: string }
  ) {
    if (!hasPermission(context.roles, "materials:manage")) {
      throw new ForbiddenException("You cannot upload materials in this school context");
    }

    const classExists = lmsState.listClasses(context.schoolId).some((item) => item.id === input.classId);
    if (!classExists) {
      throw new NotFoundException("Class not found");
    }

    const stored = await saveUpload({
      schoolId: context.schoolId,
      filename: input.filename,
      contentType: input.contentType,
      dataBase64: input.dataBase64
    });
    const material = lmsState.createMaterial({
      schoolId: context.schoolId,
      classId: input.classId,
      title: input.title,
      kind: "file",
      content: input.filename,
      filename: input.filename,
      contentType: input.contentType,
      byteSize: stored.byteSize,
      storageKey: stored.key,
      checksum: stored.checksum,
      uploadedByUserId: context.userId
    });
    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "material.file_uploaded",
      targetType: "material",
      targetId: material.id
    });
    createNotification({ schoolId: context.schoolId, role: "student", message: `New file: ${material.title}` });
    return material;
  }

  async downloadMaterial(context: ActiveTenantContext, id: string) {
    const material = this.visibleMaterials(context).find((candidate) => candidate.id === id);
    if (!material || material.kind !== "file" || !material.storageKey) {
      throw new NotFoundException("File material not found");
    }

    const stream = await openUpload({ schoolId: context.schoolId, key: material.storageKey });
    if (!stream) {
      throw new NotFoundException("Stored file not found");
    }

    return { material, stream };
  }

  createQuiz(
    context: ActiveTenantContext,
    input: {
      classId: string;
      title: string;
      questions: Array<{ prompt: string; options: string[]; correctIndex: number; explanation: string }>;
    }
  ) {
    if (!hasPermission(context.roles, "quizzes:manage")) {
      throw new ForbiddenException("You cannot create quizzes in this school context");
    }

    const classExists = lmsState.listClasses(context.schoolId).some((item) => item.id === input.classId);
    if (!classExists) {
      throw new NotFoundException("Class not found");
    }

    const quiz = lmsState.createQuiz({
      schoolId: context.schoolId,
      classId: input.classId,
      title: input.title,
      createdByUserId: context.userId,
      questions: input.questions.map((question, index) => ({ ...question, id: `q-${index + 1}` }))
    });
    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "quiz.created",
      targetType: "quiz",
      targetId: quiz.id
    });
    return quiz;
  }

  createQuizFromBank(context: ActiveTenantContext, input: { classId: string; title: string; questionIds: string[] }) {
    if (!hasPermission(context.roles, "quizzes:manage")) {
      throw new ForbiddenException("You cannot create quizzes in this school context");
    }

    const classExists = lmsState.listClasses(context.schoolId).some((item) => item.id === input.classId);
    if (!classExists) {
      throw new NotFoundException("Class not found");
    }

    const quiz = lmsState.createQuizFromQuestionBank({
      schoolId: context.schoolId,
      classId: input.classId,
      title: input.title,
      createdByUserId: context.userId,
      questionIds: input.questionIds
    });
    if (!quiz) {
      throw new NotFoundException("No approved questions selected");
    }
    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "quiz.created_from_bank",
      targetType: "quiz",
      targetId: quiz.id
    });
    return quiz;
  }

  publishQuiz(context: ActiveTenantContext, id: string) {
    if (!hasPermission(context.roles, "quizzes:manage")) {
      throw new ForbiddenException("You cannot publish quizzes in this school context");
    }

    const quiz = lmsState.publishQuiz(context.schoolId, id);
    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }
    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "quiz.published",
      targetType: "quiz",
      targetId: quiz.id
    });
    createNotification({ schoolId: context.schoolId, role: "student", message: `New quiz: ${quiz.title}` });
    return quiz;
  }

  submitQuiz(context: ActiveTenantContext, input: { quizId: string; answers: number[] }) {
    if (!hasPermission(context.roles, "quizzes:attempt")) {
      throw new ForbiddenException("You cannot submit quizzes in this school context");
    }

    const attempt = lmsState.submitQuiz({
      schoolId: context.schoolId,
      quizId: input.quizId,
      studentUserId: context.userId,
      answers: input.answers
    });
    if (!attempt) {
      throw new NotFoundException("Quiz not found");
    }
    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "quiz.submitted",
      targetType: "quiz",
      targetId: input.quizId
    });
    createNotification({ schoolId: context.schoolId, role: "teacher", message: `${attempt.studentName} completed a quiz: ${attempt.score}%` });
    return attempt;
  }

  submitAssignment(context: ActiveTenantContext, input: { assignmentId: string; response: string }) {
    if (!hasPermission(context.roles, "learning:attempt")) {
      throw new ForbiddenException("You cannot submit assignments in this school context");
    }

    const submission = lmsState.submitAssignment({
      schoolId: context.schoolId,
      studentUserId: context.userId,
      assignmentId: input.assignmentId,
      response: input.response
    });

    if (!submission) {
      throw new NotFoundException("Assignment not found");
    }

    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "assignment.submitted",
      targetType: "submission",
      targetId: submission.id
    });
    createNotification({
      schoolId: context.schoolId,
      role: "teacher",
      message: `${submission.studentName} submitted an assignment.`
    });

    return submission;
  }

  gradeSubmission(context: ActiveTenantContext, input: { submissionId: string; score: number; feedback: string }) {
    if (!hasPermission(context.roles, "progress:read_assigned") && !hasPermission(context.roles, "progress:read_school")) {
      throw new ForbiddenException("You cannot grade submissions in this school context");
    }

    const submission = lmsState.gradeSubmission({
      schoolId: context.schoolId,
      submissionId: input.submissionId,
      gradedByUserId: context.userId,
      score: input.score,
      feedback: input.feedback
    });

    if (!submission) {
      throw new NotFoundException("Submission not found");
    }

    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "submission.graded",
      targetType: "submission",
      targetId: submission.id
    });
    createNotification({
      schoolId: context.schoolId,
      userId: submission.studentUserId,
      message: `Assignment graded: ${submission.score}%`
    });
    createNotification({
      schoolId: context.schoolId,
      role: "parent",
      message: `${submission.studentName}'s assignment was graded.`
    });

    return submission;
  }

  async createAiDraft(context: ActiveTenantContext, input: { topic: string; questionCount: number }) {
    if (!hasPermission(context.roles, "quizzes:manage")) {
      throw new ForbiddenException("You cannot generate quiz drafts in this school context");
    }

    const generated = await generateQuestionsWithAi(input);
    const drafts = generated.questions.map((question) =>
      lmsState.createAiDraft(
        context.schoolId,
        question.prompt,
        input.topic,
        question.options,
        question.correctIndex,
        question.explanation
      )
    );

    const usage = generated.usage;
    if (usage) {
      updateLocalStore((store) => {
        const currentUsage = store.aiUsage.find((item) => item.schoolId === context.schoolId);
        if (currentUsage) {
          currentUsage.requests += 1;
          currentUsage.inputTokens += usage.inputTokens;
          currentUsage.outputTokens += usage.outputTokens;
        } else {
          store.aiUsage.push({
            schoolId: context.schoolId,
            requests: 1,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            estimatedCostUsd: 0
          });
        }
      });
    }

    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "ai_drafts.generated",
      targetType: "question_draft"
    });

    return drafts;
  }
}
