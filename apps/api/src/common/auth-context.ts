import { verifyAccessToken } from "@arete/auth";
import type { ActiveTenantContext } from "@arete/types";

const devAccessSecret =
  process.env.JWT_ACCESS_SECRET ?? "development_access_secret_change_before_production";

export async function getAuthContext(request: unknown): Promise<ActiveTenantContext> {
  const headers = (request as { headers?: { authorization?: string | string[] } }).headers;
  const rawHeader = headers?.authorization;
  const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    throw new Error("Missing bearer token");
  }

  return verifyAccessToken(token, devAccessSecret);
}
