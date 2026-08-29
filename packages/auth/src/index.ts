import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import type { ActiveTenantContext, UserRole } from "@arete/types";

export type AccessTokenClaims = ActiveTenantContext & {
  roles: UserRole[];
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function signAccessToken(
  claims: AccessTokenClaims,
  secret: string,
  issuer = "arete-api"
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience("arete-clients")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(secret));
}

export async function verifyAccessToken(token: string, secret: string): Promise<AccessTokenClaims> {
  const verified = await jwtVerify(token, new TextEncoder().encode(secret), {
    audience: "arete-clients",
    issuer: "arete-api"
  });

  return verified.payload as AccessTokenClaims;
}
