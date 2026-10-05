// Prisma CLI configuration. Secrets come from .env.local (or the deployment
// environment), matching how Next.js loads environment variables.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Structural data only (categories). See prisma/seed.mjs.
    seed: "node --conditions=react-server --disable-warning=ExperimentalWarning prisma/seed.mjs",
  },
  datasource: {
    // Not using env() so `prisma generate` / `validate` work without a database configured.
    url: process.env.DATABASE_URL ?? "",
    // Optional: used by `prisma migrate dev` / `migrate diff --from-migrations` when the
    // database user cannot create temporary databases itself.
    ...(process.env.SHADOW_DATABASE_URL && { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }),
  },
});
