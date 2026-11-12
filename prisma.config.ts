import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // The CLI (migrate, db pull) needs a session connection. Supabase's transaction pooler
    // (port 6543) hangs migrations, so point DIRECT_URL at port 5432. The app itself keeps
    // using DATABASE_URL through the pg adapter in src/lib/prisma.ts.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
