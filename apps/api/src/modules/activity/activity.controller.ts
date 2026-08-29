import { Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { getAuthContext } from "../../common/auth-context";
import { ActivityService } from "./activity.service";

@Controller("activity")
export class ActivityController {
  private readonly activityService = new ActivityService();

  @Get()
  async list(@Req() request: FastifyRequest) {
    const context = await getAuthContext(request);
    return this.activityService.list(context);
  }

  @Post("notifications/:id/read")
  async markRead(@Req() request: FastifyRequest, @Param("id") id: string) {
    const context = await getAuthContext(request);
    return this.activityService.markRead(context, id);
  }
}
