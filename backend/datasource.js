import pg from "pg";
//deploy 12x


export const client = new pg.Client({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: 5432,
});

client.on('error', (err) => {
  console.error('🔥 [Postgres Client Error]', err);
});

await client.connect();