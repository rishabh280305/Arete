import { BadRequestException } from "@nestjs/common";
import type { z } from "@arete/validation";

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (parsed.success) {
    return parsed.data;
  }

  throw new BadRequestException({
    message: "Invalid request body",
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }))
  });
}
