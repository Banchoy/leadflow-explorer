import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let connectionString = process.env.DATABASE_URL!;
if (connectionString && !connectionString.startsWith('postgres') && connectionString.startsWith('//')) {
  connectionString = `postgresql:${connectionString}`;
}

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
