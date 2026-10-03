import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit and route-handler tests run in plain Node with no database: the Prisma
// client module is replaced by an in-memory fake (see tests/setup.ts).
export default defineConfig({
  resolve: {
    // Same alias as "paths" in tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
