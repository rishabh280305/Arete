import OpenAI from "openai";

type AiQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type AiDraftResult = {
  questions: AiQuestion[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
};

function fallbackQuestions(topic: string, count: number): AiDraftResult {
  return {
    questions: Array.from({ length: Math.min(count, 5) }, (_, index) => ({
      prompt: `${topic}: generated review question ${index + 1}`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctIndex: 0,
      explanation: "Draft explanation to be reviewed by the teacher."
    }))
  };
}

function parseJsonPayload(raw: string): AiQuestion[] {
  const parsed = JSON.parse(raw) as { questions?: AiQuestion[] };
  return (parsed.questions ?? []).filter(
    (question) =>
      typeof question.prompt === "string" &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      Number.isInteger(question.correctIndex) &&
      question.correctIndex >= 0 &&
      question.correctIndex <= 3 &&
      typeof question.explanation === "string"
  );
}

export async function generateQuestionsWithAi(input: { topic: string; questionCount: number }): Promise<AiDraftResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackQuestions(input.topic, input.questionCount);
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "Generate teacher-review quiz draft questions. Return strict JSON only with a questions array. Each item needs prompt, four options, correctIndex 0-3, and explanation."
        },
        {
          role: "user",
          content: `Topic: ${input.topic}\nQuestion count: ${Math.min(input.questionCount, 5)}`
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      }
    });

    const raw = response.output_text;
    const questions = raw ? parseJsonPayload(raw) : [];
    if (!questions.length) {
      return fallbackQuestions(input.topic, input.questionCount);
    }

    const result: AiDraftResult = {
      questions: questions.slice(0, Math.min(input.questionCount, 5))
    };
    if (response.usage) {
      result.usage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      };
    }
    return result;
  } catch {
    return fallbackQuestions(input.topic, input.questionCount);
  }
}
