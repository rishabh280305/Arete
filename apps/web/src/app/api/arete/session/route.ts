import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const apiBaseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json()) as { role?: string; schoolSlug?: string };
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!email) {
    return NextResponse.json({ message: "Your account needs an email address" }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl}/auth/clerk/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.INTERNAL_API_SECRET ? { "x-arete-internal-secret": process.env.INTERNAL_API_SECRET } : {})
    },
    body: JSON.stringify({
      email,
      displayName: user.fullName ?? user.username ?? email.split("@")[0],
      role: body.role ?? "student",
      schoolSlug: body.schoolSlug ?? "northview"
    })
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
