import { Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { getAuthContext } from "../../common/auth-context";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  private readonly dashboardService = new DashboardService();

  @Get()
  async dashboard(@Req() request: FastifyRequest) {
    const context = await getAuthContext(request);
    return this.dashboardService.getDashboard(context);
  }

  @Post("questions/:id/approve")
  async approveQuestion(@Req() request: FastifyRequest, @Param("id") id: string) {
    const context = await getAuthContext(request);
    const result = await this.dashboardService.approveQuestion(context, id);
    return { ok: result.count === 1 };
  }

  @Post("imports/:id/start")
  async startImport(@Req() request: FastifyRequest, @Param("id") id: string) {
    const context = await getAuthContext(request);
    return this.dashboardService.startImport(context, id);
  }
}
