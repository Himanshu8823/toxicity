import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// drizzle-kit runs outside Next, so it does not get .env.local for free.
config({ path: '.env.local' });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // `auth` belongs to Supabase; only ever touch our own tables.
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});
