import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./styles.css";

export const metadata: Metadata = {
  title: "Arete",
  description: "Arete"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="en">
      <body>
        {publishableKey ? (
          <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
