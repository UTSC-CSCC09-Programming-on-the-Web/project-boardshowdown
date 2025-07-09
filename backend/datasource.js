import pg from "pg";

export const client = new pg.Client({
  host: process.env.POSTGRES_HOST || "localhost",
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5432,
  database: process.env.POSTGRES_DB || "boardshowdown",
});

await client.connect();