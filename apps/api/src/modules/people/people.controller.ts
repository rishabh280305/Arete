import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { createSchoolSchema, createUserSchema, linkParentSchema } from "@arete/validation";
import { getAuthContext } from "../../common/auth-context";
import { parseBody } from "../../common/parse-body";
import { PeopleService } from "./people.service";

@Controller("people")
export class PeopleController {
  private readonly peopleService = new PeopleService();

  @Get()
  async list(@Req() request: FastifyRequest) {
    const context = await getAuthContext(request);
    return this.peopleService.list(context);
  }

  @Post()
  async create(@Req() request: FastifyRequest, @Body() body: unknown) {
    const context = await getAuthContext(request);
    return this.peopleService.create(context, parseBody(createUserSchema, body));
  }

  @Post("schools")
  createSchool(@Body() body: unknown) {
    return this.peopleService.createSchool(parseBody(createSchoolSchema, body));
  }

  @Post("parent-links")
  async linkParent(@Req() request: FastifyRequest, @Body() body: unknown) {
    const context = await getAuthContext(request);
    return this.peopleService.linkParent(context, parseBody(linkParentSchema, body));
  }
}
