export type LmsClass = {
  id: string;
  schoolId: string;
  name: string;
  section: string;
  subject: string;
  teacher: string;
  teacherUserId?: string;
  studentCount: number;
};

export type LmsAssignment = {
  id: string;
  schoolId: string;
  classId: string;
  title: string;
  instructions: string;
  dueAt: string;
  createdByUserId: string;
  submissions: number;
};

export type LmsSubmission = {
  id: string;
  schoolId: string;
  assignmentId: string;
  studentUserId: string;
  studentName: string;
  response: string;
  status: "submitted" | "graded";
  score?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  gradedByUserId?: string;
};

export type LmsEnrollment = {
  id: string;
  schoolId: string;
  classId: string;
  studentUserId: string;
  studentName: string;
  status: "active" | "removed";
  enrolledAt: string;
};

export type LmsQuestion = {
  id: string;
  schoolId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  approved: boolean;
  topic?: string;
  source?: "manual" | "ai";
};

export type LmsAttempt = {
  id: string;
  schoolId: string;
  studentUserId: string;
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  createdAt: string;
};

export type LmsMaterial = {
  id: string;
  schoolId: string;
  classId: string;
  title: string;
  kind: "link" | "note" | "file";
  content: string;
  filename?: string;
  contentType?: string;
  byteSize?: number;
  storageKey?: string;
  checksum?: string;
  uploadedByUserId: string;
  createdAt: string;
};

export type LmsQuiz = {
  id: string;
  schoolId: string;
  classId: string;
  title: string;
  status: "draft" | "published";
  createdByUserId: string;
  createdAt: string;
  questions: Array<{
    id: string;
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
};

export type LmsQuizAttempt = {
  id: string;
  schoolId: string;
  quizId: string;
  studentUserId: string;
  studentName: string;
  answers: number[];
  score: number;
  correct: number;
  total: number;
  submittedAt: string;
};

export type LmsAttendanceRecord = {
  id: string;
  schoolId: string;
  classId: string;
  date: string;
  studentUserId: string;
  studentName: string;
  status: "present" | "absent" | "late" | "excused";
  note?: string;
  markedByUserId: string;
  markedAt: string;
};

import { randomUUID } from "node:crypto";
import { readLocalStore, updateLocalStore } from "../../dev-store/local-store";

export const lmsState = {
  listClasses(schoolId: string) {
    return readLocalStore().classes.filter((item) => item.schoolId === schoolId);
  },

  createClass(input: Omit<LmsClass, "id" | "studentCount">) {
    return updateLocalStore((store) => {
      const targetTeacher = input.teacherUserId
        ? store.users.find((user) => user.id === input.teacherUserId)
        : undefined;
      const newClass: LmsClass = {
        ...input,
        teacher: targetTeacher?.displayName ?? input.teacher,
        id: `class-${randomUUID()}`,
        studentCount: 0
      };
      store.classes.unshift(newClass);
      return newClass;
    });
  },

  listAssignments(schoolId: string) {
    return readLocalStore().assignments.filter((item) => item.schoolId === schoolId);
  },

  listMaterials(schoolId: string) {
    return readLocalStore().materials.filter((item) => item.schoolId === schoolId);
  },

  listQuizzes(schoolId: string) {
    return readLocalStore().quizzes.filter((item) => item.schoolId === schoolId);
  },

  listQuizAttempts(schoolId: string) {
    return readLocalStore().quizAttempts.filter((item) => item.schoolId === schoolId);
  },

  listEnrollments(schoolId: string) {
    return readLocalStore().enrollments.filter((item) => item.schoolId === schoolId && item.status === "active");
  },

  listSubmissions(schoolId: string) {
    return readLocalStore().submissions.filter((item) => item.schoolId === schoolId);
  },

  listAttendance(schoolId: string) {
    return readLocalStore().attendance.filter((item) => item.schoolId === schoolId);
  },

  enrollStudent(input: { schoolId: string; classId: string; studentUserId: string }) {
    return updateLocalStore((store) => {
      const targetClass = store.classes.find(
        (candidate) => candidate.schoolId === input.schoolId && candidate.id === input.classId
      );
      const studentMembership = store.memberships.find(
        (candidate) =>
          candidate.schoolId === input.schoolId &&
          candidate.userId === input.studentUserId &&
          candidate.roles.includes("student")
      );
      const student = store.users.find((candidate) => candidate.id === input.studentUserId);
      if (!targetClass || !student || !studentMembership) {
        return undefined;
      }

      const existing = store.enrollments.find(
        (candidate) =>
          candidate.schoolId === input.schoolId &&
          candidate.classId === input.classId &&
          candidate.studentUserId === input.studentUserId
      );
      if (existing) {
        existing.status = "active";
        return existing;
      }

      const enrollment: LmsEnrollment = {
        id: `enrollment-${randomUUID()}`,
        schoolId: input.schoolId,
        classId: input.classId,
        studentUserId: input.studentUserId,
        studentName: student.displayName,
        status: "active",
        enrolledAt: new Date().toISOString()
      };
      store.enrollments.unshift(enrollment);
      targetClass.studentCount += 1;
      return enrollment;
    });
  },

  createAssignment(input: Omit<LmsAssignment, "id" | "submissions">) {
    return updateLocalStore((store) => {
      const assignment: LmsAssignment = {
        ...input,
        id: `assignment-${randomUUID()}`,
        submissions: 0
      };
      store.assignments.unshift(assignment);
      return assignment;
    });
  },

  createMaterial(input: Omit<LmsMaterial, "id" | "createdAt">) {
    return updateLocalStore((store) => {
      const material: LmsMaterial = {
        ...input,
        id: `material-${randomUUID()}`,
        createdAt: new Date().toISOString()
      };
      store.materials.unshift(material);
      return material;
    });
  },

  createQuiz(input: Omit<LmsQuiz, "id" | "createdAt" | "status">) {
    return updateLocalStore((store) => {
      const quiz: LmsQuiz = {
        ...input,
        id: `quiz-${randomUUID()}`,
        status: "draft",
        createdAt: new Date().toISOString()
      };
      store.quizzes.unshift(quiz);
      return quiz;
    });
  },

  publishQuiz(schoolId: string, quizId: string) {
    return updateLocalStore((store) => {
      const quiz = store.quizzes.find((candidate) => candidate.schoolId === schoolId && candidate.id === quizId);
      if (!quiz) {
        return undefined;
      }
      quiz.status = "published";
      return quiz;
    });
  },

  submitQuiz(input: { schoolId: string; quizId: string; studentUserId: string; answers: number[] }) {
    return updateLocalStore((store) => {
      const quiz = store.quizzes.find(
        (candidate) => candidate.schoolId === input.schoolId && candidate.id === input.quizId && candidate.status === "published"
      );
      const student = store.users.find((candidate) => candidate.id === input.studentUserId);
      if (!quiz || !student) {
        return undefined;
      }

      const correct = quiz.questions.reduce(
        (count, question, index) => count + (input.answers[index] === question.correctIndex ? 1 : 0),
        0
      );
      const attempt: LmsQuizAttempt = {
        id: `quiz-attempt-${randomUUID()}`,
        schoolId: input.schoolId,
        quizId: input.quizId,
        studentUserId: input.studentUserId,
        studentName: student.displayName,
        answers: input.answers,
        correct,
        total: quiz.questions.length,
        score: quiz.questions.length ? Math.round((correct / quiz.questions.length) * 100) : 0,
        submittedAt: new Date().toISOString()
      };
      store.quizAttempts.unshift(attempt);
      return {
        ...attempt,
        review: quiz.questions.map((question, index) => ({
          questionId: question.id,
          correct: input.answers[index] === question.correctIndex,
          explanation: question.explanation
        }))
      };
    });
  },

  listPractice(schoolId: string) {
    return readLocalStore().questions
      .filter((item) => item.schoolId === schoolId && item.approved)
      .map(({ correctIndex: _correctIndex, ...safeQuestion }) => safeQuestion);
  },

  listQuestionBank(schoolId: string) {
    return readLocalStore().questions.filter((item) => item.schoolId === schoolId);
  },

  submitAttempt(input: Omit<LmsAttempt, "id" | "correct" | "createdAt">) {
    return updateLocalStore((store) => {
      const question = store.questions.find(
        (candidate) => candidate.schoolId === input.schoolId && candidate.id === input.questionId && candidate.approved
      );
      if (!question) {
        return undefined;
      }

      const attempt: LmsAttempt = {
        ...input,
        id: `attempt-${randomUUID()}`,
        correct: input.selectedIndex === question.correctIndex,
        createdAt: new Date().toISOString()
      };
      store.attempts.push(attempt);

      return {
        ...attempt,
        explanation: question.explanation
      };
    });
  },

  submitAssignment(input: { schoolId: string; assignmentId: string; studentUserId: string; response: string }) {
    return updateLocalStore((store) => {
      const assignment = store.assignments.find(
        (candidate) => candidate.schoolId === input.schoolId && candidate.id === input.assignmentId
      );
      const student = store.users.find((candidate) => candidate.id === input.studentUserId);
      if (!assignment || !student) {
        return undefined;
      }

      const existing = store.submissions.find(
        (candidate) =>
          candidate.schoolId === input.schoolId &&
          candidate.assignmentId === input.assignmentId &&
          candidate.studentUserId === input.studentUserId
      );

      if (existing) {
        existing.response = input.response;
        existing.status = "submitted";
        delete existing.score;
        delete existing.feedback;
        delete existing.gradedAt;
        delete existing.gradedByUserId;
        existing.submittedAt = new Date().toISOString();
        return existing;
      }

      const submission: LmsSubmission = {
        id: `submission-${randomUUID()}`,
        schoolId: input.schoolId,
        assignmentId: input.assignmentId,
        studentUserId: input.studentUserId,
        studentName: student.displayName,
        response: input.response,
        status: "submitted",
        submittedAt: new Date().toISOString()
      };
      store.submissions.unshift(submission);
      assignment.submissions += 1;
      return submission;
    });
  },

  gradeSubmission(input: {
    schoolId: string;
    submissionId: string;
    gradedByUserId: string;
    score: number;
    feedback: string;
  }) {
    return updateLocalStore((store) => {
      const submission = store.submissions.find(
        (candidate) => candidate.schoolId === input.schoolId && candidate.id === input.submissionId
      );
      if (!submission) {
        return undefined;
      }

      submission.status = "graded";
      submission.score = input.score;
      submission.feedback = input.feedback;
      submission.gradedAt = new Date().toISOString();
      submission.gradedByUserId = input.gradedByUserId;
      return submission;
    });
  },

  markAttendance(input: {
    schoolId: string;
    classId: string;
    date: string;
    markedByUserId: string;
    records: Array<{ studentUserId: string; status: LmsAttendanceRecord["status"]; note?: string | undefined }>;
  }) {
    return updateLocalStore((store) => {
      const targetClass = store.classes.find(
        (candidate) => candidate.schoolId === input.schoolId && candidate.id === input.classId
      );
      if (!targetClass) {
        return undefined;
      }

      const activeEnrollmentIds = new Set(
        store.enrollments
          .filter(
            (enrollment) =>
              enrollment.schoolId === input.schoolId &&
              enrollment.classId === input.classId &&
              enrollment.status === "active"
          )
          .map((enrollment) => enrollment.studentUserId)
      );
      const validRecords = input.records.every((record) => {
        const student = store.users.find((user) => user.id === record.studentUserId);
        return activeEnrollmentIds.has(record.studentUserId) && Boolean(student);
      });
      if (!validRecords) {
        return undefined;
      }
      const nextRecords: LmsAttendanceRecord[] = [];

      for (const record of input.records) {
        const student = store.users.find((user) => user.id === record.studentUserId)!;
        const existing = store.attendance.find(
          (candidate) =>
            candidate.schoolId === input.schoolId &&
            candidate.classId === input.classId &&
            candidate.date === input.date &&
            candidate.studentUserId === record.studentUserId
        );
        if (existing) {
          existing.status = record.status;
          existing.markedByUserId = input.markedByUserId;
          existing.markedAt = new Date().toISOString();
          if (record.note) {
            existing.note = record.note;
          } else {
            delete existing.note;
          }
          nextRecords.push(existing);
        } else {
          const next: LmsAttendanceRecord = {
            id: `attendance-${randomUUID()}`,
            schoolId: input.schoolId,
            classId: input.classId,
            date: input.date,
            studentUserId: record.studentUserId,
            studentName: student.displayName,
            status: record.status,
            markedByUserId: input.markedByUserId,
            markedAt: new Date().toISOString()
          };
          if (record.note) {
            next.note = record.note;
          }
          store.attendance.unshift(next);
          nextRecords.push(next);
        }
      }

      return nextRecords;
    });
  },

  createAiDraft(
    schoolId: string,
    prompt: string,
    topic = "General",
    options = ["Option A", "Option B", "Option C", "Option D"],
    correctIndex = 0,
    explanation = "Draft explanation to be reviewed by the teacher."
  ) {
    return updateLocalStore((store) => {
      const draft: LmsQuestion = {
        id: `draft-${randomUUID()}`,
        schoolId,
        prompt,
        options,
        correctIndex,
        explanation,
        approved: false,
        topic,
        source: "ai"
      };
      store.questions.push(draft);
      return { id: draft.id, prompt: draft.prompt, status: "draft" };
    });
  },

  createQuizFromQuestionBank(input: { schoolId: string; classId: string; title: string; createdByUserId: string; questionIds: string[] }) {
    return updateLocalStore((store) => {
      const selected = store.questions.filter(
        (question) =>
          question.schoolId === input.schoolId &&
          input.questionIds.includes(question.id) &&
          question.approved
      );
      if (!selected.length) {
        return undefined;
      }
      const quiz: LmsQuiz = {
        id: `quiz-${randomUUID()}`,
        schoolId: input.schoolId,
        classId: input.classId,
        title: input.title,
        status: "draft",
        createdByUserId: input.createdByUserId,
        createdAt: new Date().toISOString(),
        questions: selected.map((question) => ({
          id: `quiz-question-${randomUUID()}`,
          prompt: question.prompt,
          options: question.options,
          correctIndex: question.correctIndex,
          explanation: question.explanation
        }))
      };
      store.quizzes.unshift(quiz);
      return quiz;
    });
  },

  getStudentProgress(schoolId: string, studentUserId: string) {
    const studentAttempts = readLocalStore().attempts.filter(
      (candidate) => candidate.schoolId === schoolId && candidate.studentUserId === studentUserId
    );
    const quizAttempts = readLocalStore().quizAttempts.filter(
      (candidate) => candidate.schoolId === schoolId && candidate.studentUserId === studentUserId
    );
    const correct = studentAttempts.filter((attempt) => attempt.correct).length;
    const quizCorrect = quizAttempts.reduce((sum, attempt) => sum + attempt.correct, 0);
    const quizTotal = quizAttempts.reduce((sum, attempt) => sum + attempt.total, 0);
    const xp = correct * 10 + quizCorrect * 25 + quizAttempts.length * 15;
    const level = Math.max(1, Math.floor(xp / 100) + 1);
    const streakDays = new Set([
      ...studentAttempts.map((attempt) => attempt.createdAt.slice(0, 10)),
      ...quizAttempts.map((attempt) => attempt.submittedAt.slice(0, 10))
    ]).size;
    const achievements = [
      xp >= 50 ? "Quick start" : undefined,
      quizAttempts.length >= 1 ? "Quiz finisher" : undefined,
      quizAttempts.some((attempt) => attempt.score === 100) ? "Perfect score" : undefined,
      streakDays >= 3 ? "Three day streak" : undefined
    ].filter(Boolean) as string[];
    const totalAnswers = studentAttempts.length + quizTotal;
    const totalCorrect = correct + quizCorrect;
    return {
      attempts: studentAttempts.length + quizAttempts.length,
      correct: totalCorrect,
      accuracy: totalAnswers === 0 ? 0 : Math.round((totalCorrect / totalAnswers) * 100),
      xp,
      level,
      streakDays,
      achievements
    };
  },

  approveQuestion(schoolId: string, id: string) {
    return updateLocalStore((store) => {
      const question = store.questions.find((candidate) => candidate.schoolId === schoolId && candidate.id === id);
      if (!question) {
        return undefined;
      }
      question.approved = true;
      return question;
    });
  },

  listDrafts(schoolId: string) {
    return readLocalStore().questions.filter((item) => item.schoolId === schoolId && !item.approved);
  }
};
