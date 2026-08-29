import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { TenancyModule } from "./tenancy/tenancy.module";
import { DemoModule } from "./demo/demo.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { LmsModule } from "./lms/lms.module";
import { MigrationModule } from "./migration/migration.module";
import { ActivityModule } from "./activity/activity.module";
import { PeopleModule } from "./people/people.module";

@Module({
  imports: [HealthModule, AuthModule, TenancyModule, DemoModule, DashboardModule, LmsModule, MigrationModule, ActivityModule, PeopleModule]
})
export class AppModule {}
