import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/server/*.ts',
  out: './src/db/migrations/server',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/placeholder',
  },
  verbose: true,
  strict: true,
});
