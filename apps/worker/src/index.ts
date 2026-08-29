import { Worker } from "bullmq";
import { logger } from "@arete/observability";

const queues = ["imports", "ai-generation", "notifications", "integration-sync"];

type JobPayload = Record<string, unknown>;

async function handleJob(queueName: string, jobName: string, data: JobPayload) {
  logger.info({ queueName, jobName, data }, "Worker job received");

  if (queueName === "imports") {
    return { ok: true, imported: data.source ?? "unknown", recordsProcessed: data.recordsProcessed ?? 0 };
  }

  if (queueName === "ai-generation") {
    return { ok: true, draftsGenerated: data.questionCount ?? 0 };
  }

  if (queueName === "notifications") {
    return { ok: true, delivered: true };
  }

  if (queueName === "integration-sync") {
    return { ok: true, synced: data.provider ?? "manual" };
  }

  return { ok: true };
}

function startLocalWorkerFallback() {
  logger.warn(
    {
      queues,
      reason: "REDIS_URL is not configured"
    },
    "Arete worker started in local fallback mode"
  );
}

if (!process.env.REDIS_URL) {
  startLocalWorkerFallback();
} else {
  const connection = {
    url: process.env.REDIS_URL
  };

  for (const queueName of queues) {
  new Worker(
    queueName,
    async (job) => {
      return handleJob(queueName, job.name, job.data as JobPayload);
    },
    { connection }
  );
  }

  logger.info({ queues }, "Arete worker started");
}
