import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@arete/config": path.resolve(__dirname, "packages/config/src/index.ts"),
      "@arete/types": path.resolve(__dirname, "packages/types/src/index.ts"),
      "@arete/validation": path.resolve(__dirname, "packages/validation/src/index.ts"),
      "@arete/permissions": path.resolve(__dirname, "packages/permissions/src/index.ts"),
      "@arete/auth": path.resolve(__dirname, "packages/auth/src/index.ts"),
      "@arete/integrations": path.resolve(__dirname, "packages/integrations/src/index.ts"),
      "@arete/ai": path.resolve(__dirname, "packages/ai/src/index.ts"),
      "@arete/observability": path.resolve(__dirname, "packages/observability/src/index.ts"),
      "@arete/database": path.resolve(__dirname, "packages/database/src/index.ts")
    }
  }
});
