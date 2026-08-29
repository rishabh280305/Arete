import { Controller, Get, Param, Post } from "@nestjs/common";
import { demoState } from "./demo-state";

@Controller("demo")
export class DemoController {
  @Get("dashboard")
  dashboard() {
    return demoState.getDashboard();
  }

  @Post("questions/:id/approve")
  approveQuestion(@Param("id") id: string) {
    const question = demoState.approveQuestion(id);
    return {
      ok: Boolean(question),
      question
    };
  }

  @Post("imports/:id/start")
  startImport(@Param("id") id: string) {
    const job = demoState.startImport(id);
    return {
      ok: Boolean(job),
      job
    };
  }
}
