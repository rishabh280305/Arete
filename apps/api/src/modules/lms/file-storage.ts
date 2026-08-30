import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { get, put } from "@vercel/blob";

export type StoredUpload = {
  key: string;
  path?: string;
  url?: string;
  provider: "local" | "vercel_blob";
  byteSize: number;
  checksum: string;
};

const uploadRoot = path.resolve(process.cwd(), ".arete-dev", "uploads");
const blobAccess = (process.env.BLOB_ACCESS === "public" ? "public" : "private") as "public" | "private";

function safeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);
}

function decodeUpload(dataBase64: string) {
  const buffer = Buffer.from(dataBase64, "base64");
  return {
    buffer,
    checksum: createHash("sha256").update(buffer).digest("hex")
  };
}

export async function saveUpload(input: { schoolId: string; filename: string; contentType: string; dataBase64: string }): Promise<StoredUpload> {
  const { buffer, checksum } = decodeUpload(input.dataBase64);
  const key = `${input.schoolId}/${randomUUID()}-${safeFilename(input.filename)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, buffer, {
      access: blobAccess,
      contentType: input.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return {
      key: blob.pathname,
      url: blob.url,
      provider: "vercel_blob",
      byteSize: buffer.byteLength,
      checksum
    };
  }

  return saveLocalUpload({
    schoolId: input.schoolId,
    filename: input.filename,
    dataBase64: input.dataBase64
  });
}

function saveLocalUpload(input: { schoolId: string; filename: string; dataBase64: string }): StoredUpload {
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
    provider: "local",
    byteSize: buffer.byteLength,
    checksum: createHash("sha256").update(buffer).digest("hex")
  };
}

export async function openUpload(input: { schoolId: string; key: string }) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await get(input.key, {
      access: blobAccess,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return undefined;
    }
    return Readable.fromWeb(blob.stream as import("node:stream/web").ReadableStream);
  }

  if (input.key.startsWith("https://")) {
    const response = await fetch(input.key);
    if (!response.ok || !response.body) {
      return undefined;
    }
    return Readable.fromWeb(response.body as import("node:stream/web").ReadableStream);
  }

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
