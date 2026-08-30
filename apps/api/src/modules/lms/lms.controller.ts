import { Body, Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createAiDraftRequestSchema,
  createAssignmentSchema,
  createClassSchema,
  createMaterialSchema,
  createQuizFromBankSchema,
  createQuizSchema,
  enrollStudentSchema,
  gradeSubmissionSchema,
  markAttendanceSchema,
  submitQuizSchema,
  submitAssignmentSchema,
  submitPracticeAttemptSchema,
  uploadMaterialSchema
} from "@arete/validation";
import { getAuthContext } from "../../common/auth-context";
import { parseBody } from "../../common/parse-body";
import { LmsService } from "./lms.service";

@Controller("lms")
export class LmsController {
  private readonly lmsService = new LmsService();

  @Get("overview")
  async overview(@Req() request: FastifyRequest) {
    const context = await getAuthContext(request);
    return this.lmsService.overview(context);
  }

  @Post("assignments")
  async createAssignment(
    @Req() request: FastifyRequest,
    @Body() body: { classId: string; title: string; instructions: string; dueAt: string }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.createAssignment(context, parseBody(createAssignmentSchema, body));
  }

  @Post("classes")
  async createClass(
    @Req() request: FastifyRequest,
    @Body() body: { name: string; section: string; subject: string; teacherUserId?: string }
  ) {
    const context = await getAuthContext(request);
    const input = parseBody(createClassSchema, body);
    return this.lmsService.createClass(
      context,
      input.teacherUserId
        ? { name: input.name, section: input.section, subject: input.subject, teacherUserId: input.teacherUserId }
        : { name: input.name, section: input.section, subject: input.subject }
    );
  }

  @Post("classes/enrollments")
  async enrollStudent(
    @Req() request: FastifyRequest,
    @Body() body: { classId: string; studentUserId: string }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.enrollStudent(context, parseBody(enrollStudentSchema, body));
  }

  @Post("attendance")
  async markAttendance(
    @Req() request: FastifyRequest,
    @Body()
    body: {
      classId: string;
      date: string;
      records: Array<{ studentUserId: string; status: "present" | "absent" | "late" | "excused"; note?: string }>;
    }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.markAttendance(context, parseBody(markAttendanceSchema, body));
  }

  @Post("practice/attempts")
  async submitPractice(
    @Req() request: FastifyRequest,
    @Body() body: { questionId: string; selectedIndex: number }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.submitPractice(context, parseBody(submitPracticeAttemptSchema, body));
  }

  @Post("materials")
  async createMaterial(
    @Req() request: FastifyRequest,
    @Body() body: { classId: string; title: string; kind: "link" | "note" | "file"; content: string }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.createMaterial(context, parseBody(createMaterialSchema, body));
  }

  @Post("materials/upload")
  async uploadMaterial(
    @Req() request: FastifyRequest,
    @Body() body: { classId: string; title: string; filename: string; contentType: string; dataBase64: string }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.uploadMaterial(context, parseBody(uploadMaterialSchema, body));
  }

  @Get("materials/:id/download")
  async downloadMaterial(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    const context = await getAuthContext(request);
    const { material, stream } = await this.lmsService.downloadMaterial(context, id);
    reply.header("content-type", material.contentType ?? "application/octet-stream");
    reply.header("content-disposition", `attachment; filename="${(material.filename ?? material.title).replace(/"/g, "")}"`);
    return reply.send(stream);
  }

  @Post("quizzes")
  async createQuiz(
    @Req() request: FastifyRequest,
    @Body()
    body: {
      classId: string;
      title: string;
      questions: Array<{ prompt: string; options: string[]; correctIndex: number; explanation: string }>;
    }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.createQuiz(context, parseBody(createQuizSchema, body));
  }

  @Post("quizzes/from-bank")
  async createQuizFromBank(
    @Req() request: FastifyRequest,
    @Body() body: { classId: string; title: string; questionIds: string[] }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.createQuizFromBank(context, parseBody(createQuizFromBankSchema, body));
  }

  @Post("quizzes/:id/publish")
  async publishQuiz(@Req() request: FastifyRequest, @Param("id") id: string) {
    const context = await getAuthContext(request);
    return this.lmsService.publishQuiz(context, id);
  }

  @Post("quizzes/attempts")
  async submitQuiz(@Req() request: FastifyRequest, @Body() body: { quizId: string; answers: number[] }) {
    const context = await getAuthContext(request);
    return this.lmsService.submitQuiz(context, parseBody(submitQuizSchema, body));
  }

  @Post("assignments/submissions")
  async submitAssignment(
    @Req() request: FastifyRequest,
    @Body() body: { assignmentId: string; response: string }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.submitAssignment(context, parseBody(submitAssignmentSchema, body));
  }

  @Post("assignments/submissions/grade")
  async gradeSubmission(
    @Req() request: FastifyRequest,
    @Body() body: { submissionId: string; score: number; feedback: string }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.gradeSubmission(context, parseBody(gradeSubmissionSchema, body));
  }

  @Post("ai/drafts")
  async createAiDraft(
    @Req() request: FastifyRequest,
    @Body() body: { topic: string; questionCount: number }
  ) {
    const context = await getAuthContext(request);
    return this.lmsService.createAiDraft(context, parseBody(createAiDraftRequestSchema, body));
  }
}
