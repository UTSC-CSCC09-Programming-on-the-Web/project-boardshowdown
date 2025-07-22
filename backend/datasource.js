import pg from "pg";
//deploy 10x


export const client = new pg.Client({
  host: process.env.POSTGRES_HOST || "localhost",
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5432,
});

client.on('error', (err) => {
  console.error('🔥 [Postgres Client Error]', err);
});

await client.connect();