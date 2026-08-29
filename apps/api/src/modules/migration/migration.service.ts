import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { hasPermission } from "@arete/permissions";
import type { ActiveTenantContext } from "@arete/types";
import { createNotification, recordAuditEvent } from "../../dev-store/local-store";
import { migrationState, type MigrationSource, type MigrationWizard } from "./migration-state";

@Injectable()
export class MigrationService {
  sources() {
    return migrationState.supportedSources;
  }

  create(context: ActiveTenantContext, source: MigrationSource) {
    this.assertCanManageImports(context);
    const wizard = migrationState.create(context.schoolId, source);
    recordAuditEvent({
      schoolId: context.schoolId,
      actorUserId: context.userId,
      action: "migration.created",
      targetType: "migration",
      targetId: wizard.id
    });
    return wizard;
  }

  analyze(context: ActiveTenantContext, id: string) {
    this.assertCanManageImports(context);
    return migrationState.analyze(context.schoolId, id);
  }

  map(context: ActiveTenantContext, id: string, mappings: MigrationWizard["mappings"]) {
    this.assertCanManageImports(context);
    return migrationState.applyMappings(context.schoolId, id, mappings);
  }

  validate(context: ActiveTenantContext, id: string) {
    this.assertCanManageImports(context);
    return migrationState.validate(context.schoolId, id);
  }

  skipInvalidRows(context: ActiveTenantContext, id: string) {
    this.assertCanManageImports(context);
    return migrationState.skipInvalidRows(context.schoolId, id);
  }

  commit(context: ActiveTenantContext, id: string) {
    this.assertCanManageImports(context);
    try {
      const wizard = migrationState.commit(context.schoolId, id);
      recordAuditEvent({
        schoolId: context.schoolId,
        actorUserId: context.userId,
        action: "migration.committed",
        targetType: "migration",
        targetId: id
      });
      createNotification({
        schoolId: context.schoolId,
        role: "school_admin",
        message: `Migration ${id} committed`
      });
      return wizard;
    } catch {
      throw new ConflictException("Resolve validation errors before committing this migration");
    }
  }

  private assertCanManageImports(context: ActiveTenantContext) {
    if (!hasPermission(context.roles, "imports:manage")) {
      throw new ForbiddenException("You cannot manage migrations in this school context");
    }
  }
}
