import { Controller, Get } from "@nestjs/common";
import { readLocalStore } from "../../dev-store/local-store";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    const store = readLocalStore();
    return {
      service: "arete-api",
      status: "ok",
      timestamp: new Date().toISOString(),
      runtime: {
        nodeEnv: process.env.NODE_ENV ?? "development",
        nodeVersion: process.version
      },
      checks: {
        localStore: {
          status: "ok",
          schools: store.schools.length,
          users: store.users.length
        },
        databaseUrl: process.env.DATABASE_URL ? "configured" : "missing",
        redisUrl: process.env.REDIS_URL ? "configured" : "missing",
        objectStorage: process.env.S3_BUCKET ? "configured" : "missing"
      }
    };
  }
}
