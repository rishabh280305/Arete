import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED === "true";
const enabledClerkMiddleware = clerkMiddleware();

export default clerkEnabled
  ? enabledClerkMiddleware
  : function disabledClerkProxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: ["/(api|trpc)(.*)", "/__clerk/:path*", "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|webp|ico|woff2?|ttf|map)).*)"]
};
