import type { Difficulty, Id, QuestionType } from "@arete/types";

export type QuizGenerationRequest = {
  schoolId: Id;
  teacherUserId: Id;
  subjectId: Id;
  classId: Id;
  chapterId?: Id;
  topicId?: Id;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  questionCount: number;
  learningObjectives: string[];
  contentChunkIds: Id[];
};

export type GeneratedQuestion = {
  type: QuestionType;
  prompt: string;
  difficulty: Exclude<Difficulty, "mixed">;
  topicRef: string;
  options: Array<{ label: string; isCorrect: boolean }>;
  answer: string;
  explanation: string;
};

export type AiUsage = {
  provider: "openai" | "other";
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd?: number;
};

export type QuizGenerationResult = {
  questions: GeneratedQuestion[];
  usage: AiUsage;
};

export interface AiQuizProvider {
  generateQuizDraft(request: QuizGenerationRequest): Promise<QuizGenerationResult>;
}
