import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type StoredUpload = {
  key: string;
  path: string;
  byteSize: number;
  checksum: string;
};

const uploadRoot = path.resolve(process.cwd(), ".arete-dev", "uploads");

function safeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);
}

export function saveLocalUpload(input: { schoolId: string; filename: string; dataBase64: string }): StoredUpload {
  const buffer = Buffer.from(input.dataBase64, "base64");
  const schoolDir = path.join(uploadRoot, input.schoolId);
  if (!existsSync(schoolDir)) {
    mkdirSync(schoolDir, { recursive: true });
  }

  const key = `${randomUUID()}-${safeFilename(input.filename)}`;
  const filePath = path.join(schoolDir, key);
  writeFileSync(filePath, buffer);

  return {
    key,
    path: filePath,
    byteSize: buffer.byteLength,
    checksum: createHash("sha256").update(buffer).digest("hex")
  };
}

export function openLocalUpload(input: { schoolId: string; key: string }) {
  const filePath = path.join(uploadRoot, input.schoolId, input.key);
  const resolved = path.resolve(filePath);
  const schoolDir = path.resolve(uploadRoot, input.schoolId);
  if (!resolved.startsWith(schoolDir)) {
    return undefined;
  }
  if (!existsSync(resolved)) {
    return undefined;
  }
  return createReadStream(resolved);
}
