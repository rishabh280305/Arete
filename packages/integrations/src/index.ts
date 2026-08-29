import type { Id, ImportSource } from "@arete/types";

export type SourceInventory = {
  users: number;
  classes: number;
  teachers: number;
  students: number;
  parents: number;
  subjects: number;
  enrollments: number;
  materials: number;
  assignments: number;
};

export type ImportMapping = {
  sourceField: string;
  targetField: string;
  transform?: "trim" | "lowercase" | "split_name" | "parse_grade_section";
};

export type ImportPreview = {
  source: ImportSource;
  inventory: SourceInventory;
  duplicateCandidates: number;
  invalidRecords: number;
  warnings: string[];
};

export type ImportBatch = {
  id: Id;
  schoolId: Id;
  initiatedByUserId: Id;
  source: ImportSource;
  mappings: ImportMapping[];
  dryRun: boolean;
};

export type ImportResult = {
  batchId: Id;
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{ row?: number; code: string; message: string }>;
};

export type SyncResult = {
  changed: number;
  conflicts: number;
  nextCursor?: string;
};

export interface IntegrationProvider {
  readonly source: ImportSource;
  discover(schoolId: Id): Promise<SourceInventory>;
  preview(batch: ImportBatch): Promise<ImportPreview>;
  import(batch: ImportBatch): Promise<ImportResult>;
  sync?(schoolId: Id, cursor?: string): Promise<SyncResult>;
}
