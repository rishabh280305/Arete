import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { applyMigrationMappingsSchema, createMigrationWizardSchema } from "@arete/validation";
import { getAuthContext } from "../../common/auth-context";
import { parseBody } from "../../common/parse-body";
import { MigrationService } from "./migration.service";
import type { MigrationSource, MigrationWizard } from "./migration-state";

@Controller("migration")
export class MigrationController {
  private readonly migrationService = new MigrationService();

  @Get("sources")
  sources() {
    return this.migrationService.sources();
  }

  @Post("wizards")
  async create(@Req() request: FastifyRequest, @Body() body: { source: MigrationSource }) {
    const context = await getAuthContext(request);
    const input = parseBody(createMigrationWizardSchema, body);
    return this.migrationService.create(context, input.source);
  }

  @Post("wizards/:id/analyze")
  async analyze(@Req() request: FastifyRequest, @Param("id") id: string) {
    const context = await getAuthContext(request);
    return this.migrationService.analyze(context, id);
  }

  @Post("wizards/:id/map")
  async map(
    @Req() request: FastifyRequest,
    @Param("id") id: string,
    @Body() body: { mappings: MigrationWizard["mappings"] }
  ) {
    const context = await getAuthContext(request);
    const input = parseBody(applyMigrationMappingsSchema, body);
    return this.migrationService.map(context, id, input.mappings as MigrationWizard["mappings"]);
  }

  @Post("wizards/:id/validate")
  async validate(@Req() request: FastifyRequest, @Param("id") id: string) {
    const context = await getAuthContext(request);
    return this.migrationService.validate(context, id);
  }

  @Post("wizards/:id/skip-invalid")
  async skipInvalidRows(@Req() request: FastifyRequest, @Param("id") id: string) {
    const context = await getAuthContext(request);
    return this.migrationService.skipInvalidRows(context, id);
  }

  @Post("wizards/:id/commit")
  async commit(@Req() request: FastifyRequest, @Param("id") id: string) {
    const context = await getAuthContext(request);
    return this.migrationService.commit(context, id);
  }
}
